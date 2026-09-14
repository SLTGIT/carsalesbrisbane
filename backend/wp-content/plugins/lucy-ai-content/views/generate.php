<?php
/**
 * Generate screen (Website editor): form → progress → review → saved.
 * The JavaScript in assets/lucy-admin.js switches between the four steps.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_s       = Lucy_Settings::content();
$lucy_core    = Lucy_Settings::core();
$lucy_langs   = Lucy_Settings::languages();
$lucy_month   = Lucy_Usage::month();
$lucy_cap     = (int) $lucy_core['monthly_article_cap'];
$lucy_enabled = (int) $lucy_core['enabled'];
$lucy_has_key = 'none' !== Lucy_Settings::key_source() || Lucy_Demo::enabled();
$lucy_seo     = Lucy_Settings::seo_plugin_label( Lucy_Settings::active_seo_plugin() );
$lucy_cats    = Lucy_Admin::category_options( __( '— Use default category —', 'lucy-ai-content' ) );
?>
<div class="lucy-heading" id="lucy-generate-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'Website experience', 'lucy-ai-content' ); ?></div>
		<h1><?php esc_html_e( 'What shall we create?', 'lucy-ai-content' ); ?></h1>
		<p><?php esc_html_e( 'Give Lucy a starting point. Your brand rules are already included.', 'lucy-ai-content' ); ?></p>
	</div>
</div>

<?php if ( ! $lucy_enabled ) : ?>
	<section class="lucy-card lucy-empty">
		<h2><?php esc_html_e( 'Lucy is currently switched off', 'lucy-ai-content' ); ?></h2>
		<p><?php esc_html_e( 'Ask a Lucy Super Admin to switch Lucy back on for this website.', 'lucy-ai-content' ); ?></p>
	</section>
	<?php return; ?>
<?php endif; ?>

<?php if ( ! $lucy_has_key ) : ?>
	<section class="lucy-card lucy-empty">
		<h2><?php esc_html_e( 'Lucy is not connected to OpenAI yet', 'lucy-ai-content' ); ?></h2>
		<p><?php esc_html_e( 'A Lucy Super Admin needs to add an OpenAI API key before drafts can be generated.', 'lucy-ai-content' ); ?></p>
		<?php if ( Lucy_Access::is_super_admin() ) : ?>
			<a class="lucy-btn" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_SUPER ) ); ?>"><?php esc_html_e( 'Add API key', 'lucy-ai-content' ); ?></a>
		<?php endif; ?>
	</section>
	<?php return; ?>
<?php endif; ?>

<?php if ( Lucy_Demo::enabled() ) : ?>
	<div class="lucy-note warn" style="margin-bottom:22px"><strong><?php esc_html_e( 'Demo mode is on.', 'lucy-ai-content' ); ?></strong> <?php esc_html_e( 'Lucy creates sample text and a simple graphic. Nothing is sent to OpenAI and no key is needed.', 'lucy-ai-content' ); ?></div>
<?php endif; ?>

<div id="lucy-resume" class="lucy-note lucy-hidden" style="margin-bottom:22px">
	<strong><?php esc_html_e( 'You have an unsaved draft', 'lucy-ai-content' ); ?></strong> – <span id="lucy-resume-title"></span>
	<span class="lucy-small" id="lucy-resume-age"></span>
	<div class="lucy-actions" style="margin-top:10px">
		<button type="button" class="lucy-btn small" id="lucy-resume-open"><?php esc_html_e( 'Continue reviewing', 'lucy-ai-content' ); ?></button>
		<button type="button" class="lucy-btn small secondary" id="lucy-resume-discard"><?php esc_html_e( 'Discard it', 'lucy-ai-content' ); ?></button>
	</div>
</div>

<!-- STEP 1: FORM -->
<div id="lucy-step-form" class="lucy-twocol">
	<form class="lucy-card" id="lucy-generate-form" novalidate>
		<input type="hidden" name="mode" id="lucy-mode" value="new">
		<?php
		Lucy_Admin::field( 'text', 'topic', __( 'Title or topic', 'lucy-ai-content' ), $lucy_pre_title, array( 'raw_name' => 'topic', 'required' => true, 'placeholder' => __( 'e.g. How to choose the right used SUV for your family', 'lucy-ai-content' ) ) );
		Lucy_Admin::field( 'text', 'keywords', __( 'Target keywords', 'lucy-ai-content' ), $lucy_pre_keyword, array( 'raw_name' => 'keywords', 'placeholder' => __( 'Comma separated, main keyword first', 'lucy-ai-content' ) ) );
		Lucy_Admin::field( 'textarea', 'extra', __( 'Additional instructions (optional)', 'lucy-ai-content' ), '', array( 'raw_name' => 'extra', 'rows' => 4, 'counter' => Lucy_Generator::EXTRA_MAX, 'maxlength' => Lucy_Generator::EXTRA_MAX, 'placeholder' => __( 'e.g. Keep it practical. Include a short checklist.', 'lucy-ai-content' ) ) );
		?>
		<div id="lucy-reference-wrap">
			<?php Lucy_Admin::field( 'textarea', 'reference', __( 'Or paste your own content (optional)', 'lucy-ai-content' ), '', array( 'raw_name' => 'reference', 'rows' => 6, 'counter' => Lucy_Generator::REFERENCE_MAX, 'maxlength' => Lucy_Generator::REFERENCE_MAX, 'hint' => __( 'Paste text you already have and Lucy rewrites it around your keywords, structured so search engines and AI assistants can quote it. Your facts are kept; instructions written inside the text are ignored.', 'lucy-ai-content' ) ) ); ?>
		</div>
		<?php
		Lucy_Admin::field(
			'text',
			'reference_url',
			__( 'Reference link (optional)', 'lucy-ai-content' ),
			'',
			array(
				'raw_name'    => 'reference_url',
				'placeholder' => 'https://example.com/article-you-like',
				'hint'        => __( 'A page whose angle you want Lucy to follow. Lucy reads it and writes something original – it never copies it, and it ignores any instructions written on that page.', 'lucy-ai-content' ),
			)
		);
		Lucy_Admin::field( 'select', 'category', __( 'Category', 'lucy-ai-content' ), '0', array( 'raw_name' => 'category', 'options' => $lucy_cats ) );

		$lucy_image_options = array( '' => __( 'No featured image', 'lucy-ai-content' ) );
		foreach ( Lucy_Images::all() as $lucy_tpl_id => $lucy_tpl ) {
			$lucy_image_options[ $lucy_tpl_id ] = sprintf( /* translators: %s: template name */ __( 'Template: %s', 'lucy-ai-content' ), $lucy_tpl['name'] );
		}
		if ( (int) $lucy_s['image_enabled'] ) {
			$lucy_image_options['__ai'] = __( 'AI picture (no template)', 'lucy-ai-content' );
		}
		Lucy_Admin::field( 'number', 'words', __( 'Length (words)', 'lucy-ai-content' ), (string) $lucy_s['word_count'], array( 'raw_name' => 'words', 'min' => 300, 'max' => 4000, 'hint' => __( 'Defaults to your Growth profile setting.', 'lucy-ai-content' ) ) );
		Lucy_Admin::field( 'number', 'faqs', __( 'How many FAQs?', 'lucy-ai-content' ), (string) $lucy_s['faq_count'], array( 'raw_name' => 'faqs', 'min' => 0, 'max' => 10, 'hint' => __( 'Added at the end of the article, and saved as FAQ structured data.', 'lucy-ai-content' ) ) );
		Lucy_Admin::field(
			'select',
			'image_choice',
			__( 'Featured image', 'lucy-ai-content' ),
			(string) $lucy_s['default_image_template'],
			array(
				'raw_name' => 'image_choice',
				'options'  => $lucy_image_options,
				'hint'     => sprintf(
					/* translators: %s: link to the image templates screen */
					__( 'Images are separate from the writing. Manage your own backgrounds and fonts in %s.', 'lucy-ai-content' ),
					'<a href="' . esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_IMAGES ) ) . '">' . esc_html__( 'Image templates', 'lucy-ai-content' ) . '</a>'
				),
			)
		);
		?>
		<div id="lucy-form-error" class="lucy-note error lucy-hidden" role="alert" style="margin-bottom:16px"></div>
		<div class="lucy-actions">
			<button type="submit" class="lucy-btn" id="lucy-generate-btn">✧ <?php esc_html_e( 'Generate draft', 'lucy-ai-content' ); ?></button>
			<span class="lucy-hint" style="margin:0"><?php esc_html_e( 'Usually 30–90 seconds. Saved as a draft – never published.', 'lucy-ai-content' ); ?></span>
		</div>
	</form>

	<div>
		<section class="lucy-card">
			<h2><?php esc_html_e( 'Your content recipe', 'lucy-ai-content' ); ?></h2>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Business', 'lucy-ai-content' ); ?></span><b><?php echo esc_html( $lucy_s['business_name'] ? $lucy_s['business_name'] : '—' ); ?></b></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Language', 'lucy-ai-content' ); ?></span><b><?php echo esc_html( isset( $lucy_langs[ $lucy_s['language'] ] ) ? $lucy_langs[ $lucy_s['language'] ] : $lucy_s['language'] ); ?></b></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Tone', 'lucy-ai-content' ); ?></span><b><?php echo esc_html( $lucy_s['tone'] ); ?></b></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Target length', 'lucy-ai-content' ); ?></span><b><?php /* translators: %s: number of words */ echo esc_html( sprintf( __( '%s words', 'lucy-ai-content' ), number_format_i18n( (int) $lucy_s['word_count'] ) ) ); ?></b></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Includes', 'lucy-ai-content' ); ?></span><span>
				<?php
				$lucy_includes = array( __( 'Article', 'lucy-ai-content' ), __( 'SEO fields', 'lucy-ai-content' ) );
				if ( (int) $lucy_s['faq_count'] > 0 ) {
					/* translators: %d: number of FAQs */
					$lucy_includes[] = sprintf( __( '%d FAQs', 'lucy-ai-content' ), (int) $lucy_s['faq_count'] );
				}
				if ( (int) $lucy_s['image_enabled'] ) {
					$lucy_includes[] = __( 'Image', 'lucy-ai-content' );
				}
				echo esc_html( implode( ', ', $lucy_includes ) );
				?>
			</span></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'SEO plugin', 'lucy-ai-content' ); ?></span><span><?php echo esc_html( $lucy_seo ); ?></span></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Model', 'lucy-ai-content' ); ?></span><code><?php echo esc_html( $lucy_core['text_model'] ); ?></code></div>
			<div class="lucy-art"><small><?php esc_html_e( 'FEATURED IMAGE / 1200 × 630', 'lucy-ai-content' ); ?></small><span><?php esc_html_e( 'Your next great story.', 'lucy-ai-content' ); ?></span></div>
		</section>
		<section class="lucy-card">
			<div class="lucy-row" style="margin:0"><h2 style="margin:0"><?php esc_html_e( 'This month', 'lucy-ai-content' ); ?></h2><span class="lucy-badge"><?php esc_html_e( 'Active', 'lucy-ai-content' ); ?></span></div>
			<?php if ( $lucy_cap > 0 ) : ?>
				<div class="lucy-progressbar"><span style="width:<?php echo esc_attr( min( 100, round( $lucy_month['articles'] / $lucy_cap * 100 ) ) ); ?>%"></span></div>
				<span class="lucy-small"><?php /* translators: 1: used, 2: limit */ echo esc_html( sprintf( __( '%1$d of %2$d articles used', 'lucy-ai-content' ), $lucy_month['articles'], $lucy_cap ) ); ?></span>
			<?php else : ?>
				<p style="margin:10px 0 0"><?php /* translators: %d: articles generated */ echo esc_html( sprintf( _n( '%d article generated', '%d articles generated', $lucy_month['articles'], 'lucy-ai-content' ), $lucy_month['articles'] ) ); ?></p>
			<?php endif; ?>
		</section>
		<div class="lucy-note"><?php esc_html_e( 'Lucy writes drafts. Always review facts, prices, links and image suitability before publishing.', 'lucy-ai-content' ); ?></div>
	</div>
