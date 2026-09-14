<?php
/**
 * Lucy settings.
 *
 * Lucy keeps two groups of settings in the WordPress options table:
 *
 *  1. "lucy_settings" – CONTENT settings, edited by the Admin Developer
 *     (business profile, writing rules, output, featured image, SEO & publishing).
 *     These can be exported and imported between websites.
 *
 *  2. "lucy_core" – PLATFORM settings, edited only by a Lucy Super Admin
 *     (OpenAI key, models, on/off switch, who can use Lucy, monthly limits).
 *     These are never exported, because they contain the API key.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Settings {

	const CONTENT_OPTION = 'lucy_settings';
	const CORE_OPTION    = 'lucy_core';

	/** Maximum length of the agent instruction brief (characters, spaces included). */
	const INSTRUCTIONS_MAX = 2000;
	const ROLE_MAX         = 4000;
	const RULES_MAX        = 3000;
	const EXAMPLE_MAX      = 12000;

	/** Suggested OpenAI models. The Super Admin can load the live list from their OpenAI account. */
	public static function suggested_text_models() {
		return array(
			'gpt-5.6-luna'  => 'GPT-5.6 Luna – cost-efficient (recommended to start)',
			'gpt-5.6-terra' => 'GPT-5.6 Terra – balanced quality and cost',
			'gpt-5.6-sol'   => 'GPT-5.6 Sol – flagship quality',
			'gpt-6-astra'   => 'GPT-6 Astra – most capable, highest cost',
		);
	}

	public static function suggested_image_models() {
		return array(
			'gpt-image-2.5-flare'    => 'GPT Image 2.5 Flare – fast, everyday images (recommended)',
			'gpt-image-2.5-sunburst' => 'GPT Image 2.5 Sunburst – highest quality',
		);
	}

	/** Pick the spelling variant from the WordPress locale so a new site does not default to US English by accident. */
	public static function default_language() {
		$locale = function_exists( 'get_locale' ) ? get_locale() : 'en_US';
		$map    = array(
			'en_GB' => 'en-GB',
			'en_AU' => 'en-AU',
			'en_NZ' => 'en-GB',
			'en_ZA' => 'en-GB',
			'en_IE' => 'en-GB',
			'en_IN' => 'en-IN',
			'en_CA' => 'en-US',
		);
		return isset( $map[ $locale ] ) ? $map[ $locale ] : 'en-US';
	}

	public static function languages() {
		return array(
			'en-US' => 'English (US)',
			'en-GB' => 'English (UK)',
			'en-AU' => 'English (Australia)',
			'en-IN' => 'English (India)',
		);
	}

	/** Search intents a website can target. */
	public static function search_intents() {
		return array(
			'local'      => 'Local “near me” searches',
			'buying'     => 'Buying guides & advice',
			'comparison' => 'Comparisons & alternatives',
			'reviews'    => 'Reviews',
			'financing'  => 'Financing & payments',
			'value'      => 'Price, value & deals',
			'service'    => 'Service & maintenance',
			'howto'      => 'How-to & explainers',
			'news'       => 'News & updates',
		);
	}

	/** What a dealership wants to sell / promote. */
	public static function departments() {
		return array(
			'new'        => 'New vehicles',
			'used'       => 'Used vehicles',
			'certified'  => 'Certified pre-owned',
			'finance'    => 'Finance',
			'trade'      => 'Trade-ins / we buy cars',
			'service'    => 'Service & repairs',
			'parts'      => 'Parts & accessories',
			'commercial' => 'Commercial & fleet',
			'specials'   => 'Specials & offers',
		);
	}

	public static function research_modes() {
		return array(
			'settings_only' => 'Only facts from these settings and the page (safest)',
			'general'       => 'Also general knowledge – Lucy flags every claim to verify',
		);
	}

	public static function tones() {
		return array( 'Warm & helpful', 'Professional', 'Conversational', 'Friendly & persuasive', 'Technical', 'Authoritative' );
	}

	public static function creativity_levels() {
		// Label => temperature. Some newer models ignore temperature; Lucy removes it automatically if OpenAI refuses it.
		return array(
			'precise'  => array( 'label' => 'Precise', 'temperature' => 0.3 ),
			'balanced' => array( 'label' => 'Balanced', 'temperature' => 0.7 ),
			'creative' => array( 'label' => 'Creative', 'temperature' => 1.0 ),
		);
	}

	/* ------------------------------------------------------------------
	 * Defaults
	 * ------------------------------------------------------------------ */

	public static function content_defaults() {
		return array(
			// Business profile.
			'business_name'     => get_bloginfo( 'name' ),
			'website_url'       => home_url( '/' ),
			'industry'          => '',
			'objective'         => 'Educate readers and grow organic search traffic',
			'instructions'      => '',
			// Train Lucy.
			'role_instruction'  => "You are an experienced content writer for this business.\nWrite the way a knowledgeable salesperson would explain something to a customer: clear, specific and useful.\nEvery article must be correct, easy to read and worth publishing without a rewrite.",
			'house_rules'       => '',
			'avoid_rules'       => '',
			'example_article'   => '',
			'services'          => '',
			'locations'         => '',
			'cta_text'          => '',
			// Website context v2 (permanent business context used by every Lucy button).
			'phone'              => '',
			'address'            => '',
			'brands'             => '',
			'priority_services'  => '',
			'departments'        => array( 'used', 'finance' ),
			'primary_keywords'   => '',
			'secondary_keywords' => '',
			'search_intents'     => array( 'local', 'buying' ),
			'target_searches'    => '',
			'cities'             => '',
			'zip_codes'          => '',
			'writing_style'      => '',
			'competitors'        => '',
			'trusted_sources'    => '',
			'research_mode'      => 'settings_only',
			'seo_goals'          => '',
			'local_seo_goals'    => '',
			'ai_search_goals'    => 'Answer questions directly in the first sentence of each section so AI search tools can quote us. Name the business, city and products clearly.',
			'facts'              => '',
			'offers'             => '',
			'differentiators'    => '',
			'default_image_template' => '',
			'brand_logo_id'      => 0,
			'brand_primary'      => '#1f2b6c',
			'brand_secondary'    => '#3f7fd8',
			'brand_text'         => '#ffffff',
			'activated'          => 0,
			'activated_at'       => 0,
			'cta_url'           => '',
			// Writing rules.
			'language'          => self::default_language(),
			'country'           => '',
			'tone'              => 'Warm & helpful',
			'audience'          => '',
			'blocked_terms'     => '',
			'required_guidance' => "Use clear, simple language.\nNever invent statistics, prices, quotes, reviews or sources.\nAvoid unsupported claims.",
			'disclaimer'        => '',
			// Output.
			'word_count'        => 1200,
			'faq_count'         => 5,
			'creativity'        => 'balanced',
			'structure'         => "Engaging introduction that answers the reader's question quickly.\nClear H2 sections with H3 sub-points where useful.\nPractical tips, examples or checklists.\nShort conclusion with a next step.",
			'include_cta'       => 1,
			// Featured image.
			'image_enabled'     => 1,
			'image_style'       => 'Clean, modern editorial photograph with natural light and a clear main subject. Realistic and professional.',
			'image_quality'     => 'medium',
			// SEO & publishing.
			'seo_plugin'        => 'auto',
			'faq_schema'        => 1,
			'default_category'  => 0,
			'default_author'    => 0,
			'add_tags'          => 1,
		);
	}

	public static function core_defaults() {
		return array(
			'api_key'              => '', // Stored encrypted. Use Lucy_Settings::get_api_key() to read it.
			'text_model'           => 'gpt-5.6-luna',
			'image_model'          => 'gpt-image-2.5-flare',
			'reasoning_effort'     => 'low',
			'timeout'              => 180,
			'enabled'              => 1,
			'demo_mode'            => 0,
			'allowed_roles'        => array( 'administrator', 'editor', 'author' ),
			'admins_can_configure' => 1,
			'monthly_article_cap'  => 0,
			'monthly_image_cap'    => 0,
			'monthly_assist_cap'   => 0,
			'models_cache'         => array(),
			'models_checked_at'    => 0,
		);
	}

	/* ------------------------------------------------------------------
	 * Reading
	 * ------------------------------------------------------------------ */

	public static function content() {
		$saved = get_option( self::CONTENT_OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::content_defaults() );
	}

	public static function core() {
		$saved = get_option( self::CORE_OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::core_defaults() );
	}

	public static function get( $key ) {
		$content = self::content();
		if ( array_key_exists( $key, $content ) ) {
			return $content[ $key ];
		}
		$core = self::core();
		return isset( $core[ $key ] ) ? $core[ $key ] : null;
	}

	/* ------------------------------------------------------------------
	 * Saving (every value is cleaned before it is stored)
	 * ------------------------------------------------------------------ */

	/**
	 * Clean content settings coming from a form or an imported file.
	 * Only keys that are present in $input are changed, so each tab can save on its own.
	 */
	public static function sanitize_content( array $input, array $current ) {
		$out = $current;

		$text = array( 'business_name', 'industry', 'objective', 'country', 'audience', 'cta_text', 'phone', 'brands', 'zip_codes' );
		foreach ( $text as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$out[ $key ] = sanitize_text_field( wp_unslash( $input[ $key ] ) );
			}
		}

		$textarea = array( 'services', 'locations', 'blocked_terms', 'required_guidance', 'disclaimer', 'structure', 'image_style', 'address', 'priority_services', 'primary_keywords', 'secondary_keywords', 'target_searches', 'cities', 'writing_style', 'competitors', 'trusted_sources', 'seo_goals', 'local_seo_goals', 'ai_search_goals', 'facts', 'offers', 'differentiators' );
		foreach ( $textarea as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$out[ $key ] = sanitize_textarea_field( wp_unslash( $input[ $key ] ) );
			}
		}

		$limited = array(
			'role_instruction' => self::ROLE_MAX,
			'house_rules'      => self::RULES_MAX,
			'avoid_rules'      => self::RULES_MAX,
			'example_article'  => self::EXAMPLE_MAX,
		);
		foreach ( $limited as $key => $max ) {
			if ( isset( $input[ $key ] ) ) {
				$out[ $key ] = self::substr( sanitize_textarea_field( wp_unslash( $input[ $key ] ) ), $max );
			}
		}

		if ( isset( $input['instructions'] ) ) {
			$instructions         = sanitize_textarea_field( wp_unslash( $input['instructions'] ) );
			$out['instructions'] = self::substr( $instructions, self::INSTRUCTIONS_MAX );
		}

		foreach ( array( 'website_url', 'cta_url' ) as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$out[ $key ] = esc_url_raw( trim( wp_unslash( $input[ $key ] ) ) );
			}
		}

		if ( isset( $input['language'] ) && array_key_exists( $input['language'], self::languages() ) ) {
			$out['language'] = $input['language'];
		}
		if ( isset( $input['tone'] ) ) {
			$out['tone'] = sanitize_text_field( wp_unslash( $input['tone'] ) );
		}
		if ( isset( $input['creativity'] ) && array_key_exists( $input['creativity'], self::creativity_levels() ) ) {
			$out['creativity'] = $input['creativity'];
		}
		if ( isset( $input['image_quality'] ) && in_array( $input['image_quality'], array( 'low', 'medium', 'high', 'auto' ), true ) ) {
			$out['image_quality'] = $input['image_quality'];
		}
		if ( isset( $input['seo_plugin'] ) && in_array( $input['seo_plugin'], array( 'auto', 'yoast', 'rankmath', 'none' ), true ) ) {
			$out['seo_plugin'] = $input['seo_plugin'];
		}

		if ( isset( $input['research_mode'] ) && array_key_exists( $input['research_mode'], self::research_modes() ) ) {
			$out['research_mode'] = $input['research_mode'];
		}
		// Multi-choice lists (a hidden "_lists" marker tells us the list was on screen, so "none ticked" can be saved).
		$lists = isset( $input['_lists'] ) ? array_map( 'sanitize_key', (array) $input['_lists'] ) : array();
		if ( in_array( 'search_intents', $lists, true ) || isset( $input['search_intents'] ) ) {
			$picked                = isset( $input['search_intents'] ) ? array_map( 'sanitize_key', (array) $input['search_intents'] ) : array();
			$out['search_intents'] = array_values( array_intersect( $picked, array_keys( self::search_intents() ) ) );
		}
		if ( in_array( 'departments', $lists, true ) || isset( $input['departments'] ) ) {
			$picked             = isset( $input['departments'] ) ? array_map( 'sanitize_key', (array) $input['departments'] ) : array();
			$out['departments'] = array_values( array_intersect( $picked, array_keys( self::departments() ) ) );
		}
		if ( isset( $input['default_image_template'] ) ) {
			$out['default_image_template'] = sanitize_key( $input['default_image_template'] );
		}
		if ( isset( $input['brand_logo_id'] ) ) {
			$out['brand_logo_id'] = absint( $input['brand_logo_id'] );
		}
		foreach ( array( 'brand_primary', 'brand_secondary', 'brand_text' ) as $lucy_colour ) {
			if ( isset( $input[ $lucy_colour ] ) && preg_match( '/^#[0-9a-f]{6}$/i', trim( $input[ $lucy_colour ] ) ) ) {
				$out[ $lucy_colour ] = strtolower( trim( $input[ $lucy_colour ] ) );
			}
		}

		if ( isset( $input['word_count'] ) ) {
			$out['word_count'] = max( 300, min( 4000, (int) $input['word_count'] ) );
		}
		if ( isset( $input['faq_count'] ) ) {
			$out['faq_count'] = max( 0, min( 10, (int) $input['faq_count'] ) );
		}
		if ( isset( $input['default_category'] ) ) {
			$out['default_category'] = absint( $input['default_category'] );
		}
		if ( isset( $input['default_author'] ) ) {
			$out['default_author'] = absint( $input['default_author'] );
		}

		// Checkboxes: the form sends a hidden "section" list so we know which checkboxes were on screen.
		$checkboxes = array( 'include_cta', 'image_enabled', 'faq_schema', 'add_tags' );
		$on_screen  = isset( $input['_checkboxes'] ) ? array_map( 'sanitize_key', (array) $input['_checkboxes'] ) : array_keys( array_intersect_key( $input, array_flip( $checkboxes ) ) );
		foreach ( $checkboxes as $key ) {
			if ( in_array( $key, $on_screen, true ) ) {
				$out[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
			}
		}

		return $out;
	}

	public static function save_content( array $input ) {
		$clean = self::sanitize_content( $input, self::content() );
		update_option( self::CONTENT_OPTION, $clean, false );
		return $clean;
	}

	/** Clean Super Admin settings. The API key is only replaced when a new one is typed. */
	public static function save_core( array $input ) {
		$core = self::core();

		if ( isset( $input['api_key'] ) ) {
			$new_key = trim( sanitize_text_field( wp_unslash( $input['api_key'] ) ) );
			if ( '' !== $new_key ) {
				$core['api_key'] = self::encrypt( $new_key );
			}
		}
		if ( ! empty( $input['remove_api_key'] ) ) {
			$core['api_key'] = '';
		}

		foreach ( array( 'text_model', 'image_model' ) as $key ) {
			$custom = isset( $input[ $key . '_custom' ] ) ? trim( sanitize_text_field( wp_unslash( $input[ $key . '_custom' ] ) ) ) : '';
			if ( '' !== $custom ) {
				$core[ $key ] = preg_replace( '/[^A-Za-z0-9._:\-]/', '', $custom );
			} elseif ( isset( $input[ $key ] ) && '' !== $input[ $key ] && '__custom' !== $input[ $key ] ) {
				$core[ $key ] = preg_replace( '/[^A-Za-z0-9._:\-]/', '', sanitize_text_field( wp_unslash( $input[ $key ] ) ) );
			}
		}

		if ( isset( $input['reasoning_effort'] ) && in_array( $input['reasoning_effort'], array( 'default', 'none', 'minimal', 'low', 'medium', 'high' ), true ) ) {
			$core['reasoning_effort'] = $input['reasoning_effort'];
		}
		if ( isset( $input['timeout'] ) ) {
			$core['timeout'] = max( 30, min( 600, absint( $input['timeout'] ) ) );
		}
		if ( isset( $input['monthly_article_cap'] ) ) {
			$core['monthly_article_cap'] = absint( $input['monthly_article_cap'] );
		}
		if ( isset( $input['monthly_image_cap'] ) ) {
			$core['monthly_image_cap'] = absint( $input['monthly_image_cap'] );
		}
		if ( isset( $input['monthly_assist_cap'] ) ) {
			$core['monthly_assist_cap'] = absint( $input['monthly_assist_cap'] );
		}

		$on_screen = isset( $input['_checkboxes'] ) ? array_map( 'sanitize_key', (array) $input['_checkboxes'] ) : array();
		foreach ( array( 'enabled', 'admins_can_configure', 'demo_mode' ) as $key ) {
			if ( in_array( $key, $on_screen, true ) ) {
				$core[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
			}
		}
		if ( in_array( 'allowed_roles', $on_screen, true ) ) {
			$valid_roles           = array_keys( wp_roles()->get_names() );
			$roles                 = isset( $input['allowed_roles'] ) ? array_map( 'sanitize_key', (array) $input['allowed_roles'] ) : array();
			$core['allowed_roles'] = array_values( array_intersect( $roles, $valid_roles ) );
		}

		update_option( self::CORE_OPTION, $core, false );
		return $core;
	}

	/** Used by the OpenAI connection test to remember which models the account can use. */
	public static function save_models_cache( array $models ) {
		$core                      = self::core();
		$core['models_cache']      = array_values( array_unique( array_map( 'sanitize_text_field', $models ) ) );
		$core['models_checked_at'] = time();
		update_option( self::CORE_OPTION, $core, false );
	}

	/* ------------------------------------------------------------------
	 * Import / export of CONTENT settings (never includes the API key)
	 * ------------------------------------------------------------------ */

	public static function export_json() {
		$data = array(
			'lucy_export' => LUCY_VERSION,
			'exported_at' => gmdate( 'c' ),
			'settings'    => self::content(),
		);
		// Category and author IDs are different on every site, so they are not exported.
		unset( $data['settings']['default_category'], $data['settings']['default_author'], $data['settings']['activated'], $data['settings']['activated_at'] );
		return wp_json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	}

	/** @return true|WP_Error */
	public static function import_json( $json ) {
		$data = json_decode( (string) $json, true );
		if ( ! is_array( $data ) || empty( $data['settings'] ) || ! is_array( $data['settings'] ) ) {
			return new WP_Error( 'lucy_import', __( 'That is not a Lucy settings file. Paste the full text exported from another site.', 'lucy-ai-content' ) );
		}
		$settings = $data['settings'];
		unset( $settings['default_category'], $settings['default_author'], $settings['activated'], $settings['activated_at'] );
		$settings['_lists'] = array( 'search_intents', 'departments' );
		// Tell the sanitizer every checkbox is present, so imported on/off values are applied.
		$settings['_checkboxes'] = array( 'include_cta', 'image_enabled', 'faq_schema', 'add_tags' );
		// Values in the file are not slashed, but the sanitizer expects form data (slashed).
		self::save_content( wp_slash( $settings ) );
		return true;
	}

	/* ------------------------------------------------------------------
	 * API key storage
	 * ------------------------------------------------------------------ */

	/**
	 * Returns the OpenAI key. A key defined in wp-config.php always wins:
	 * define( 'LUCY_OPENAI_API_KEY', 'sk-...' );
	 */
	public static function get_api_key() {
		if ( defined( 'LUCY_OPENAI_API_KEY' ) && LUCY_OPENAI_API_KEY ) {
			return (string) LUCY_OPENAI_API_KEY;
		}
		$core = self::core();
		return self::decrypt( $core['api_key'] );
	}

	public static function key_source() {
		if ( defined( 'LUCY_OPENAI_API_KEY' ) && LUCY_OPENAI_API_KEY ) {
			return 'config';
		}
		return self::get_api_key() ? 'settings' : 'none';
	}

	public static function masked_key() {
		$key = self::get_api_key();
		if ( ! $key ) {
			return '';
		}
		return substr( $key, 0, 3 ) . '••••••••' . substr( $key, -4 );
	}

	private static function crypto_key() {
		$secret = defined( 'LUCY_ENCRYPTION_KEY' ) ? LUCY_ENCRYPTION_KEY : wp_salt( 'auth' );
		return hash( 'sha256', $secret, true );
	}

	public static function encrypt( $plain ) {
		if ( '' === $plain ) {
			return '';
		}
		if ( ! function_exists( 'openssl_encrypt' ) ) {
			return 'b64:' . base64_encode( $plain ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
		}
		$iv     = random_bytes( 16 );
		$cipher = openssl_encrypt( $plain, 'aes-256-cbc', self::crypto_key(), OPENSSL_RAW_DATA, $iv );
		return 'enc:' . base64_encode( $iv . $cipher ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
	}

	public static function decrypt( $stored ) {
		if ( ! is_string( $stored ) || '' === $stored ) {
			return '';
		}
		if ( 0 === strpos( $stored, 'b64:' ) ) {
			return (string) base64_decode( substr( $stored, 4 ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
		}
		if ( 0 === strpos( $stored, 'enc:' ) && function_exists( 'openssl_decrypt' ) ) {
			$raw   = base64_decode( substr( $stored, 4 ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
			$plain = openssl_decrypt( substr( $raw, 16 ), 'aes-256-cbc', self::crypto_key(), OPENSSL_RAW_DATA, substr( $raw, 0, 16 ) );
			return false === $plain ? '' : $plain;
		}
		return '';
	}

	/* ------------------------------------------------------------------
	 * Helpers
	 * ------------------------------------------------------------------ */

	public static function substr( $text, $length ) {
		return function_exists( 'mb_substr' ) ? mb_substr( $text, 0, $length ) : substr( $text, 0, $length );
	}

	/**
	 * Shortens text without cutting a word in half (used for meta titles and descriptions).
	 *
	 * @param string $text  Text to shorten.
	 * @param int    $length Maximum length.
	 * @param string $tail  Optional ending added when the text was shortened.
	 * @return string
	 */
	public static function clip( $text, $length, $tail = '' ) {
		$text = trim( (string) $text );
		if ( self::strlen( $text ) <= $length ) {
			return $text;
		}
		$room = max( 1, $length - self::strlen( $tail ) );
		$cut  = self::substr( $text, $room );
		$sp   = strrpos( $cut, ' ' );
		if ( false !== $sp && $sp > (int) ( $room * 0.5 ) ) {
			$cut = self::substr( $cut, $sp );
		}
		return rtrim( $cut, " \t\n\r\0\x0B,;:.–-|" ) . $tail;
	}

	/**
	 * Title case that keeps acronyms (SUV, EV, AWD), model names (RAV4, F-150) and known
	 * brands and cities from the Growth profile looking the way they should.
	 *
	 * @param string $text Raw text, however the user typed it.
	 * @return string
	 */
	public static function title_case( $text ) {
		$small = array( 'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'up', 'vs' );
		$words = preg_split( '/\s+/', trim( (string) $text ) );
		if ( ! $words || array( '' ) === $words ) {
			return '';
		}
		$last = count( $words ) - 1;
		foreach ( $words as $i => $word ) {
			$fixed = self::fixed_word( $word );
			if ( null !== $fixed ) {
				$words[ $i ] = $fixed;
				continue;
			}
			$lower       = self::lower_word( self::letters( $word ) );
			$keep_lower  = $i > 0 && $i < $last && in_array( $lower, $small, true );
			$words[ $i ] = $keep_lower ? self::lower_word( $word ) : self::upper_first( $word );
		}
		return implode( ' ', $words );
	}

	/**
	 * The same text as it should read inside a sentence ("used utes under $70,000").
	 * The user's own capitals are kept; only SHOUTED words are calmed down.
	 *
	 * @param string $text Raw text, however the user typed it.
	 * @return string
	 */
	public static function sentence_phrase( $text ) {
		$small = array(
			'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'near', 'nor', 'of', 'on', 'or', 'over', 'per', 'the', 'to', 'under', 'up', 'vs', 'with', 'without',
			'affordable', 'best', 'cheap', 'cheapest', 'good', 'great', 'new', 'popular', 'reliable', 'second-hand', 'top', 'used',
			'cab', 'car', 'cars', 'crew', 'dual', 'family', 'hatch', 'hatchback', 'people', 'mover', 'sedan', 'sedans', 'suv', 'tray', 'truck', 'trucks', 'ute', 'utes', 'van', 'vans', 'vehicle', 'vehicles', 'wagon', 'wagons',
			'buying', 'choosing', 'deals', 'finance', 'financing', 'guide', 'lease', 'loan', 'price', 'prices', 'review', 'reviews', 'sale', 'service', 'tips', 'trade', 'trade-in', 'value'
		);
		$words = preg_split( '/\s+/', trim( (string) $text ) );
		if ( ! $words || array( '' ) === $words ) {
			return '';
		}
		foreach ( $words as $i => $word ) {
			$fixed = self::fixed_word( $word );
			if ( null !== $fixed ) {
				$words[ $i ] = $fixed;
				continue;
			}
			$lower = self::lower_word( self::letters( $word ) );
			if ( self::is_shouted( $word ) ) {
				$words[ $i ] = in_array( $lower, $small, true ) ? self::lower_word( $word ) : self::upper_first( $word );
			}
			if ( 0 === $i && in_array( $lower, $small, true ) ) {
				$words[ $i ] = self::lower_word( $words[ $i ] );
			}
		}
		return implode( ' ', $words );
	}

	/**
	 * Words whose spelling is already decided: acronyms, model codes, brands and cities.
	 *
	 * @param string $word One word.
	 * @return string|null The corrected word, or null to let the caller decide.
	 */
	private static function fixed_word( $word ) {
		$bare = preg_replace( '/[^A-Za-z0-9\-]/', '', (string) $word );
		if ( '' === $bare ) {
			return $word;
		}
		if ( self::is_acronym( $bare ) ) {
			return str_replace( $bare, strtoupper( $bare ), $word );
		}
		if ( preg_match( '/^([A-Za-z]{2,})[sS]$/', $bare, $m ) && self::is_acronym( $m[1] ) ) {
			return str_replace( $bare, strtoupper( $m[1] ) . 's', $word ); // SUVS → SUVs.
		}
		if ( preg_match( '/^[0-9][0-9,.]*[kKmM]$/', $bare ) ) {
			return str_replace( $bare, self::lower_word( $bare ), $word ); // 70K → 70k.
		}
		$known = self::known_names();
		$key   = self::lower_word( $bare );
		if ( isset( $known[ $key ] ) ) {
			return str_replace( $bare, $known[ $key ], $word );
		}
		if ( preg_match( '/[A-Za-z]/', $bare ) && preg_match( '/[0-9]/', $bare ) ) {
			return str_replace( $bare, strtoupper( $bare ), $word ); // RAV4, F-150, CX-5.
		}
		if ( preg_match( '/^.[^A-Z]*[A-Z]/', $bare ) && ! self::is_shouted( $bare ) ) {
			return $word; // McLaren, iLoad – the user meant those capitals.
		}
		return null;
	}

	/** Brands, cities and business words whose spelling Lucy should always get right. */
	private static function known_names() {
		static $names = null;
		if ( null !== $names ) {
			return $names;
		}
		$names  = array();
		$brands = array( 'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Jeep', 'Ram', 'GMC', 'BMW', 'Mercedes', 'Benz', 'Audi', 'Volkswagen', 'Tesla', 'Isuzu', 'Mitsubishi', 'Holden', 'Volvo', 'Lexus', 'Dodge', 'Chrysler', 'Buick', 'Cadillac', 'Porsche', 'Genesis', 'Acura', 'Infiniti', 'Suzuki', 'Renault', 'Peugeot', 'Skoda', 'Land', 'Rover', 'Range', 'Haval', 'BYD', 'LDV' );
		foreach ( $brands as $brand ) {
			$names[ self::lower_word( $brand ) ] = $brand;
		}
		$s    = self::content();
		$from = array( $s['brands'], $s['cities'], $s['locations'], $s['country'], $s['business_name'] );
		foreach ( $from as $value ) {
			foreach ( preg_split( '/[\r\n,]+/', (string) $value ) as $line ) {
				foreach ( preg_split( '/\s+/', trim( $line ) ) as $word ) {
					$bare = preg_replace( '/[^A-Za-z0-9\-]/', '', $word );
					if ( self::strlen( $bare ) > 1 && ! self::is_shouted( $bare ) ) {
						$names[ self::lower_word( $bare ) ] = $bare;
					}
				}
			}
		}
		return $names;
	}

	/** True for SUV, EV, AWD, 4WD and friends. */
	public static function is_acronym( $word ) {
		$known = array( 'SUV', 'EV', 'PHEV', 'HEV', 'AWD', 'FWD', 'RWD', '4WD', '4X4', 'ABS', 'VIN', 'MPG', 'CPO', 'GPS', 'LED', 'USB', 'ANCAP', 'NCAP', 'RV', 'MPV', 'APR', 'MSRP', 'KWH', 'KW', 'HP', 'TDI' );
		return in_array( strtoupper( preg_replace( '/[^A-Za-z0-9]/', '', (string) $word ) ), $known, true );
	}

	/** True for words typed in capitals that are not known acronyms (UTE, UNDER). */
	private static function is_shouted( $word ) {
		$letters = self::letters( $word );
		return '' !== $letters && $letters === strtoupper( $letters ) && self::strlen( $letters ) > 1;
	}

	/** Letters only, for comparisons. */
	private static function letters( $word ) {
		return preg_replace( '/[^A-Za-z]/', '', (string) $word );
	}

	/** Capitalises the first letter, leaving the rest lowercase. */
	private static function upper_first( $word ) {
		$lower = self::lower_word( $word );
		return preg_replace_callback(
			'/[A-Za-z]/',
			function ( $m ) {
				return strtoupper( $m[0] );
			},
			$lower,
			1
		);
	}

	/**
	 * Adds "a" or "an" when a phrase needs one ("ute under $70,000" → "a ute under $70,000").
	 *
	 * @param string $phrase Sentence-case phrase.
	 * @return string
	 */
	public static function phrase_with_article( $phrase ) {
		$phrase = trim( (string) $phrase );
		if ( '' === $phrase ) {
			return $phrase;
		}
		$words = preg_split( '/\s+/', $phrase );
		$first = self::lower_text( preg_replace( '/[^A-Za-z]/', '', $words[0] ) );
		$skip  = array( 'a', 'an', 'the', 'my', 'your', 'our', 'how', 'what', 'why', 'when', 'where', 'which', 'best', 'top', 'cheap', 'cheapest', 'affordable', 'buying', 'choosing', 'comparing', 'finance', 'financing', 'is', 'are', 'do', 'does', 'should', 'everything', 'all' );
		if ( '' === $first || in_array( $first, $skip, true ) || 's' === self::lower_text( substr( $first, -1 ) ) || ! preg_match( '/^[a-z]/', $words[0] ) ) {
			return $phrase; // Plural, a question, or a proper noun – no article needed.
		}
		$sounds_like_yu = array( 'ute', 'used', 'unique', 'uniform', 'union', 'united', 'universal', 'university', 'user', 'usable', 'utility', 'euro', 'european', 'one' );
		$silent_h       = array( 'hour', 'honest', 'honour', 'honor', 'heir' );
		if ( in_array( $first, $silent_h, true ) ) {
			return 'an ' . $phrase;
		}
		if ( in_array( $first, $sounds_like_yu, true ) ) {
			return 'a ' . $phrase;
		}
		return ( preg_match( '/^[aeiou]/', $first ) ? 'an ' : 'a ' ) . $phrase;
	}

	/** Lowercase helper that is safe for UTF-8. */
	public static function lower_text( $text ) {
		return function_exists( 'mb_strtolower' ) ? mb_strtolower( (string) $text ) : strtolower( (string) $text );
	}

	/** Lowercases a word, leaving digits and punctuation alone. */
	private static function lower_word( $word ) {
		return function_exists( 'mb_strtolower' ) ? mb_strtolower( (string) $word ) : strtolower( (string) $word );
	}

	public static function strlen( $text ) {
		return function_exists( 'mb_strlen' ) ? mb_strlen( $text ) : strlen( $text );
	}

	/** Blocked words/phrases: one per line or comma separated. */
	public static function blocked_terms_list() {
		$raw   = (string) self::get( 'blocked_terms' );
		$parts = preg_split( '/[\r\n,]+/', $raw );
		$parts = array_filter( array_map( 'trim', $parts ), 'strlen' );
		return array_values( array_unique( $parts ) );
	}

	/** Which SEO plugin should receive the meta title/description? */
	public static function active_seo_plugin() {
		$choice = self::get( 'seo_plugin' );
		$yoast  = defined( 'WPSEO_VERSION' );
		$rank   = defined( 'RANK_MATH_VERSION' ) || class_exists( 'RankMath' );
		if ( 'yoast' === $choice ) {
			return $yoast ? 'yoast' : 'none';
		}
		if ( 'rankmath' === $choice ) {
			return $rank ? 'rankmath' : 'none';
		}
		if ( 'none' === $choice ) {
			return 'none';
		}
		if ( $yoast ) {
			return 'yoast';
		}
		if ( $rank ) {
			return 'rankmath';
		}
		return 'none';
	}

	public static function seo_plugin_label( $slug ) {
		$labels = array(
			'yoast'    => 'Yoast SEO',
			'rankmath' => 'Rank Math',
			'none'     => __( 'None detected', 'lucy-ai-content' ),
		);
		return isset( $labels[ $slug ] ) ? $labels[ $slug ] : $slug;
	}
}
