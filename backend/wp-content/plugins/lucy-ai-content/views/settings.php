<?php
/**
 * Growth profile (website settings): Lucy's permanent business context, set up once per website.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_s    = Lucy_Settings::content();
$lucy_tabs = array(
	'business'  => __( 'Business', 'lucy-ai-content' ),
	'targets'   => __( 'Keywords & locations', 'lucy-ai-content' ),
	'voice'     => __( 'Audience & voice', 'lucy-ai-content' ),
	'facts'     => __( 'Facts & offers', 'lucy-ai-content' ),
	'research'  => __( 'Competitors & research', 'lucy-ai-content' ),
	'seo'       => __( 'SEO & AI search', 'lucy-ai-content' ),
	'blog'      => __( 'Writer & images', 'lucy-ai-content' ),
	'transfer'  => __( 'Import / export', 'lucy-ai-content' ),
);
$lucy_tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'business'; // phpcs:ignore WordPress.Security.NonceVerification
if ( ! isset( $lucy_tabs[ $lucy_tab ] ) ) {
	$lucy_tab = 'business';
}
$lucy_keys = array_keys( $lucy_tabs );
$lucy_next = isset( $lucy_keys[ array_search( $lucy_tab, $lucy_keys, true ) + 1 ] ) ? $lucy_keys[ array_search( $lucy_tab, $lucy_keys, true ) + 1 ] : '';
if ( 'transfer' === $lucy_next ) {
	$lucy_next = 'setup';
}
$lucy_langs = Lucy_Settings::languages();
$lucy_tones = array_combine( Lucy_Settings::tones(), Lucy_Settings::tones() );
if ( $lucy_s['tone'] && ! isset( $lucy_tones[ $lucy_s['tone'] ] ) ) {
	$lucy_tones[ $lucy_s['tone'] ] = $lucy_s['tone'];
}

/** Checkbox list helper. */
$lucy_checks = function ( $name, $label, array $options, array $checked, $hint = '' ) {
	echo '<div class="lucy-field full"><span class="label">' . esc_html( $label ) . '</span>';
	echo '<input type="hidden" name="lucy[_lists][]" value="' . esc_attr( $name ) . '"><div class="lucy-checks">';
	foreach ( $options as $value => $text ) {
		echo '<label class="lucy-check"><input type="checkbox" name="lucy[' . esc_attr( $name ) . '][]" value="' . esc_attr( $value ) . '"' . checked( in_array( $value, $checked, true ), true, false ) . '> <span>' . esc_html( $text ) . '</span></label>';
	}
	echo '</div>';
	if ( $hint ) {
		echo '<div class="lucy-hint">' . esc_html( $hint ) . '</div>';
	}
	echo '</div>';
};
$lucy_steps = Lucy_Context::setup_steps();
$lucy_done  = count( array_filter( wp_list_pluck( $lucy_steps, 'done' ) ) );
?>
<div class="lucy-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'Growth profile', 'lucy-ai-content' ); ?></div>
		<h1><?php esc_html_e( 'What Lucy knows about this business', 'lucy-ai-content' ); ?></h1>
		<p><?php esc_html_e( 'Set this up once. Every Lucy button on every page uses it, so nobody has to explain the business, market or keywords again.', 'lucy-ai-content' ); ?></p>
	</div>
	<?php if ( 'transfer' !== $lucy_tab ) : ?>
		<button type="submit" form="lucy-settings-form" class="lucy-btn"><?php esc_html_e( 'Save', 'lucy-ai-content' ); ?></button>
	<?php endif; ?>
</div>

<nav class="lucy-tabs" aria-label="<?php esc_attr_e( 'Growth profile sections', 'lucy-ai-content' ); ?>">
	<?php foreach ( $lucy_tabs as $lucy_key => $lucy_label ) : ?>
		<a href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_SETTINGS, array( 'tab' => $lucy_key ) ) ); ?>" class="<?php echo $lucy_key === $lucy_tab ? 'active' : ''; ?>"><?php echo esc_html( $lucy_label ); ?></a>
	<?php endforeach; ?>
</nav>