</div>

<!-- STEP 2: PROGRESS -->
<section id="lucy-step-progress" class="lucy-card lucy-hidden" aria-live="polite">
	<h2>✧ <?php esc_html_e( 'Lucy is writing your draft…', 'lucy-ai-content' ); ?></h2>
	<p><?php esc_html_e( 'Please keep this tab open. This usually takes 30–90 seconds.', 'lucy-ai-content' ); ?></p>
	<ul class="lucy-steps">
		<li data-step="write"><span class="ic"></span><?php esc_html_e( 'Writing the article, SEO fields and FAQs', 'lucy-ai-content' ); ?></li>
		<li data-step="check"><span class="ic"></span><?php esc_html_e( 'Checking brand rules and blocked words', 'lucy-ai-content' ); ?></li>
		<li data-step="image"><span class="ic"></span><?php esc_html_e( 'Creating the featured image', 'lucy-ai-content' ); ?></li>
		<li data-step="ready"><span class="ic"></span><?php esc_html_e( 'Draft ready for review', 'lucy-ai-content' ); ?></li>
	</ul>
	<div id="lucy-progress-error" class="lucy-note error lucy-hidden" role="alert" style="margin-top:16px"></div>
	<div id="lucy-progress-actions" class="lucy-actions lucy-hidden" style="margin-top:16px">
		<button type="button" class="lucy-btn" data-lucy="retry"><?php esc_html_e( 'Try again', 'lucy-ai-content' ); ?></button>
		<button type="button" class="lucy-btn secondary lucy-hidden" data-lucy="skip-image"><?php esc_html_e( 'Continue without image', 'lucy-ai-content' ); ?></button>
		<button type="button" class="lucy-btn secondary" data-lucy="back"><?php esc_html_e( 'Back to form', 'lucy-ai-content' ); ?></button>
	</div>
