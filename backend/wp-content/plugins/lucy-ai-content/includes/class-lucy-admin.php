<?php
/**
 * WordPress admin: menus, pages, form saving and AJAX endpoints.
 *
 * Menu "Lucy":
 *   Generate     – every allowed user (Website editor)
 *   History      – every allowed user (editors see their own rows)
 *   Settings     – Admin Developer (content settings)
 *   Super Admin  – Lucy Super Admins only (OpenAI key, models, access, limits)
 *
 * Every save checks a nonce (protection against forged requests) and the user's permission.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Admin {

	const PAGE_GENERATE = 'lucy';
	const PAGE_IMAGES   = 'lucy-images';
	const PAGE_SETUP    = 'lucy-setup';
	const PAGE_AUDIT    = 'lucy-audit';
	const PAGE_HISTORY  = 'lucy-history';
	const PAGE_TRAIN    = 'lucy-train';
	const PAGE_SETTINGS = 'lucy-settings';
	const PAGE_SUPER    = 'lucy-super-admin';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_bar_menu', array( __CLASS__, 'admin_bar' ), 80 );
		add_action( 'admin_notices', array( __CLASS__, 'setup_notice' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( LUCY_FILE ), array( __CLASS__, 'action_links' ) );

		// Normal form posts.
		add_action( 'admin_post_lucy_save_settings', array( __CLASS__, 'handle_save_settings' ) );
		add_action( 'admin_post_lucy_import_settings', array( __CLASS__, 'handle_import_settings' ) );
		add_action( 'admin_post_lucy_save_core', array( __CLASS__, 'handle_save_core' ) );
		add_action( 'admin_post_lucy_super_admins', array( __CLASS__, 'handle_super_admins' ) );
		add_action( 'admin_post_lucy_clear_history', array( __CLASS__, 'handle_clear_history' ) );
		add_action( 'admin_post_lucy_activate', array( __CLASS__, 'handle_activate' ) );
		add_action( 'admin_post_lucy_run_audit', array( __CLASS__, 'handle_run_audit' ) );
		add_action( 'admin_post_lucy_save_template', array( __CLASS__, 'handle_save_template' ) );
		add_action( 'admin_post_lucy_delete_template', array( __CLASS__, 'handle_delete_template' ) );
		add_action( 'wp_ajax_lucy_preview_template', array( __CLASS__, 'ajax_preview_template' ) );
		add_action( 'wp_ajax_lucy_learn_template', array( __CLASS__, 'ajax_learn_template' ) );

		// Lucy inside the block editor.
		add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'editor_assets' ) );

		// AJAX (used by the Generate screen and the connection test).
		add_action( 'wp_ajax_lucy_generate_text', array( __CLASS__, 'ajax_generate_text' ) );
		add_action( 'wp_ajax_lucy_generate_image', array( __CLASS__, 'ajax_generate_image' ) );
		add_action( 'wp_ajax_lucy_save_draft', array( __CLASS__, 'ajax_save_draft' ) );
		add_action( 'wp_ajax_lucy_discard_draft', array( __CLASS__, 'ajax_discard_draft' ) );
		add_action( 'wp_ajax_lucy_test_connection', array( __CLASS__, 'ajax_test_connection' ) );
	}

	/* ==================================================================
	 * MENUS AND ASSETS
	 * ================================================================== */

	public static function menu() {
		$gen  = Lucy_Access::can_generate();
		$conf = Lucy_Access::can_configure();
		if ( ! $gen && ! $conf ) {
			return;
		}
		$icon = 'data:image/svg+xml;base64,' . base64_encode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="black" d="M10 1l2.2 5.8L18 9l-5.8 2.2L10 17l-2.2-5.8L2 9l5.8-2.2z"/></svg>' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions

		// Before activation, configurers land on Setup; afterwards everyone lands on "Write with Lucy".
		$first    = ( $conf && ! Lucy_Context::is_active() ) ? self::PAGE_SETUP : ( $gen ? self::PAGE_GENERATE : self::PAGE_SETUP );
		$pages    = array();
		if ( $conf ) {
			$pages[ self::PAGE_SETUP ] = array( __( 'Lucy setup', 'lucy-ai-content' ), __( 'Setup', 'lucy-ai-content' ), 'page_setup' );
		}
		if ( $gen ) {
			$pages[ self::PAGE_GENERATE ] = array( __( 'Write with Lucy', 'lucy-ai-content' ), __( 'Write with Lucy', 'lucy-ai-content' ), 'page_generate' );
			$pages[ self::PAGE_IMAGES ]   = array( __( 'Image templates', 'lucy-ai-content' ), __( 'Image templates', 'lucy-ai-content' ), 'page_images' );
		}
		if ( $conf ) {
			$pages[ self::PAGE_TRAIN ] = array( __( 'Train Lucy', 'lucy-ai-content' ), __( 'Train Lucy', 'lucy-ai-content' ), 'page_train' );
			$pages[ self::PAGE_AUDIT ] = array( __( 'Website audit', 'lucy-ai-content' ), __( 'Website audit', 'lucy-ai-content' ), 'page_audit' );
		}
		if ( $gen ) {
			$pages[ self::PAGE_HISTORY ] = array( __( 'Lucy history', 'lucy-ai-content' ), __( 'History', 'lucy-ai-content' ), 'page_history' );
		}
		if ( $conf ) {
			$pages[ self::PAGE_SETTINGS ] = array( __( 'Growth profile', 'lucy-ai-content' ), __( 'Growth profile', 'lucy-ai-content' ), 'page_settings' );
		}
		if ( Lucy_Access::is_super_admin() ) {
			$pages[ self::PAGE_SUPER ] = array( __( 'Lucy Super Admin', 'lucy-ai-content' ), __( 'Super Admin', 'lucy-ai-content' ), 'page_super' );
		}

		add_menu_page( 'Lucy', 'Lucy', 'edit_posts', $first, array( __CLASS__, $pages[ $first ][2] ), $icon, 26 );
		// First submenu must repeat the top-level slug.
		add_submenu_page( $first, $pages[ $first ][0], $pages[ $first ][1], 'edit_posts', $first, array( __CLASS__, $pages[ $first ][2] ) );
		foreach ( $pages as $slug => $info ) {
			if ( $slug !== $first ) {
				add_submenu_page( $first, $info[0], $info[1], 'edit_posts', $slug, array( __CLASS__, $info[2] ) );
			}
		}
	}

	private static function current_page() {
		return isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	}

	private static function is_lucy_page() {
		return in_array( self::current_page(), array( self::PAGE_GENERATE, self::PAGE_HISTORY, self::PAGE_SETTINGS, self::PAGE_SUPER, self::PAGE_IMAGES, self::PAGE_SETUP, self::PAGE_AUDIT, self::PAGE_TRAIN ), true );
	}

	public static function assets() {
		if ( ! self::is_lucy_page() ) {
			return;
		}
		wp_enqueue_style( 'lucy-fonts', 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap', array(), null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters
		wp_enqueue_style( 'lucy-admin', LUCY_URL . 'assets/lucy-admin.css', array(), LUCY_VERSION );
		wp_enqueue_script( 'lucy-admin', LUCY_URL . 'assets/lucy-admin.js', array(), LUCY_VERSION, true );
		if ( self::PAGE_IMAGES === self::current_page() && function_exists( 'wp_enqueue_media' ) ) {
			wp_enqueue_media(); // The picture chooser on the image templates screen.
		}

		$data = array(
			'ajaxUrl'         => admin_url( 'admin-ajax.php' ),
			'nonce'           => wp_create_nonce( 'lucy_ajax' ),
			'page'            => self::current_page(),
			'instructionsMax' => Lucy_Settings::INSTRUCTIONS_MAX,
			'siteUrl'         => home_url( '/' ),
			'imageEnabled'    => (int) Lucy_Settings::get( 'image_enabled' ),
			'wordTarget'      => (int) Lucy_Settings::get( 'word_count' ),
			'faqTarget'       => (int) Lucy_Settings::get( 'faq_count' ),
			'blockedTerms'    => Lucy_Settings::blocked_terms_list(),
			'savedDraft'      => null,
			'i18n'            => array(
				'topicRequired'     => __( 'Please enter a topic or working title.', 'lucy-ai-content' ),
				'referenceRequired' => __( 'Paste the content you want Lucy to rewrite.', 'lucy-ai-content' ),
				'titleRequired'     => __( 'The draft needs a title before it can be saved.', 'lucy-ai-content' ),
				'networkError'      => __( 'The request did not finish. Your text is still here – please try again. If it keeps happening, the server may be stopping long requests (ask your host or lower the word count).', 'lucy-ai-content' ),
				'confirmDiscard'    => __( 'Discard this draft? The generated text and image will be removed.', 'lucy-ai-content' ),
				'copied'            => __( 'Copied', 'lucy-ai-content' ),
			),
		);
		if ( self::PAGE_GENERATE === self::current_page() && Lucy_Access::can_generate() ) {
			$saved = Lucy_Generator::get_saved_draft();
			if ( $saved && ! empty( $saved['draft'] ) ) {
				$data['savedDraft'] = array(
					'request' => $saved['request'],
					'draft'   => $saved['draft'],
					'image'   => isset( $saved['image'] ) ? $saved['image'] : null,
					'blocked' => Lucy_Generator::find_blocked_terms( $saved['draft'] ),
					'updated' => isset( $saved['updated'] ) ? human_time_diff( (int) $saved['updated'] ) : '',
				);
			}
		}
		wp_add_inline_script( 'lucy-admin', 'window.LucyData = ' . wp_json_encode( $data ) . ';', 'before' );
	}

	/** Loads the “Write with Lucy” button into the post editor. */
	public static function editor_assets() {
		if ( ! Lucy_Access::can_generate() ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && 'attachment' === $screen->post_type ) {
			return;
		}
		wp_enqueue_script( 'lucy-editor', LUCY_URL . 'assets/lucy-editor.js', array( 'wp-element', 'wp-components', 'wp-data', 'wp-api-fetch', 'wp-plugins', 'wp-editor', 'wp-blocks', 'wp-edit-post' ), LUCY_VERSION, true );
		wp_enqueue_style( 'lucy-editor', LUCY_URL . 'assets/lucy-editor.css', array(), LUCY_VERSION );

		$s         = Lucy_Settings::content();
		$keywords  = array_filter( array_map( 'trim', preg_split( '/[\r\n,]+/', (string) $s['primary_keywords'] ) ) );
		$templates = array();
		foreach ( Lucy_Images::all() as $id => $tpl ) {
			$templates[] = array(
				'id'    => $id,
				'name'  => $tpl['name'],
				'thumb' => $tpl['image_id'] ? wp_get_attachment_image_url( $tpl['image_id'], 'medium' ) : '',
			);
		}
		$config = array(
			'active'           => Lucy_Context::is_active(),
			'canConfigure'     => Lucy_Access::can_configure(),
			'setupUrl'         => admin_url( 'admin.php?page=' . self::PAGE_SETUP ),
			'writerUrl'        => admin_url( 'admin.php?page=' . self::PAGE_GENERATE ),
			'imagesUrl'        => admin_url( 'admin.php?page=' . self::PAGE_IMAGES ),
			'notActiveMessage' => (int) Lucy_Settings::get( 'enabled' ) ? __( 'Lucy is not activated for this website yet. An admin needs to finish Lucy → Setup.', 'lucy-ai-content' ) : __( 'Lucy is switched off for this website.', 'lucy-ai-content' ),
			'business'         => $s['business_name'],
			'keywordHint'      => $keywords ? 'e.g. ' . reset( $keywords ) : '',
			'defaultKeywords'  => $keywords ? reset( $keywords ) : '',
			'imageTemplates'   => $templates,
			'defaultTemplate'  => (string) $s['default_image_template'],
			'words'            => (int) $s['word_count'],
			'faqs'             => (int) $s['faq_count'],
			'brands'           => $s['brands'],
			'city'             => ( function ( $cities ) {
				$list = array_filter( array_map( 'trim', preg_split( '/[\r\n,]+/', (string) $cities ) ) );
				return $list ? reset( $list ) : '';
			} )( $s['cities'] ),
			'profileKeywords'  => implode( ', ', array_slice( $keywords, 0, 4 ) ),
			'settingsUrl'      => admin_url( 'admin.php?page=' . self::PAGE_SETTINGS ),
			'trainUrl'         => admin_url( 'admin.php?page=' . self::PAGE_TRAIN ),
			'demo'             => Lucy_Demo::enabled(),
		);
		wp_add_inline_script( 'lucy-editor', 'window.LucyEditor = ' . wp_json_encode( $config ) . ';', 'before' );
	}

	public static function admin_bar( $bar ) {
		if ( ! is_user_logged_in() || ! Lucy_Access::can_generate() ) {
			return;
		}
		$bar->add_node(
			array(
				'parent' => 'new-content',
				'id'     => 'lucy-new-post',
				'title'  => __( 'Blog post with Lucy', 'lucy-ai-content' ),
				'href'   => admin_url( 'admin.php?page=' . self::PAGE_GENERATE ),
			)
		);
	}

	public static function action_links( $links ) {
		$extra = array();
		if ( Lucy_Access::is_super_admin() ) {
			$extra[] = '<a href="' . esc_url( admin_url( 'admin.php?page=' . self::PAGE_SUPER ) ) . '">' . esc_html__( 'Super Admin', 'lucy-ai-content' ) . '</a>';
		}
		if ( Lucy_Access::can_configure() ) {
			$extra[] = '<a href="' . esc_url( admin_url( 'admin.php?page=' . self::PAGE_SETTINGS ) ) . '">' . esc_html__( 'Settings', 'lucy-ai-content' ) . '</a>';
		}
		return array_merge( $extra, $links );
	}

	/** Friendly reminder on the Dashboard / Plugins screen until an API key is added. */
	public static function setup_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->id, array( 'dashboard', 'plugins' ), true ) || ! Lucy_Access::is_super_admin() ) {
			return;
		}
		if ( 'none' !== Lucy_Settings::key_source() || Lucy_Demo::enabled() ) {
			return;
		}
		printf(
			'<div class="notice notice-info"><p><strong>%s</strong> %s <a href="%s">%s</a></p></div>',
			esc_html__( 'Lucy is almost ready.', 'lucy-ai-content' ),
			esc_html__( 'Add your OpenAI API key to start generating drafts.', 'lucy-ai-content' ),
			esc_url( admin_url( 'admin.php?page=' . self::PAGE_SUPER ) ),
			esc_html__( 'Open Lucy Super Admin →', 'lucy-ai-content' )
		);
	}

	/* ==================================================================
	 * PAGES
	 * ================================================================== */

	public static function page_generate() {
		if ( ! Lucy_Access::can_generate() ) {
			wp_die( esc_html__( 'You do not have permission to use Lucy. Ask a Lucy Super Admin to allow your role.', 'lucy-ai-content' ) );
		}
		self::render( 'generate' );
	}

	public static function page_images() {
		if ( ! Lucy_Access::can_generate() ) {
			wp_die( esc_html__( 'You do not have permission to use Lucy.', 'lucy-ai-content' ) );
		}
		self::render( 'images' );
	}

	public static function page_setup() {
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Only a Lucy Admin Developer or Super Admin can set up Lucy.', 'lucy-ai-content' ) );
		}
		self::render( 'setup' );
	}

	public static function page_audit() {
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Only a Lucy Admin Developer or Super Admin can run the website audit.', 'lucy-ai-content' ) );
		}
		self::render( 'audit' );
	}

	public static function page_history() {
		if ( ! Lucy_Access::can_generate() ) {
			wp_die( esc_html__( 'You do not have permission to use Lucy.', 'lucy-ai-content' ) );
		}
		self::render( 'history' );
	}

	public static function page_train() {
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Only a Lucy Admin Developer or Super Admin can train Lucy.', 'lucy-ai-content' ) );
		}
		self::render( 'train' );
	}

	public static function page_settings() {
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Only a Lucy Admin Developer or Super Admin can change these settings.', 'lucy-ai-content' ) );
		}
		self::render( 'settings' );
	}

	public static function page_super() {
		if ( ! Lucy_Access::is_super_admin() ) {
			wp_die( esc_html__( 'Only a Lucy Super Admin can open this page.', 'lucy-ai-content' ) );
		}
		self::render( 'super-admin' );
	}

	private static function render( $view ) {
		echo '<div class="wrap lucy-wrap">';
		include LUCY_DIR . 'views/header.php';
		self::notice_from_query();
		include LUCY_DIR . 'views/' . $view . '.php';
		echo '</div>';
	}

	/** Messages shown after a form save (?lucy_notice=…). */
	private static function notice_from_query() {
		$key      = isset( $_GET['lucy_notice'] ) ? sanitize_key( wp_unslash( $_GET['lucy_notice'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		$messages = array(
			'saved'           => array( 'success', __( 'Settings saved.', 'lucy-ai-content' ) ),
			'imported'        => array( 'success', __( 'Settings imported. Review each tab, then set the default category and author for this site.', 'lucy-ai-content' ) ),
			'import_failed'   => array( 'error', __( 'Import failed: that text is not a Lucy settings export.', 'lucy-ai-content' ) ),
			'admin_added'     => array( 'success', __( 'Super Admin added.', 'lucy-ai-content' ) ),
			'admin_removed'   => array( 'success', __( 'Super Admin removed.', 'lucy-ai-content' ) ),
			'admin_last'      => array( 'error', __( 'Lucy needs at least one Super Admin, so the last one cannot be removed.', 'lucy-ai-content' ) ),
			'user_not_found'  => array( 'error', __( 'No user found with that username or email.', 'lucy-ai-content' ) ),
			'user_not_admin'  => array( 'error', __( 'Super Admins must be WordPress administrators.', 'lucy-ai-content' ) ),
			'history_cleared' => array( 'success', __( 'History cleared.', 'lucy-ai-content' ) ),
			'activated'        => array( 'success', __( 'Lucy is activated. “Write with Lucy” now works in the post editor.', 'lucy-ai-content' ) ),
			'deactivated'      => array( 'success', __( 'Lucy is deactivated. Settings are kept.', 'lucy-ai-content' ) ),
			'setup_incomplete' => array( 'error', __( 'Finish the required setup steps first.', 'lucy-ai-content' ) ),
			'audit_done'       => array( 'success', __( 'Website audit finished.', 'lucy-ai-content' ) ),
			'template_saved'   => array( 'success', __( 'Image template saved.', 'lucy-ai-content' ) ),
			'template_deleted' => array( 'success', __( 'Image template deleted.', 'lucy-ai-content' ) ),
		);
		if ( isset( $messages[ $key ] ) ) {
			printf( '<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>', esc_attr( $messages[ $key ][0] ), esc_html( $messages[ $key ][1] ) );
		}
	}

	/* ------------------------------------------------------------------
	 * Small helpers used by the view files
	 * ------------------------------------------------------------------ */

	public static function url( $page, array $args = array() ) {
		return add_query_arg( array_merge( array( 'page' => $page ), $args ), admin_url( 'admin.php' ) );
	}

	public static function field( $type, $name, $label, $value, array $args = array() ) {
		$id    = 'lucy-' . str_replace( '_', '-', $name );
		$class = ! empty( $args['full'] ) ? 'lucy-field full' : 'lucy-field';
		$attrs = '';
		foreach ( array( 'placeholder', 'min', 'max', 'maxlength', 'step', 'autocomplete' ) as $attr ) {
			if ( isset( $args[ $attr ] ) ) {
				$attrs .= ' ' . $attr . '="' . esc_attr( $args[ $attr ] ) . '"';
			}
		}
		if ( ! empty( $args['required'] ) ) {
			$attrs .= ' required';
		}
		$input_name = isset( $args['raw_name'] ) ? $args['raw_name'] : 'lucy[' . $name . ']';

		echo '<div class="' . esc_attr( $class ) . '">';
		echo '<label for="' . esc_attr( $id ) . '">' . esc_html( $label );
		if ( ! empty( $args['counter'] ) ) {
			echo '<span class="lucy-counter" data-for="' . esc_attr( $id ) . '" data-max="' . esc_attr( $args['counter'] ) . '"></span>';
		}
		echo '</label>';

		if ( 'textarea' === $type ) {
			$rows = isset( $args['rows'] ) ? (int) $args['rows'] : 5;
			echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '" rows="' . esc_attr( $rows ) . '"' . $attrs . '>' . esc_textarea( $value ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput
		} elseif ( 'select' === $type ) {
			echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '"' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput
			foreach ( $args['options'] as $opt_value => $opt_label ) {
				echo '<option value="' . esc_attr( $opt_value ) . '"' . selected( (string) $value, (string) $opt_value, false ) . '>' . esc_html( $opt_label ) . '</option>';
			}
			echo '</select>';
		} else {
			echo '<input type="' . esc_attr( $type ) . '" id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '" value="' . esc_attr( $value ) . '"' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput
		}
		if ( ! empty( $args['hint'] ) ) {
			echo '<div class="lucy-hint">' . wp_kses( $args['hint'], array( 'code' => array(), 'strong' => array(), 'a' => array( 'href' => array(), 'target' => array() ) ) ) . '</div>';
		}
		echo '</div>';
	}

	/** Checkbox + hidden marker so "unticked" can be saved. */
	public static function checkbox( $name, $label, $checked, $hint = '' ) {
		echo '<div class="lucy-field full">';
		echo '<input type="hidden" name="lucy[_checkboxes][]" value="' . esc_attr( $name ) . '">';
		echo '<label class="lucy-check"><input type="checkbox" name="lucy[' . esc_attr( $name ) . ']" value="1"' . checked( (bool) $checked, true, false ) . '> <span>' . esc_html( $label ) . '</span></label>';
		if ( $hint ) {
			echo '<div class="lucy-hint">' . esc_html( $hint ) . '</div>';
		}
		echo '</div>';
	}

	public static function category_options( $empty_label ) {
		$options = array( 0 => $empty_label );
		foreach ( get_categories( array( 'hide_empty' => false ) ) as $cat ) {
			$options[ $cat->term_id ] = $cat->name;
		}
		return $options;
	}

	/**
	 * Plain-language security checks shown to Super Admins.
	 *
	 * @return array[] Each: array( 'ok'|'warn'|'info', label, hint ).
	 */
	public static function security_checks() {
		$checks = array();
		$source = Lucy_Settings::key_source();
		$core   = Lucy_Settings::core();

		$checks[] = is_ssl()
			? array( 'ok', __( 'Admin uses HTTPS', 'lucy-ai-content' ), __( 'Keys and logins are encrypted on the way to the server.', 'lucy-ai-content' ) )
			: array( 'warn', __( 'Admin is not using HTTPS', 'lucy-ai-content' ), __( 'Turn on SSL (https://) before entering an API key, so it cannot be read on the network.', 'lucy-ai-content' ) );

		if ( 'config' === $source ) {
			$checks[] = array( 'ok', __( 'API key is in wp-config.php', 'lucy-ai-content' ), __( 'The key is not stored in the database at all.', 'lucy-ai-content' ) );
		} elseif ( 'settings' === $source ) {
			$raw      = isset( $core['api_key'] ) ? (string) $core['api_key'] : '';
			$checks[] = ( 0 === strpos( $raw, 'enc:' ) )
				? array( 'ok', __( 'API key is encrypted in the database', 'lucy-ai-content' ), __( 'Encrypted with AES-256. For extra safety, move it to wp-config.php (see tip below).', 'lucy-ai-content' ) )
				: array( 'warn', __( 'API key is stored without encryption', 'lucy-ai-content' ), __( 'This server has no OpenSSL. Put the key in wp-config.php instead.', 'lucy-ai-content' ) );
		} else {
			$checks[] = array( 'info', __( 'No API key saved', 'lucy-ai-content' ), Lucy_Demo::enabled() ? __( 'Fine while demo mode is on.', 'lucy-ai-content' ) : __( 'Add one to start generating.', 'lucy-ai-content' ) );
		}

		$checks[] = array( 'ok', __( 'Key never leaves the server', 'lucy-ai-content' ), __( 'It is not shown in full, not sent to browsers, not included in exports and not visible to editors.', 'lucy-ai-content' ) );

		$checks[] = ( defined( 'LUCY_ENCRYPTION_KEY' ) && LUCY_ENCRYPTION_KEY )
			? array( 'ok', __( 'Custom encryption key set', 'lucy-ai-content' ), __( 'LUCY_ENCRYPTION_KEY is defined in wp-config.php.', 'lucy-ai-content' ) )
			: array( 'info', __( 'Encryption uses the site’s AUTH salt', 'lucy-ai-content' ), __( 'Optional: define LUCY_ENCRYPTION_KEY in wp-config.php so changing salts does not break the saved key.', 'lucy-ai-content' ) );

		$checks[] = ( defined( 'WP_DEBUG' ) && WP_DEBUG && ( ! defined( 'WP_DEBUG_DISPLAY' ) || WP_DEBUG_DISPLAY ) )
			? array( 'warn', __( 'Errors are shown on screen', 'lucy-ai-content' ), __( 'Set WP_DEBUG_DISPLAY to false on live sites so technical details are never shown to visitors.', 'lucy-ai-content' ) )
			: array( 'ok', __( 'Errors are hidden from visitors', 'lucy-ai-content' ), '' );

		$checks[] = ( (int) $core['monthly_article_cap'] > 0 || (int) $core['monthly_image_cap'] > 0 )
			? array( 'ok', __( 'Monthly limits are set', 'lucy-ai-content' ), __( 'Spending is capped even if an account is misused.', 'lucy-ai-content' ) )
			: array( 'warn', __( 'No monthly limits', 'lucy-ai-content' ), __( 'Set article and image limits under Access & limits, and a budget in your OpenAI project.', 'lucy-ai-content' ) );

		/* translators: %d: number of Super Admins */
		$checks[] = array( 'info', sprintf( _n( '%d Super Admin', '%d Super Admins', count( Lucy_Access::super_admin_ids() ), 'lucy-ai-content' ), count( Lucy_Access::super_admin_ids() ) ), __( 'Only these people can see or change the key. Keep the list short.', 'lucy-ai-content' ) );

		if ( Lucy_Demo::enabled() ) {
			$checks[] = array( 'info', __( 'Demo mode is on', 'lucy-ai-content' ), __( 'Nothing is sent to OpenAI.', 'lucy-ai-content' ) );
		}
		return $checks;
	}

	/* ==================================================================
	 * FORM HANDLERS (admin-post.php)
	 * ================================================================== */

	private static function back( $page, $notice, array $args = array() ) {
		wp_safe_redirect( self::url( $page, array_merge( $args, array( 'lucy_notice' => $notice ) ) ) );
		exit;
	}

	private static function posted_tab() {
		return isset( $_POST['lucy_tab'] ) ? sanitize_key( wp_unslash( $_POST['lucy_tab'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	}

	public static function handle_save_settings() {
		check_admin_referer( 'lucy_save_settings' );
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		$input = isset( $_POST['lucy'] ) && is_array( $_POST['lucy'] ) ? $_POST['lucy'] : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitized in Lucy_Settings::sanitize_content().
		Lucy_Settings::save_content( $input );
		$next = isset( $_POST['lucy_next'] ) ? sanitize_key( wp_unslash( $_POST['lucy_next'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		if ( 'setup' === $next ) {
			self::back( self::PAGE_SETUP, 'saved' );
		}
		if ( 'train' === self::posted_tab() ) {
			self::back( self::PAGE_TRAIN, 'saved' );
		}
		self::back( self::PAGE_SETTINGS, 'saved', array( 'tab' => $next ? $next : self::posted_tab() ) );
	}

	public static function handle_import_settings() {
		check_admin_referer( 'lucy_import_settings' );
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		$json   = isset( $_POST['lucy_import'] ) ? wp_unslash( $_POST['lucy_import'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- JSON is decoded and every value sanitized on import.
		$result = Lucy_Settings::import_json( $json );
		self::back( self::PAGE_SETTINGS, is_wp_error( $result ) ? 'import_failed' : 'imported', array( 'tab' => 'transfer' ) );
	}

	public static function handle_save_core() {
		check_admin_referer( 'lucy_save_core' );
		if ( ! Lucy_Access::is_super_admin() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		$input = isset( $_POST['lucy'] ) && is_array( $_POST['lucy'] ) ? $_POST['lucy'] : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitized in Lucy_Settings::save_core().
		Lucy_Settings::save_core( $input );
		self::back( self::PAGE_SUPER, 'saved', array( 'tab' => self::posted_tab() ) );
	}

	public static function handle_super_admins() {
		check_admin_referer( 'lucy_super_admins' );
		if ( ! Lucy_Access::is_super_admin() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		$args = array( 'tab' => 'access' );
		if ( ! empty( $_POST['remove_user'] ) ) {
			$ok = Lucy_Access::remove_super_admin( absint( $_POST['remove_user'] ) );
			self::back( self::PAGE_SUPER, $ok ? 'admin_removed' : 'admin_last', $args );
		}
		$who  = isset( $_POST['new_admin'] ) ? sanitize_text_field( wp_unslash( $_POST['new_admin'] ) ) : '';
		$user = is_email( $who ) ? get_user_by( 'email', $who ) : get_user_by( 'login', $who );
		if ( ! $user ) {
			self::back( self::PAGE_SUPER, 'user_not_found', $args );
		}
		if ( ! user_can( $user, 'manage_options' ) ) {
			self::back( self::PAGE_SUPER, 'user_not_admin', $args );
		}
		Lucy_Access::add_super_admin( $user->ID );
		self::back( self::PAGE_SUPER, 'admin_added', $args );
	}

	public static function handle_activate() {
		check_admin_referer( 'lucy_activate' );
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		if ( ! empty( $_POST['deactivate'] ) ) {
			Lucy_Context::deactivate();
			self::back( self::PAGE_SETUP, 'deactivated' );
		}
		$result = Lucy_Context::activate();
		self::back( self::PAGE_SETUP, is_wp_error( $result ) ? 'setup_incomplete' : 'activated' );
	}

	public static function handle_save_template() {
		check_admin_referer( 'lucy_save_template' );
		if ( ! Lucy_Access::can_generate() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		// phpcs:ignore WordPress.Security.NonceVerification -- checked above.
		$id  = isset( $_POST['template_id'] ) ? sanitize_key( wp_unslash( $_POST['template_id'] ) ) : '';
		$raw = isset( $_POST['tpl'] ) && is_array( $_POST['tpl'] ) ? wp_unslash( $_POST['tpl'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$id  = Lucy_Images::save( $id, $raw );
		self::back( self::PAGE_IMAGES, 'template_saved', array( 'template' => $id ) );
	}

	public static function handle_delete_template() {
		check_admin_referer( 'lucy_save_template' );
		if ( ! Lucy_Access::can_generate() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		// phpcs:ignore WordPress.Security.NonceVerification -- checked above.
		Lucy_Images::delete( isset( $_POST['template_id'] ) ? sanitize_key( wp_unslash( $_POST['template_id'] ) ) : '' );
		self::back( self::PAGE_IMAGES, 'template_deleted' );
	}

	/** Live preview of one template with a sample title. */
	public static function ajax_preview_template() {
		self::guard_generate();
		// phpcs:disable WordPress.Security.NonceVerification -- checked in guard_generate().
		$raw   = isset( $_POST['tpl'] ) && is_array( $_POST['tpl'] ) ? wp_unslash( $_POST['tpl'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$title = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
		// phpcs:enable
		$tpl = array_merge( Lucy_Images::defaults(), array() );
		foreach ( $raw as $key => $value ) {
			$tpl[ $key ] = is_scalar( $value ) ? $value : '';
		}
		$tpl     = array_merge( $tpl, array( 'image_id' => isset( $raw['image_id'] ) ? absint( $raw['image_id'] ) : 0 ) );
		foreach ( array( 'uppercase', 'shadow', 'cover', 'show_logo', 'use_brand', 'band', 'thumbnail' ) as $lucy_flag ) {
			$tpl[ $lucy_flag ] = ! empty( $raw[ $lucy_flag ] ) && '0' !== (string) $raw[ $lucy_flag ] ? 1 : 0;
		}
		$tpl['thumbnail'] = 0; // The preview only draws the wide picture.
		$preview = Lucy_Images::preview( $tpl, $title ? $title : __( 'Your blog title goes here', 'lucy-ai-content' ) );
		if ( is_wp_error( $preview ) ) {
			wp_send_json_error( array( 'message' => $preview->get_error_message() ), 400 );
		}
		wp_send_json_success( array( 'preview' => $preview ) );
	}

	/** Reads a reference picture that already has a title on it and fills in the template settings. */
	public static function ajax_learn_template() {
		self::guard_generate();
		// phpcs:ignore WordPress.Security.NonceVerification -- checked in guard_generate().
		$image_id = isset( $_POST['image_id'] ) ? absint( $_POST['image_id'] ) : 0;
		$learned  = Lucy_Images::analyse( $image_id );
		if ( is_wp_error( $learned ) ) {
			wp_send_json_error( array( 'message' => $learned->get_error_message() ), 400 );
		}
		wp_send_json_success( array( 'settings' => $learned ) );
	}

	public static function handle_run_audit() {
		check_admin_referer( 'lucy_run_audit' );
		if ( ! Lucy_Access::can_configure() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		Lucy_Audit::run();
		self::back( self::PAGE_AUDIT, 'audit_done' );
	}

	public static function handle_clear_history() {
		check_admin_referer( 'lucy_clear_history' );
		if ( ! Lucy_Access::is_super_admin() ) {
			wp_die( esc_html__( 'Not allowed.', 'lucy-ai-content' ), 403 );
		}
		Lucy_Usage::clear_history();
		self::back( self::PAGE_HISTORY, 'history_cleared' );
	}

	/* ==================================================================
	 * AJAX
	 * ================================================================== */

	/** Common checks for every Generate request. Ends the request with an error if something is wrong. */
	private static function guard_generate() {
		if ( ! check_ajax_referer( 'lucy_ajax', 'nonce', false ) ) {
			wp_send_json_error( array( 'message' => __( 'Your session expired. Reload the page and try again (your text is kept).', 'lucy-ai-content' ) ), 403 );
		}
		if ( ! Lucy_Access::can_generate() ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to use Lucy.', 'lucy-ai-content' ) ), 403 );
		}
		if ( ! (int) Lucy_Settings::get( 'enabled' ) ) {
			wp_send_json_error( array( 'message' => __( 'Lucy is switched off for this site. A Lucy Super Admin can switch it back on.', 'lucy-ai-content' ) ), 403 );
		}
		if ( 'none' === Lucy_Settings::key_source() && ! Lucy_Demo::enabled() ) {
			wp_send_json_error( array( 'message' => __( 'No OpenAI API key is set yet. A Lucy Super Admin must add one under Lucy → Super Admin.', 'lucy-ai-content' ) ), 400 );
		}
	}

	/** Allow long OpenAI calls where the host permits it. */
	private static function allow_long_request() {
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( (int) Lucy_Settings::get( 'timeout' ) + 90 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}
		if ( function_exists( 'ignore_user_abort' ) ) {
			ignore_user_abort( true );
		}
	}

	public static function ajax_generate_text() {
		self::guard_generate();
		self::allow_long_request();

		$req   = Lucy_Generator::clean_request( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification -- checked in guard_generate().
		$valid = Lucy_Generator::validate_request( $req );
		if ( is_wp_error( $valid ) ) {
			wp_send_json_error( array( 'message' => $valid->get_error_message() ), 400 );
		}
		$limit = Lucy_Usage::check_limit( 'article' );
		if ( is_wp_error( $limit ) ) {
			wp_send_json_error( array( 'message' => $limit->get_error_message() ), 429 );
		}

		$reference_note = '';
		if ( ! empty( $req['reference_url'] ) ) {
			$read = Lucy_Reference::fetch( $req['reference_url'] );
			if ( is_wp_error( $read ) ) {
				wp_send_json_error( array( 'message' => $read->get_error_message() ), 400 );
			}
			$req['reference'] = trim( Lucy_Reference::as_prompt( $read ) . "\n\n" . $req['reference'] );
			/* translators: %s: page title of the reference link */
			$reference_note = $read['title'] ? sprintf( __( 'Lucy read your reference page: “%s”.', 'lucy-ai-content' ), $read['title'] ) : __( 'Lucy read your reference page.', 'lucy-ai-content' );
		}

		$draft = Lucy_Generator::generate_text( $req );
		if ( is_wp_error( $draft ) ) {
			Lucy_Usage::log(
				array(
					'topic'  => $req['topic'],
					'mode'   => $req['mode'],
					'model'  => Lucy_Settings::get( 'text_model' ),
					'status' => 'failed',
					'error'  => $draft->get_error_message(),
				)
			);
			wp_send_json_error( array( 'message' => $draft->get_error_message() ), 502 );
		}

		Lucy_Usage::add(
			array(
				'articles'      => 1,
				'input_tokens'  => $draft['usage']['input_tokens'],
				'output_tokens' => $draft['usage']['output_tokens'],
			)
		);
		$history_id = Lucy_Usage::log(
			array(
				'topic'         => $draft['title'] ? $draft['title'] : $req['topic'],
				'mode'          => $req['mode'],
				'model'         => $draft['model'],
				'input_tokens'  => $draft['usage']['input_tokens'],
				'output_tokens' => $draft['usage']['output_tokens'],
				'status'        => 'generated',
			)
		);

		// A new article replaces the previous unsaved one (and its unused image).
		$previous = Lucy_Generator::get_saved_draft();
		if ( $previous && ! empty( $previous['image']['id'] ) ) {
			Lucy_Generator::delete_unused_image( $previous['image']['id'] );
		}
		Lucy_Generator::store_draft(
			array(
				'request'    => $req,
				'draft'      => $draft,
				'image'      => null,
				'history_id' => $history_id,
			)
		);

		wp_send_json_success(
			array(
				'draft'         => $draft,
				'blocked'       => Lucy_Generator::find_blocked_terms( $draft ),
				'wantImage'     => ( $req['image_template'] || ( $req['with_image'] && (int) Lucy_Settings::get( 'image_enabled' ) ) ) ? 1 : 0,
				'imageTemplate' => $req['image_template'],
				'referenceNote' => $reference_note,
			)
		);
	}

	public static function ajax_generate_image() {
		self::guard_generate();
		self::allow_long_request();

		// phpcs:ignore WordPress.Security.NonceVerification -- checked in guard_generate().
		$wants_template = ! empty( $_POST['image_template'] );
		if ( ! $wants_template && ! (int) Lucy_Settings::get( 'image_enabled' ) ) {
			wp_send_json_error( array( 'message' => __( 'AI featured images are switched off in Lucy settings. Choose an image template instead.', 'lucy-ai-content' ) ), 400 );
		}
		$state = Lucy_Generator::get_saved_draft();
		if ( ! $state || empty( $state['draft'] ) ) {
			wp_send_json_error( array( 'message' => __( 'No draft found. Generate an article first.', 'lucy-ai-content' ) ), 400 );
		}
		$limit = $wants_template ? true : Lucy_Usage::check_limit( 'image' );
		if ( is_wp_error( $limit ) ) {
			wp_send_json_error( array( 'message' => $limit->get_error_message() ), 429 );
		}

		// The editor may have changed the title or alt text before asking for a new image.
		// phpcs:disable WordPress.Security.NonceVerification -- checked in guard_generate().
		foreach ( array( 'title', 'slug', 'image_alt_text' ) as $key ) {
			if ( isset( $_POST[ $key ] ) && '' !== trim( wp_unslash( $_POST[ $key ] ) ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
				$state['draft'][ $key ] = 'slug' === $key ? sanitize_title( wp_unslash( $_POST[ $key ] ) ) : sanitize_text_field( wp_unslash( $_POST[ $key ] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			}
		}
		if ( isset( $_POST['image_prompt'] ) && '' !== trim( wp_unslash( $_POST['image_prompt'] ) ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			$state['draft']['image_prompt'] = sanitize_textarea_field( wp_unslash( $_POST['image_prompt'] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		}
		// phpcs:enable

		// phpcs:ignore WordPress.Security.NonceVerification -- checked in guard_generate().
		$template = isset( $_POST['image_template'] ) ? sanitize_key( wp_unslash( $_POST['image_template'] ) ) : '';
		if ( $template ) {
			$image = Lucy_Images::create( $template, $state['draft']['title'], 0, isset( $state['request']['keywords'] ) ? $state['request']['keywords'] : '' );
		} else {
			$image = Lucy_Generator::create_image( $state['draft'] );
		}
		if ( is_wp_error( $image ) ) {
			wp_send_json_error( array( 'message' => $image->get_error_message() ), 502 );
		}

		if ( ! empty( $state['image']['id'] ) ) {
			Lucy_Generator::delete_unused_image( $state['image']['id'] );
		}
		$state['image'] = $image;
		Lucy_Generator::store_draft( $state );
		Lucy_Usage::add( array( 'images' => 1 ) );
		if ( ! empty( $state['history_id'] ) ) {
			Lucy_Usage::update( $state['history_id'], array( 'image' => 1 ) );
		}

		wp_send_json_success(
			array(
				'image'        => $image,
				'image_prompt' => $state['draft']['image_prompt'],
			)
		);
	}

	public static function ajax_save_draft() {
		self::guard_generate();
		// phpcs:disable WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput -- nonce checked in guard_generate(); every value is sanitized in normalize_draft().
		$state = Lucy_Generator::get_saved_draft();
		$old   = ( $state && ! empty( $state['draft'] ) ) ? $state['draft'] : array();

		$faqs = array();
		if ( isset( $_POST['faqs'] ) ) {
			$decoded = json_decode( wp_unslash( $_POST['faqs'] ), true );
			$faqs    = is_array( $decoded ) ? $decoded : array();
		}
		$tags = isset( $_POST['tags'] ) ? array_map( 'trim', explode( ',', wp_unslash( $_POST['tags'] ) ) ) : array();

		$edited = array(
			'title'            => isset( $_POST['title'] ) ? wp_unslash( $_POST['title'] ) : '',
			'slug'             => isset( $_POST['slug'] ) ? wp_unslash( $_POST['slug'] ) : '',
			'meta_title'       => isset( $_POST['meta_title'] ) ? wp_unslash( $_POST['meta_title'] ) : '',
			'meta_description' => isset( $_POST['meta_description'] ) ? wp_unslash( $_POST['meta_description'] ) : '',
			'focus_keyword'    => isset( $_POST['focus_keyword'] ) ? wp_unslash( $_POST['focus_keyword'] ) : '',
			'excerpt'          => isset( $_POST['excerpt'] ) ? wp_unslash( $_POST['excerpt'] ) : '',
			'article_html'     => isset( $_POST['article_html'] ) ? wp_unslash( $_POST['article_html'] ) : '',
			'image_alt_text'   => isset( $_POST['image_alt_text'] ) ? wp_unslash( $_POST['image_alt_text'] ) : '',
			'image_prompt'     => isset( $old['image_prompt'] ) ? $old['image_prompt'] : '',
			'review_notes'     => isset( $old['review_notes'] ) ? $old['review_notes'] : array(),
			'faqs'             => $faqs,
			'tags'             => $tags,
		);
		$force    = ! empty( $_POST['force'] );
		$category = isset( $_POST['category'] ) ? absint( $_POST['category'] ) : 0;
		// phpcs:enable

		$draft          = Lucy_Generator::normalize_draft( $edited );
		$draft['model'] = isset( $old['model'] ) ? $old['model'] : '';

		if ( '' === $draft['title'] ) {
			wp_send_json_error( array( 'message' => __( 'The draft needs a title before it can be saved.', 'lucy-ai-content' ) ), 400 );
		}
		if ( '' === $draft['article_html'] ) {
			wp_send_json_error( array( 'message' => __( 'The article is empty.', 'lucy-ai-content' ) ), 400 );
		}

		$blocked = Lucy_Generator::find_blocked_terms( $draft );
		if ( $blocked && ! $force ) {
			wp_send_json_error(
				array(
					'message'      => __( 'This draft still contains blocked words or phrases. Edit them out, or save anyway if you are sure.', 'lucy-ai-content' ),
					'blocked'      => $blocked,
					'needsConfirm' => 1,
				),
				409
			);
		}

		$post_id = Lucy_Generator::save_post(
			$draft,
			array(
				'category' => $category,
				'image_id' => ( $state && ! empty( $state['image']['id'] ) ) ? (int) $state['image']['id'] : 0,
			)
		);
		if ( is_wp_error( $post_id ) ) {
			wp_send_json_error( array( 'message' => $post_id->get_error_message() ), 500 );
		}

		Lucy_Usage::add( array( 'saved' => 1 ) );
		if ( $state && ! empty( $state['history_id'] ) ) {
			Lucy_Usage::update(
				$state['history_id'],
				array(
					'status'  => 'saved',
					'post_id' => $post_id,
					'topic'   => $draft['title'],
				)
			);
		}
		Lucy_Generator::clear_draft();

		wp_send_json_success(
			array(
				'post_id'     => $post_id,
				'edit_url'    => get_edit_post_link( $post_id, 'raw' ),
				'preview_url' => get_preview_post_link( $post_id ),
				'seo'         => Lucy_Settings::seo_plugin_label( Lucy_Settings::active_seo_plugin() ),
			)
		);
	}

	public static function ajax_discard_draft() {
		if ( ! check_ajax_referer( 'lucy_ajax', 'nonce', false ) || ! Lucy_Access::can_generate() ) {
			wp_send_json_error( array( 'message' => __( 'Not allowed.', 'lucy-ai-content' ) ), 403 );
		}
		$state = Lucy_Generator::get_saved_draft();
		if ( $state && ! empty( $state['image']['id'] ) ) {
			Lucy_Generator::delete_unused_image( $state['image']['id'] );
		}
		if ( $state && ! empty( $state['history_id'] ) ) {
			Lucy_Usage::update( $state['history_id'], array( 'status' => 'discarded' ) );
		}
		Lucy_Generator::clear_draft();
		wp_send_json_success();
	}

	public static function ajax_test_connection() {
		if ( ! check_ajax_referer( 'lucy_ajax', 'nonce', false ) || ! Lucy_Access::is_super_admin() ) {
			wp_send_json_error( array( 'message' => __( 'Not allowed.', 'lucy-ai-content' ) ), 403 );
		}
		if ( Lucy_Demo::enabled() ) {
			wp_send_json_success(
				array(
					'message' => __( 'Demo mode is on, so Lucy did not contact OpenAI. Switch demo mode off (Access & limits) to test a real key.', 'lucy-ai-content' ),
					'missing' => array(),
					'models'  => Lucy_Demo::models(),
				)
			);
		}
		// Test a key typed into the form (before saving), or the saved key.
		$typed  = isset( $_POST['api_key'] ) ? trim( sanitize_text_field( wp_unslash( $_POST['api_key'] ) ) ) : '';
		$client = new Lucy_OpenAI( $typed ? $typed : null, 30 );
		$models = $client->list_models();
		if ( is_wp_error( $models ) ) {
			wp_send_json_error( array( 'message' => $models->get_error_message() ), 400 );
		}
		Lucy_Settings::save_models_cache( $models );

		$core    = Lucy_Settings::core();
		$missing = array();
		foreach ( array( $core['text_model'], $core['image_model'] ) as $model ) {
			if ( $models && ! in_array( $model, $models, true ) ) {
				$missing[] = $model;
			}
		}
		wp_send_json_success(
			array(
				/* translators: %d: number of models */
				'message' => sprintf( __( 'Connected to OpenAI. %d models are available to this key.', 'lucy-ai-content' ), count( $models ) ),
				'missing' => $missing,
				'models'  => $models,
			)
		);
	}
}