<div class="lucy-twocol">
	<div>
	<?php if ( 'transfer' === $lucy_tab ) : ?>

		<section class="lucy-card">
			<h2><?php esc_html_e( 'Export this Growth profile', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'Copy this text and import it on another website (for example a sister dealership) to reuse the profile. The OpenAI key, category, author and activation are never included.', 'lucy-ai-content' ); ?></p>
			<textarea id="lucy-export" rows="10" readonly><?php echo esc_textarea( Lucy_Settings::export_json() ); ?></textarea>
			<div class="lucy-actions" style="margin-top:12px"><button type="button" class="lucy-btn secondary" id="lucy-copy-export"><?php esc_html_e( 'Copy to clipboard', 'lucy-ai-content' ); ?></button></div>
		</section>
		<form class="lucy-card" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<h2><?php esc_html_e( 'Import a profile', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'Paste a profile exported from another website. This replaces the current profile on this site.', 'lucy-ai-content' ); ?></p>
			<input type="hidden" name="action" value="lucy_import_settings">
			<?php wp_nonce_field( 'lucy_import_settings' ); ?>
			<textarea name="lucy_import" rows="8" required placeholder="{ &quot;lucy_export&quot;: … }"></textarea>
			<div class="lucy-actions" style="margin-top:12px"><button type="submit" class="lucy-btn"><?php esc_html_e( 'Import profile', 'lucy-ai-content' ); ?></button></div>
		</form>

	<?php else : ?>

		<form class="lucy-card" id="lucy-settings-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="lucy_save_settings">
			<input type="hidden" name="lucy_tab" value="<?php echo esc_attr( $lucy_tab ); ?>">
			<?php wp_nonce_field( 'lucy_save_settings' ); ?>

			<?php if ( 'business' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'The business and what it sells', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Lucy promotes what matters most to this business – not just generic content.', 'lucy-ai-content' ); ?></p>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'text', 'business_name', __( 'Business name', 'lucy-ai-content' ), $lucy_s['business_name'], array( 'placeholder' => 'ABC Motors' ) );
					Lucy_Admin::field( 'url', 'website_url', __( 'Website', 'lucy-ai-content' ), $lucy_s['website_url'] );
					Lucy_Admin::field( 'text', 'industry', __( 'Business type', 'lucy-ai-content' ), $lucy_s['industry'], array( 'placeholder' => __( 'e.g. Used car dealer, Toyota dealer, RV dealer', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'text', 'phone', __( 'Phone', 'lucy-ai-content' ), $lucy_s['phone'] );
					Lucy_Admin::field( 'textarea', 'address', __( 'Address', 'lucy-ai-content' ), $lucy_s['address'], array( 'full' => true, 'rows' => 2, 'hint' => __( 'Used exactly as written so name, address and phone stay consistent everywhere (important for local SEO).', 'lucy-ai-content' ) ) );
					$lucy_checks( 'departments', __( 'What do you want to sell or promote?', 'lucy-ai-content' ), Lucy_Settings::departments(), (array) $lucy_s['departments'], __( 'The website audit also checks that each of these has a page.', 'lucy-ai-content' ) );
					Lucy_Admin::field( 'text', 'brands', __( 'Brands you carry', 'lucy-ai-content' ), $lucy_s['brands'], array( 'full' => true, 'placeholder' => __( 'e.g. Toyota, Honda, Ford', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'services', __( 'Products and services', 'lucy-ai-content' ), $lucy_s['services'], array( 'rows' => 4, 'hint' => __( 'One per line.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'priority_services', __( 'Top priorities to promote right now', 'lucy-ai-content' ), $lucy_s['priority_services'], array( 'rows' => 4, 'hint' => __( 'e.g. SUVs under $25k, finance for first-time buyers.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'text', 'objective', __( 'Main marketing goal', 'lucy-ai-content' ), $lucy_s['objective'], array( 'full' => true ) );
					Lucy_Admin::field( 'textarea', 'instructions', __( 'Content brief (anything else Lucy should know)', 'lucy-ai-content' ), $lucy_s['instructions'], array( 'full' => true, 'rows' => 6, 'counter' => Lucy_Settings::INSTRUCTIONS_MAX, 'maxlength' => Lucy_Settings::INSTRUCTIONS_MAX, 'hint' => __( 'Up to 2,000 characters. The story of the business, what to highlight, what to avoid.', 'lucy-ai-content' ) ) );
					?>
				</div>

			<?php elseif ( 'targets' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'How customers search, and where', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Lucy works these into headings and copy naturally, and uses them for local and AI search.', 'lucy-ai-content' ); ?></p>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'textarea', 'primary_keywords', __( 'Primary keywords', 'lucy-ai-content' ), $lucy_s['primary_keywords'], array( 'rows' => 4, 'placeholder' => "used cars dallas\nused car dealer near me", 'hint' => __( 'The searches that matter most. One per line.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'secondary_keywords', __( 'Secondary keywords', 'lucy-ai-content' ), $lucy_s['secondary_keywords'], array( 'rows' => 4, 'placeholder' => "certified pre-owned toyota\ncar finance bad credit" ) );
					$lucy_checks( 'search_intents', __( 'Search intent to target', 'lucy-ai-content' ), Lucy_Settings::search_intents(), (array) $lucy_s['search_intents'] );
					Lucy_Admin::field( 'textarea', 'target_searches', __( 'Example searches you want to win', 'lucy-ai-content' ), $lucy_s['target_searches'], array( 'full' => true, 'rows' => 3, 'placeholder' => "used car dealers near me\nused cars in Dallas\nToyota dealer near 75001" ) );
					Lucy_Admin::field( 'textarea', 'cities', __( 'Target cities', 'lucy-ai-content' ), $lucy_s['cities'], array( 'rows' => 3, 'placeholder' => "Dallas\nPlano\nIrving", 'hint' => __( 'The first city is the main one. The audit checks each has a page.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'locations', __( 'Service areas / suburbs', 'lucy-ai-content' ), $lucy_s['locations'], array( 'rows' => 3 ) );
					Lucy_Admin::field( 'text', 'zip_codes', __( 'ZIP / postcodes', 'lucy-ai-content' ), $lucy_s['zip_codes'], array( 'placeholder' => '75001, 75002, 75006' ) );
					Lucy_Admin::field( 'text', 'country', __( 'Country', 'lucy-ai-content' ), $lucy_s['country'], array( 'placeholder' => 'United States' ) );
					?>
				</div>

			<?php elseif ( 'voice' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'Who you are talking to, and how', 'lucy-ai-content' ); ?></h2>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'textarea', 'audience', __( 'Target audience', 'lucy-ai-content' ), $lucy_s['audience'], array( 'full' => true, 'rows' => 2, 'placeholder' => __( 'e.g. Families and first-time buyers in the Dallas–Fort Worth area', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'select', 'tone', __( 'Brand tone', 'lucy-ai-content' ), $lucy_s['tone'], array( 'options' => $lucy_tones ) );
					Lucy_Admin::field( 'select', 'language', __( 'Language', 'lucy-ai-content' ), $lucy_s['language'], array( 'options' => $lucy_langs ) );
					Lucy_Admin::field( 'textarea', 'writing_style', __( 'Writing style', 'lucy-ai-content' ), $lucy_s['writing_style'], array( 'full' => true, 'rows' => 3, 'placeholder' => __( 'e.g. Short sentences. Friendly, confident, never pushy. Use “we”.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'blocked_terms', __( 'Words and phrases to never use', 'lucy-ai-content' ), $lucy_s['blocked_terms'], array( 'rows' => 5, 'hint' => __( 'Lucy checks every result for these.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'required_guidance', __( 'Always follow', 'lucy-ai-content' ), $lucy_s['required_guidance'], array( 'rows' => 5 ) );
					?>
				</div>

			<?php elseif ( 'facts' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'Facts Lucy is allowed to state', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Lucy never invents offers, prices or claims. Give it the real ones here.', 'lucy-ai-content' ); ?></p>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'textarea', 'facts', __( 'Business facts', 'lucy-ai-content' ), $lucy_s['facts'], array( 'full' => true, 'rows' => 4, 'placeholder' => __( "Family-owned since 2004\nOpen 7 days\nEvery car passes a 150-point inspection", 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'differentiators', __( 'What makes you different', 'lucy-ai-content' ), $lucy_s['differentiators'], array( 'rows' => 4, 'placeholder' => __( "7-day money-back guarantee\nIn-house finance team\nFree first service", 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'offers', __( 'Current offers (with end dates)', 'lucy-ai-content' ), $lucy_s['offers'], array( 'rows' => 4, 'placeholder' => __( 'Free tint with any SUV – until 30 Sept', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'text', 'cta_text', __( 'Main call to action', 'lucy-ai-content' ), $lucy_s['cta_text'], array( 'placeholder' => __( 'Book a test drive today', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'url', 'cta_url', __( 'Call to action link', 'lucy-ai-content' ), $lucy_s['cta_url'], array( 'placeholder' => 'https://' ) );
					Lucy_Admin::field( 'textarea', 'disclaimer', __( 'Disclaimer added to every article (optional)', 'lucy-ai-content' ), $lucy_s['disclaimer'], array( 'full' => true, 'rows' => 2 ) );
					?>
				</div>

			<?php elseif ( 'research' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'Competitors and research', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Lucy uses competitors to find angles that set you apart (it never names them unless asked).', 'lucy-ai-content' ); ?></p>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'textarea', 'competitors', __( 'Competitors or reference businesses', 'lucy-ai-content' ), $lucy_s['competitors'], array( 'rows' => 5, 'placeholder' => __( "Dallas Auto Mart – big stock, pushy sales\nXYZ Toyota – strong on new cars", 'lucy-ai-content' ), 'hint' => __( 'Name + website + what they do well or badly.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'trusted_sources', __( 'Trusted sources', 'lucy-ai-content' ), $lucy_s['trusted_sources'], array( 'rows' => 5, 'placeholder' => __( "Manufacturer websites\nNHTSA / IIHS for safety\nKelley Blue Book for values", 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'select', 'research_mode', __( 'Research rule', 'lucy-ai-content' ), $lucy_s['research_mode'], array( 'full' => true, 'options' => Lucy_Settings::research_modes() ) );
					?>
				</div>
				<div class="lucy-note"><?php esc_html_e( 'Coming next: Lucy market research – competitor and search research that suggests keywords and content opportunities for you to approve.', 'lucy-ai-content' ); ?></div>

			<?php elseif ( 'seo' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'SEO, local SEO and AI-search goals', 'lucy-ai-content' ); ?></h2>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'textarea', 'seo_goals', __( 'SEO goals', 'lucy-ai-content' ), $lucy_s['seo_goals'], array( 'rows' => 3, 'placeholder' => __( 'Rank for used-car searches in Dallas; grow finance enquiries', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'local_seo_goals', __( 'Local SEO goals', 'lucy-ai-content' ), $lucy_s['local_seo_goals'], array( 'rows' => 3, 'placeholder' => __( 'Appear in “near me” and map results for every target city', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'textarea', 'ai_search_goals', __( 'AI-search goals', 'lucy-ai-content' ), $lucy_s['ai_search_goals'], array( 'full' => true, 'rows' => 3, 'hint' => __( 'How you want to appear in ChatGPT, Google AI Overviews and similar tools.', 'lucy-ai-content' ) ) );
					Lucy_Admin::field(
						'select',
						'seo_plugin',
						__( 'Send SEO fields to', 'lucy-ai-content' ),
						$lucy_s['seo_plugin'],
						array(
							'options' => array(
								'auto'     => __( 'Detect automatically (Yoast SEO or Rank Math)', 'lucy-ai-content' ),
								'yoast'    => 'Yoast SEO',
								'rankmath' => 'Rank Math',
								'none'     => __( 'Do not send', 'lucy-ai-content' ),
							),
						)
					);
					echo '<div></div>';
					Lucy_Admin::checkbox( 'faq_schema', __( 'Add structured data to published Lucy pages (FAQ, vehicle, review, article, local business)', 'lucy-ai-content' ), $lucy_s['faq_schema'], __( 'Helps search engines and AI tools understand the page. Turn off if your SEO plugin already adds this.', 'lucy-ai-content' ) );
					?>
				</div>

			<?php elseif ( 'blog' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'Brand kit', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Your logo and colours. Lucy uses them on every image template, so blog pictures look like they came from your business.', 'lucy-ai-content' ); ?></p>
				<div class="lucy-brandkit">
					<input type="hidden" name="lucy[brand_logo_id]" id="lucy-brand-logo-id" value="<?php echo esc_attr( $lucy_s['brand_logo_id'] ); ?>">
					<div class="lucy-row">
						<div id="lucy-brand-logo-preview" class="lucy-logo-preview">
							<?php if ( $lucy_s['brand_logo_id'] ) : ?>
								<img src="<?php echo esc_url( (string) wp_get_attachment_image_url( (int) $lucy_s['brand_logo_id'], 'medium' ) ); ?>" alt="">
							<?php else : ?>
								<span class="lucy-small"><?php esc_html_e( 'No logo yet', 'lucy-ai-content' ); ?></span>
							<?php endif; ?>
						</div>
						<div>
							<button type="button" class="lucy-btn secondary" id="lucy-pick-logo"><?php esc_html_e( 'Choose logo', 'lucy-ai-content' ); ?></button>
							<button type="button" class="lucy-btn secondary" id="lucy-clear-logo"><?php esc_html_e( 'Remove', 'lucy-ai-content' ); ?></button>
							<p class="lucy-hint"><?php esc_html_e( 'A PNG with a transparent background works best. It is placed in the corner you choose on each template.', 'lucy-ai-content' ); ?></p>
						</div>
					</div>
					<div class="lucy-formgrid">
						<label class="lucy-field"><span><?php esc_html_e( 'Brand colour', 'lucy-ai-content' ); ?></span><input type="color" name="lucy[brand_primary]" id="lucy-brand-primary" value="<?php echo esc_attr( $lucy_s['brand_primary'] ); ?>"></label>
						<label class="lucy-field"><span><?php esc_html_e( 'Second colour', 'lucy-ai-content' ); ?></span><input type="color" name="lucy[brand_secondary]" id="lucy-brand-secondary" value="<?php echo esc_attr( $lucy_s['brand_secondary'] ); ?>"></label>
						<label class="lucy-field"><span><?php esc_html_e( 'Text colour on brand images', 'lucy-ai-content' ); ?></span><input type="color" name="lucy[brand_text]" id="lucy-brand-text" value="<?php echo esc_attr( $lucy_s['brand_text'] ); ?>"></label>
					</div>
					<p class="lucy-hint"><a href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_IMAGES ) ); ?>"><?php esc_html_e( 'Set up your image templates →', 'lucy-ai-content' ); ?></a></p>
				</div>

				<h2><?php esc_html_e( 'Article length, FAQs and images', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Used every time Lucy writes an article, from the Lucy screen or from the post editor.', 'lucy-ai-content' ); ?></p>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'number', 'word_count', __( 'Article length (words)', 'lucy-ai-content' ), $lucy_s['word_count'], array( 'min' => 300, 'max' => 4000, 'step' => 50 ) );
					Lucy_Admin::field( 'number', 'faq_count', __( 'FAQs per article', 'lucy-ai-content' ), $lucy_s['faq_count'], array( 'min' => 0, 'max' => 10 ) );
					$lucy_levels = array();
					foreach ( Lucy_Settings::creativity_levels() as $lucy_k => $lucy_v ) {
						$lucy_levels[ $lucy_k ] = $lucy_v['label'];
					}
					Lucy_Admin::field( 'select', 'creativity', __( 'Creativity', 'lucy-ai-content' ), $lucy_s['creativity'], array( 'options' => $lucy_levels ) );
					Lucy_Admin::field( 'select', 'default_category', __( 'Default category', 'lucy-ai-content' ), $lucy_s['default_category'], array( 'options' => Lucy_Admin::category_options( __( '— WordPress default —', 'lucy-ai-content' ) ) ) );
					Lucy_Admin::field( 'textarea', 'structure', __( 'Article structure', 'lucy-ai-content' ), $lucy_s['structure'], array( 'full' => true, 'rows' => 4 ) );
					Lucy_Admin::checkbox( 'include_cta', __( 'End articles with the main call to action', 'lucy-ai-content' ), $lucy_s['include_cta'] );
					Lucy_Admin::checkbox( 'add_tags', __( 'Add suggested tags to articles', 'lucy-ai-content' ), $lucy_s['add_tags'] );
					Lucy_Admin::checkbox( 'image_enabled', __( 'Allow AI images', 'lucy-ai-content' ), $lucy_s['image_enabled'] );
					Lucy_Admin::field( 'textarea', 'image_style', __( 'Image style', 'lucy-ai-content' ), $lucy_s['image_style'], array( 'full' => true, 'rows' => 3 ) );
					Lucy_Admin::field(
						'select',
						'image_quality',
						__( 'Image quality', 'lucy-ai-content' ),
						$lucy_s['image_quality'],
						array(
							'options' => array(
								'low'    => __( 'Low – fastest, cheapest', 'lucy-ai-content' ),
								'medium' => __( 'Medium – recommended', 'lucy-ai-content' ),
								'high'   => __( 'High – best detail', 'lucy-ai-content' ),
								'auto'   => __( 'Let OpenAI decide', 'lucy-ai-content' ),
							),
						)
					);
					$lucy_authors = array( 0 => __( '— The person who generates the draft —', 'lucy-ai-content' ) );
					foreach ( get_users( array( 'capability' => 'edit_posts', 'fields' => array( 'ID', 'display_name' ), 'number' => 200 ) ) as $lucy_u ) {
						$lucy_authors[ $lucy_u->ID ] = $lucy_u->display_name;
					}
					Lucy_Admin::field( 'select', 'default_author', __( 'Article author', 'lucy-ai-content' ), $lucy_s['default_author'], array( 'options' => $lucy_authors ) );
					?>
				</div>
			<?php endif; ?>

			<?php if ( $lucy_next ) : ?>
				<input type="hidden" name="lucy_next" value="" id="lucy-next">
			<?php endif; ?>
			<div class="lucy-actions" style="margin-top:8px">
				<button type="submit" class="lucy-btn"><?php esc_html_e( 'Save', 'lucy-ai-content' ); ?></button>
				<?php if ( $lucy_next ) : ?>
					<button type="submit" class="lucy-btn secondary" onclick="document.getElementById('lucy-next').value='<?php echo esc_js( $lucy_next ); ?>'">
						<?php echo 'setup' === $lucy_next ? esc_html__( 'Save & back to setup →', 'lucy-ai-content' ) : esc_html( sprintf( /* translators: %s: next section */ __( 'Save & continue: %s →', 'lucy-ai-content' ), $lucy_tabs[ $lucy_next ] ) ); ?>
					</button>
				<?php endif; ?>
			</div>
		</form>

	<?php endif; ?>
	</div>

	<div>
		<section class="lucy-card">
			<span class="eyebrow"><?php esc_html_e( 'Profile strength', 'lucy-ai-content' ); ?></span>
			<h2 style="margin-top:12px"><?php echo esc_html( $lucy_s['business_name'] ? $lucy_s['business_name'] : get_bloginfo( 'name' ) ); ?></h2>
			<div class="lucy-progressbar"><span style="width:<?php echo esc_attr( round( $lucy_done / max( 1, count( $lucy_steps ) ) * 100 ) ); ?>%"></span></div>
			<ul class="lucy-checklist" style="margin-top:10px">
				<?php foreach ( $lucy_steps as $lucy_step ) : ?>
					<li class="<?php echo $lucy_step['done'] ? 'ok' : 'todo'; ?>"><?php echo esc_html( $lucy_step['label'] ); ?><?php echo $lucy_step['required'] ? '' : ' <span class="lucy-small">(' . esc_html__( 'recommended', 'lucy-ai-content' ) . ')</span>'; ?></li>
				<?php endforeach; ?>
			</ul>
			<p style="margin:14px 0 0"><a class="lucy-link" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_SETUP ) ); ?>"><?php echo Lucy_Context::is_active() ? esc_html__( 'Lucy is active – view setup →', 'lucy-ai-content' ) : esc_html__( 'Go to setup & activate →', 'lucy-ai-content' ); ?></a></p>
		</section>
		<div class="lucy-note"><strong><?php esc_html_e( 'How Lucy uses this', 'lucy-ai-content' ); ?></strong><br><?php esc_html_e( 'Growth profile (permanent) + the page and section being edited + your instruction = the right copy for that exact spot.', 'lucy-ai-content' ); ?></div>
	</div>
</div>