</section>

<!-- STEP 3: REVIEW -->
<div id="lucy-step-review" class="lucy-hidden">
	<div class="lucy-twocol">
		<article class="lucy-card lucy-blog">
			<div class="lucy-image" id="lucy-image"><div class="lucy-image-empty"><?php esc_html_e( 'No featured image yet', 'lucy-ai-content' ); ?></div></div>
			<span class="eyebrow"><?php esc_html_e( 'Draft · Review required', 'lucy-ai-content' ); ?></span>
			<label for="lucy-r-title" class="screen-reader-text"><?php esc_html_e( 'Post title', 'lucy-ai-content' ); ?></label>
			<input type="text" id="lucy-r-title" class="lucy-title-input" placeholder="<?php esc_attr_e( 'Add a title', 'lucy-ai-content' ); ?>">
			<div class="lucy-toolbar" role="toolbar" aria-label="<?php esc_attr_e( 'Formatting', 'lucy-ai-content' ); ?>">
				<button type="button" data-cmd="bold" title="<?php esc_attr_e( 'Bold', 'lucy-ai-content' ); ?>"><b>B</b></button>
				<button type="button" data-cmd="italic" title="<?php esc_attr_e( 'Italic', 'lucy-ai-content' ); ?>"><i>I</i></button>
				<button type="button" data-cmd="formatBlock" data-arg="h2">H2</button>
				<button type="button" data-cmd="formatBlock" data-arg="h3">H3</button>
				<button type="button" data-cmd="formatBlock" data-arg="p">¶</button>
				<button type="button" data-cmd="insertUnorderedList" title="<?php esc_attr_e( 'Bullet list', 'lucy-ai-content' ); ?>">• <?php esc_html_e( 'List', 'lucy-ai-content' ); ?></button>
				<button type="button" data-cmd="insertOrderedList" title="<?php esc_attr_e( 'Numbered list', 'lucy-ai-content' ); ?>">1. <?php esc_html_e( 'List', 'lucy-ai-content' ); ?></button>
				<button type="button" data-cmd="createLink"><?php esc_html_e( 'Link', 'lucy-ai-content' ); ?></button>
				<button type="button" data-cmd="unlink"><?php esc_html_e( 'Unlink', 'lucy-ai-content' ); ?></button>
				<button type="button" data-cmd="undo">↶</button>
			</div>
			<div class="lucy-editor" id="lucy-r-article" contenteditable="true" aria-label="<?php esc_attr_e( 'Article text – click to edit', 'lucy-ai-content' ); ?>"></div>

			<div style="margin-top:28px">
				<div class="lucy-cardhead" style="margin-bottom:12px">
					<h2 style="margin:0"><?php esc_html_e( 'Frequently asked questions', 'lucy-ai-content' ); ?></h2>
					<button type="button" class="lucy-btn small secondary" id="lucy-add-faq">＋ <?php esc_html_e( 'Add FAQ', 'lucy-ai-content' ); ?></button>
				</div>
				<div id="lucy-r-faqs"></div>
			</div>
		</article>

		<div>
			<section class="lucy-card">
				<h2><?php esc_html_e( 'Save to WordPress', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Creates a draft post with your edits, SEO fields and featured image. Nothing is published.', 'lucy-ai-content' ); ?></p>
				<?php Lucy_Admin::field( 'select', 'r_category', __( 'Category', 'lucy-ai-content' ), '0', array( 'raw_name' => 'r_category', 'options' => $lucy_cats ) ); ?>
				<div id="lucy-save-error" class="lucy-note error lucy-hidden" role="alert" style="margin-bottom:14px"></div>
				<div class="lucy-actions">
					<button type="button" class="lucy-btn" id="lucy-save-btn"><?php esc_html_e( 'Save as WordPress draft →', 'lucy-ai-content' ); ?></button>
					<button type="button" class="lucy-btn secondary lucy-hidden" id="lucy-save-anyway"><?php esc_html_e( 'Save anyway', 'lucy-ai-content' ); ?></button>
				</div>
				<div class="lucy-actions" style="margin-top:14px">
					<button type="button" class="lucy-link" id="lucy-regenerate"><?php esc_html_e( 'Edit prompt & regenerate', 'lucy-ai-content' ); ?></button>
					<span class="lucy-small">·</span>
					<button type="button" class="lucy-link" id="lucy-discard" style="color:#c63f55"><?php esc_html_e( 'Discard draft', 'lucy-ai-content' ); ?></button>
				</div>
			</section>

			<section class="lucy-card">
				<h2><?php esc_html_e( 'Draft checks', 'lucy-ai-content' ); ?></h2>
				<ul class="lucy-checklist" id="lucy-checks"></ul>
				<div id="lucy-blocked" class="lucy-note warn lucy-hidden" style="margin-top:12px"></div>
				<div id="lucy-notes-wrap" class="lucy-hidden" style="margin-top:14px">
					<h3><?php esc_html_e( 'Please double-check', 'lucy-ai-content' ); ?></h3>
					<ul class="lucy-checklist" id="lucy-notes"></ul>
				</div>
			</section>

			<section class="lucy-card">
				<div class="lucy-cardhead" style="margin-bottom:12px">
					<h2 style="margin:0"><?php esc_html_e( 'Search engine preview', 'lucy-ai-content' ); ?></h2>
					<span class="lucy-badge purple"><?php echo esc_html( $lucy_seo ); ?></span>
				</div>
				<div class="lucy-serp" aria-hidden="true">
					<div class="u" id="lucy-serp-url"></div>
					<div class="t" id="lucy-serp-title"></div>
					<div class="d" id="lucy-serp-desc"></div>
				</div>
				<?php
				Lucy_Admin::field( 'text', 'r_meta_title', __( 'Meta title', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_meta_title', 'counter' => 60 ) );
				Lucy_Admin::field( 'textarea', 'r_meta_description', __( 'Meta description', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_meta_description', 'rows' => 3, 'counter' => 160 ) );
				Lucy_Admin::field( 'text', 'r_focus_keyword', __( 'Focus keyword', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_focus_keyword' ) );
				Lucy_Admin::field( 'text', 'r_slug', __( 'URL slug', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_slug' ) );
				Lucy_Admin::field( 'textarea', 'r_excerpt', __( 'Excerpt', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_excerpt', 'rows' => 3 ) );
				Lucy_Admin::field( 'text', 'r_tags', __( 'Tags', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_tags', 'hint' => __( 'Comma separated.', 'lucy-ai-content' ) ) );
				if ( 'none' === Lucy_Settings::active_seo_plugin() ) {
					echo '<div class="lucy-hint">' . esc_html__( 'No SEO plugin is active, so meta title and description are shown here for you to copy. Install Yoast SEO or Rank Math to fill them automatically.', 'lucy-ai-content' ) . '</div>';
				}
				?>
			</section>

			<section class="lucy-card" id="lucy-image-card">
				<h2><?php esc_html_e( 'Featured image', 'lucy-ai-content' ); ?></h2>
				<?php
				Lucy_Admin::field( 'text', 'r_alt', __( 'Alt text', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_alt', 'counter' => 125, 'hint' => __( 'Describes the image for screen readers and search engines.', 'lucy-ai-content' ) ) );
				if ( (int) $lucy_s['image_enabled'] ) {
					Lucy_Admin::field( 'textarea', 'r_image_prompt', __( 'Image description (used to create the image)', 'lucy-ai-content' ), '', array( 'raw_name' => 'r_image_prompt', 'rows' => 3 ) );
					echo '<div id="lucy-image-error" class="lucy-note error lucy-hidden" role="alert" style="margin-bottom:12px"></div>';
					echo '<button type="button" class="lucy-btn secondary" id="lucy-image-btn">✧ ' . esc_html__( 'Create image', 'lucy-ai-content' ) . '</button>';
				}
				?>
			</section>
		</div>
	</div>
</div>

<!-- STEP 4: SAVED -->
<section id="lucy-step-done" class="lucy-card lucy-empty lucy-hidden" aria-live="polite">
	<div class="eyebrow"><?php esc_html_e( 'Saved as draft', 'lucy-ai-content' ); ?></div>
	<h1>✓ <?php esc_html_e( 'Your draft is in WordPress', 'lucy-ai-content' ); ?></h1>
	<p id="lucy-done-text"><?php esc_html_e( 'Open it in the editor to make final changes, then publish when you are happy.', 'lucy-ai-content' ); ?></p>
	<div class="lucy-actions" style="justify-content:center">
		<a class="lucy-btn" id="lucy-done-edit" href="#"><?php esc_html_e( 'Open draft in editor', 'lucy-ai-content' ); ?></a>
		<a class="lucy-btn secondary" id="lucy-done-preview" href="#" target="_blank" rel="noopener"><?php esc_html_e( 'Preview', 'lucy-ai-content' ); ?></a>
		<button type="button" class="lucy-btn secondary" id="lucy-done-new"><?php esc_html_e( 'Create another', 'lucy-ai-content' ); ?></button>
	</div>
</section>
