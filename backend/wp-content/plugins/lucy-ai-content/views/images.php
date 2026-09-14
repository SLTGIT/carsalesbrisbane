<?php
/**
 * Image templates: your background picture + the type settings Lucy writes titles with.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_templates = Lucy_Images::all();
$lucy_fonts     = Lucy_Images::fonts();
// phpcs:ignore WordPress.Security.NonceVerification
$lucy_edit_id = isset( $_GET['template'] ) ? sanitize_key( wp_unslash( $_GET['template'] ) ) : '';
$lucy_editing = $lucy_edit_id && isset( $lucy_templates[ $lucy_edit_id ] ) ? $lucy_templates[ $lucy_edit_id ] : null;
// phpcs:ignore WordPress.Security.NonceVerification
if ( ! $lucy_editing && isset( $_GET['new'] ) ) {
	$lucy_editing = Lucy_Images::defaults();
	$lucy_edit_id = '';
	// phpcs:ignore WordPress.Security.NonceVerification
	$lucy_preset_key = isset( $_GET['preset'] ) ? sanitize_key( wp_unslash( $_GET['preset'] ) ) : '';
	$lucy_presets    = Lucy_Images::presets();
	if ( $lucy_preset_key && isset( $lucy_presets[ $lucy_preset_key ] ) ) {
		$lucy_editing         = array_merge( $lucy_editing, $lucy_presets[ $lucy_preset_key ]['settings'] );
		$lucy_editing['name'] = $lucy_presets[ $lucy_preset_key ]['label'];
	}
}
$lucy_sample = __( 'How to buy a used ute under $70,000', 'lucy-ai-content' );
?>
<?php require LUCY_DIR . 'views/header.php'; ?>

<div class="lucy-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'Lucy · image templates', 'lucy-ai-content' ); ?></div>
		<h1><?php esc_html_e( 'Your blog image templates', 'lucy-ai-content' ); ?></h1>
		<p><?php esc_html_e( 'Upload the background you designed, set the font and where the text sits. Lucy writes each blog title onto it and uses it as the featured image. Nothing here touches the writing – you choose a template when you write, or later.', 'lucy-ai-content' ); ?></p>
	</div>
	<?php if ( ! $lucy_editing ) : ?>
		<a class="lucy-btn" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_IMAGES, array( 'new' => 1 ) ) ); ?>"><?php esc_html_e( 'Add a template', 'lucy-ai-content' ); ?></a>
	<?php endif; ?>
</div>

<?php if ( $lucy_editing ) : ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="lucy-template-form" class="lucy-twocol">
		<?php wp_nonce_field( 'lucy_save_template' ); ?>
		<input type="hidden" name="action" value="lucy_save_template">
		<input type="hidden" name="template_id" value="<?php echo esc_attr( $lucy_edit_id ); ?>">

		<section class="lucy-card">
			<h2><?php esc_html_e( 'Template settings', 'lucy-ai-content' ); ?></h2>

			<label class="lucy-field"><span><?php esc_html_e( 'Template name', 'lucy-ai-content' ); ?></span>
				<input type="text" name="tpl[name]" id="lucy-tpl-name" value="<?php echo esc_attr( $lucy_editing['name'] ); ?>" placeholder="<?php esc_attr_e( 'Blog header – dark', 'lucy-ai-content' ); ?>">
			</label>

			<div class="lucy-field">
				<span><?php esc_html_e( 'Background picture', 'lucy-ai-content' ); ?></span>
				<input type="hidden" name="tpl[image_id]" id="lucy-tpl-image" value="<?php echo esc_attr( $lucy_editing['image_id'] ); ?>">
				<div class="lucy-row">
					<button type="button" class="lucy-btn secondary" id="lucy-pick-image"><?php esc_html_e( 'Choose from Media Library', 'lucy-ai-content' ); ?></button>
					<button type="button" class="lucy-btn secondary" id="lucy-learn-image">✦ <?php esc_html_e( 'Learn the layout from this picture', 'lucy-ai-content' ); ?></button>
				</div>
				<p class="lucy-hint"><?php esc_html_e( 'Any size or shape – Lucy fits it to 1200 × 630 without squashing it. JPEG, PNG or WebP. If your picture already has a title on it, click “Learn the layout”: Lucy finds those words, covers them, and writes each new blog title in the same place, colour and size.', 'lucy-ai-content' ); ?></p>
				<div id="lucy-learn-result" class="lucy-hint"></div>
				<label class="lucy-check"><input type="checkbox" name="tpl[cover]" id="lucy-tpl-cover" value="1" <?php checked( ! empty( $lucy_editing['cover'] ), true ); ?>> <?php esc_html_e( 'Cover the title that is already on the picture', 'lucy-ai-content' ); ?></label>
				<div class="lucy-formgrid" id="lucy-cover-box">
					<label class="lucy-field"><span><?php esc_html_e( 'Cover box – left (%)', 'lucy-ai-content' ); ?></span><input type="number" step="0.1" name="tpl[cover_x]" id="lucy-tpl-cover_x" value="<?php echo esc_attr( $lucy_editing['cover_x'] ); ?>"></label>
					<label class="lucy-field"><span><?php esc_html_e( 'Cover box – top (%)', 'lucy-ai-content' ); ?></span><input type="number" step="0.1" name="tpl[cover_y]" id="lucy-tpl-cover_y" value="<?php echo esc_attr( $lucy_editing['cover_y'] ); ?>"></label>
					<label class="lucy-field"><span><?php esc_html_e( 'Cover box – width (%)', 'lucy-ai-content' ); ?></span><input type="number" step="0.1" name="tpl[cover_w]" id="lucy-tpl-cover_w" value="<?php echo esc_attr( $lucy_editing['cover_w'] ); ?>"></label>
					<label class="lucy-field"><span><?php esc_html_e( 'Cover box – height (%)', 'lucy-ai-content' ); ?></span><input type="number" step="0.1" name="tpl[cover_h]" id="lucy-tpl-cover_h" value="<?php echo esc_attr( $lucy_editing['cover_h'] ); ?>"></label>
				</div>
			</div>

			<div class="lucy-formgrid">
				<label class="lucy-field"><span><?php esc_html_e( 'Font', 'lucy-ai-content' ); ?></span>
					<select name="tpl[font]" id="lucy-tpl-font">
						<?php foreach ( $lucy_fonts as $lucy_key => $lucy_font ) : ?>
							<option value="<?php echo esc_attr( $lucy_key ); ?>" <?php selected( $lucy_editing['font'], $lucy_key ); ?>><?php echo esc_html( $lucy_font['label'] ); ?></option>
						<?php endforeach; ?>
					</select>
					<span class="lucy-hint"><?php esc_html_e( 'To use your own font, upload the .ttf file to the Media Library and tick “Use as a Lucy font”.', 'lucy-ai-content' ); ?></span>
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Text size', 'lucy-ai-content' ); ?></span>
					<input type="number" name="tpl[font_size]" id="lucy-tpl-font_size" min="14" max="220" value="<?php echo esc_attr( $lucy_editing['font_size'] ); ?>">
					<span class="lucy-hint"><?php esc_html_e( 'Measured on a 1200px-wide picture and scaled to fit yours.', 'lucy-ai-content' ); ?></span>
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Text colour', 'lucy-ai-content' ); ?></span>
					<input type="text" name="tpl[colour]" id="lucy-tpl-colour" value="<?php echo esc_attr( $lucy_editing['colour'] ); ?>" placeholder="#ffffff">
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Line spacing (%)', 'lucy-ai-content' ); ?></span>
					<input type="number" name="tpl[line_height]" id="lucy-tpl-line_height" min="90" max="250" value="<?php echo esc_attr( $lucy_editing['line_height'] ); ?>">
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Align', 'lucy-ai-content' ); ?></span>
					<select name="tpl[align]" id="lucy-tpl-align">
						<?php foreach ( array( 'left' => __( 'Left', 'lucy-ai-content' ), 'center' => __( 'Centre', 'lucy-ai-content' ), 'right' => __( 'Right', 'lucy-ai-content' ) ) as $lucy_k => $lucy_v ) : ?>
							<option value="<?php echo esc_attr( $lucy_k ); ?>" <?php selected( $lucy_editing['align'], $lucy_k ); ?>><?php echo esc_html( $lucy_v ); ?></option>
						<?php endforeach; ?>
					</select>
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Position', 'lucy-ai-content' ); ?></span>
					<select name="tpl[valign]" id="lucy-tpl-valign">
						<?php foreach ( array( 'top' => __( 'Top', 'lucy-ai-content' ), 'middle' => __( 'Middle', 'lucy-ai-content' ), 'bottom' => __( 'Bottom', 'lucy-ai-content' ) ) as $lucy_k => $lucy_v ) : ?>
							<option value="<?php echo esc_attr( $lucy_k ); ?>" <?php selected( $lucy_editing['valign'], $lucy_k ); ?>><?php echo esc_html( $lucy_v ); ?></option>
						<?php endforeach; ?>
					</select>
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Side margin (%)', 'lucy-ai-content' ); ?></span>
					<input type="number" name="tpl[box_x]" id="lucy-tpl-box_x" min="0" max="90" value="<?php echo esc_attr( $lucy_editing['box_x'] ); ?>">
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Top / bottom margin (%)', 'lucy-ai-content' ); ?></span>
					<input type="number" name="tpl[box_y]" id="lucy-tpl-box_y" min="0" max="90" value="<?php echo esc_attr( $lucy_editing['box_y'] ); ?>">
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Text width (%)', 'lucy-ai-content' ); ?></span>
					<input type="number" name="tpl[box_w]" id="lucy-tpl-box_w" min="10" max="100" value="<?php echo esc_attr( $lucy_editing['box_w'] ); ?>">
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Darken the picture (%)', 'lucy-ai-content' ); ?></span>
					<input type="number" name="tpl[overlay]" id="lucy-tpl-overlay" min="0" max="85" value="<?php echo esc_attr( $lucy_editing['overlay'] ); ?>">
					<span class="lucy-hint"><?php esc_html_e( 'Helps light text stay readable on a busy photo.', 'lucy-ai-content' ); ?></span>
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Maximum lines', 'lucy-ai-content' ); ?></span>
					<input type="number" name="tpl[max_lines]" id="lucy-tpl-max_lines" min="1" max="6" value="<?php echo esc_attr( $lucy_editing['max_lines'] ); ?>">
				</label>
			</div>

			<div class="lucy-formgrid">
				<label class="lucy-field"><span><?php esc_html_e( 'Background', 'lucy-ai-content' ); ?></span>
					<select name="tpl[background]" id="lucy-tpl-background">
						<option value="image" <?php selected( $lucy_editing['background'], 'image' ); ?>><?php esc_html_e( 'My picture', 'lucy-ai-content' ); ?></option>
						<option value="brand" <?php selected( $lucy_editing['background'], 'brand' ); ?>><?php esc_html_e( 'My brand colours (no picture needed)', 'lucy-ai-content' ); ?></option>
					</select>
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Logo corner', 'lucy-ai-content' ); ?></span>
					<select name="tpl[logo_pos]" id="lucy-tpl-logo_pos">
						<?php foreach ( array( 'tl' => __( 'Top left', 'lucy-ai-content' ), 'tr' => __( 'Top right', 'lucy-ai-content' ), 'bl' => __( 'Bottom left', 'lucy-ai-content' ), 'br' => __( 'Bottom right', 'lucy-ai-content' ) ) as $lucy_k => $lucy_v ) : ?>
							<option value="<?php echo esc_attr( $lucy_k ); ?>" <?php selected( $lucy_editing['logo_pos'], $lucy_k ); ?>><?php echo esc_html( $lucy_v ); ?></option>
						<?php endforeach; ?>
					</select>
				</label>
				<label class="lucy-field"><span><?php esc_html_e( 'Logo width (%)', 'lucy-ai-content' ); ?></span><input type="number" name="tpl[logo_size]" id="lucy-tpl-logo_size" min="5" max="40" value="<?php echo esc_attr( $lucy_editing['logo_size'] ); ?>"></label>
			</div>
			<label class="lucy-check"><input type="checkbox" name="tpl[show_logo]" id="lucy-tpl-show_logo" value="1" <?php checked( $lucy_editing['show_logo'], 1 ); ?>> <?php esc_html_e( 'Put my logo on the picture', 'lucy-ai-content' ); ?></label>
			<label class="lucy-check"><input type="checkbox" name="tpl[use_brand]" id="lucy-tpl-use_brand" value="1" <?php checked( $lucy_editing['use_brand'], 1 ); ?>> <?php esc_html_e( 'Use my brand text colour', 'lucy-ai-content' ); ?></label>
			<label class="lucy-check"><input type="checkbox" name="tpl[band]" id="lucy-tpl-band" value="1" <?php checked( $lucy_editing['band'], 1 ); ?>> <?php esc_html_e( 'Brand-colour band behind the title', 'lucy-ai-content' ); ?></label>
			<label class="lucy-check"><input type="checkbox" name="tpl[thumbnail]" id="lucy-tpl-thumbnail" value="1" <?php checked( $lucy_editing['thumbnail'], 1 ); ?>> <?php esc_html_e( 'Also make a square thumbnail (600 × 600) for listings and social', 'lucy-ai-content' ); ?></label>
			<label class="lucy-check"><input type="checkbox" name="tpl[uppercase]" id="lucy-tpl-uppercase" value="1" <?php checked( $lucy_editing['uppercase'], 1 ); ?>> <?php esc_html_e( 'Write titles in capitals', 'lucy-ai-content' ); ?></label>
			<label class="lucy-check"><input type="checkbox" name="tpl[shadow]" id="lucy-tpl-shadow" value="1" <?php checked( $lucy_editing['shadow'], 1 ); ?>> <?php esc_html_e( 'Soft shadow behind the text', 'lucy-ai-content' ); ?></label>

			<div class="lucy-actions" style="margin-top:16px">
				<button type="submit" class="lucy-btn"><?php esc_html_e( 'Save template', 'lucy-ai-content' ); ?></button>
				<a class="lucy-btn secondary" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_IMAGES ) ); ?>"><?php esc_html_e( 'Back to templates', 'lucy-ai-content' ); ?></a>
			</div>
		</section>

		<section class="lucy-card">
			<h2><?php esc_html_e( 'Preview', 'lucy-ai-content' ); ?></h2>
			<p class="lucy-small"><?php esc_html_e( 'This is exactly what Lucy will produce, with a sample title.', 'lucy-ai-content' ); ?></p>
			<label class="lucy-field"><span><?php esc_html_e( 'Sample title', 'lucy-ai-content' ); ?></span>
				<input type="text" id="lucy-tpl-sample" value="<?php echo esc_attr( $lucy_sample ); ?>">
			</label>
			<div id="lucy-tpl-preview" class="lucy-tpl-preview"><p class="lucy-small"><?php esc_html_e( 'Choose a background picture to see the preview.', 'lucy-ai-content' ); ?></p></div>
			<button type="button" class="lucy-btn secondary" id="lucy-tpl-refresh"><?php esc_html_e( 'Refresh preview', 'lucy-ai-content' ); ?></button>
		</section>
	</form>

	<?php if ( $lucy_edit_id ) : ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lucy-card" style="margin-top:16px">
			<?php wp_nonce_field( 'lucy_save_template' ); ?>
			<input type="hidden" name="action" value="lucy_delete_template">
			<input type="hidden" name="template_id" value="<?php echo esc_attr( $lucy_edit_id ); ?>">
			<h2><?php esc_html_e( 'Delete this template', 'lucy-ai-content' ); ?></h2>
			<p class="lucy-small"><?php esc_html_e( 'Pictures already created from it are kept in the Media Library.', 'lucy-ai-content' ); ?></p>
			<button type="submit" class="lucy-btn secondary"><?php esc_html_e( 'Delete template', 'lucy-ai-content' ); ?></button>
		</form>
	<?php endif; ?>

<?php else : ?>

	<section class="lucy-card" style="margin-bottom:16px">
		<h2><?php esc_html_e( 'Start from a ready-made layout', 'lucy-ai-content' ); ?></h2>
		<p><?php esc_html_e( 'Each one uses the logo and colours from your Growth profile, so you get usable blog images without designing anything. Pick one, then change whatever you like.', 'lucy-ai-content' ); ?></p>
		<?php
		$lucy_brand = Lucy_Images::brand();
		foreach ( Lucy_Images::presets() as $lucy_key => $lucy_preset ) :
			$lucy_uses_photo = 'image' === $lucy_preset['settings']['background'];
			?>
			<div class="lucy-preset">
				<span class="sw" style="background:linear-gradient(120deg,<?php echo esc_attr( $lucy_brand['primary'] ); ?>,<?php echo esc_attr( $lucy_brand['secondary'] ); ?>)"></span>
				<span><strong><?php echo esc_html( $lucy_preset['label'] ); ?></strong><br>
					<span class="lucy-small"><?php echo esc_html( $lucy_preset['description'] ); ?><?php echo $lucy_uses_photo ? ' ' . esc_html__( 'Needs a background picture.', 'lucy-ai-content' ) : ''; ?></span></span>
				<a class="lucy-btn small" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_IMAGES, array( 'new' => 1, 'preset' => $lucy_key ) ) ); ?>"><?php esc_html_e( 'Use this layout', 'lucy-ai-content' ); ?></a>
			</div>
		<?php endforeach; ?>
		<p class="lucy-hint" style="margin-top:12px">
			<?php
			printf(
				/* translators: %s: link to the Growth profile */
				esc_html__( 'Logo and colours come from %s.', 'lucy-ai-content' ),
				'<a href="' . esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_SETTINGS, array( 'tab' => 'blog' ) ) ) . '">' . esc_html__( 'Growth profile → Brand kit', 'lucy-ai-content' ) . '</a>'
			);
			?>
		</p>
	</section>

	<?php if ( ! $lucy_templates ) : ?>
		<section class="lucy-card">
			<h2><?php esc_html_e( 'No templates of your own yet', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'Use a layout above, or add your own: upload the background you use for blog headers and pick the font. If that picture already has a title on it, Lucy can learn the layout from it.', 'lucy-ai-content' ); ?></p>
			<p><a class="lucy-btn" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_IMAGES, array( 'new' => 1 ) ) ); ?>"><?php esc_html_e( 'Add a template', 'lucy-ai-content' ); ?></a></p>
		</section>
	<?php else : ?>
		<div class="lucy-tgrid">
			<?php foreach ( $lucy_templates as $lucy_id => $lucy_tpl ) : ?>
				<article class="lucy-tcard">
					<?php if ( $lucy_tpl['image_id'] ) : ?>
						<img src="<?php echo esc_url( (string) wp_get_attachment_image_url( $lucy_tpl['image_id'], 'medium_large' ) ); ?>" alt="">
					<?php endif; ?>
					<div class="lucy-tcard-body">
						<h3><?php echo esc_html( $lucy_tpl['name'] ); ?></h3>
						<p class="lucy-small">
							<?php
							printf(
								/* translators: 1: font name, 2: text size */
								esc_html__( '%1$s · %2$spx · %3$s', 'lucy-ai-content' ),
								esc_html( isset( $lucy_fonts[ $lucy_tpl['font'] ] ) ? $lucy_fonts[ $lucy_tpl['font'] ]['label'] : $lucy_tpl['font'] ),
								esc_html( $lucy_tpl['font_size'] ),
								esc_html( $lucy_tpl['align'] . ' / ' . $lucy_tpl['valign'] )
							);
							?>
						</p>
						<p><a class="lucy-btn small secondary" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_IMAGES, array( 'template' => $lucy_id ) ) ); ?>"><?php esc_html_e( 'Edit', 'lucy-ai-content' ); ?></a></p>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>

<?php endif; ?>
