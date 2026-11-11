<?php
/**
 * Super Admin screen: OpenAI connection, models, on/off switch, access and monthly limits.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_core = Lucy_Settings::core();
$lucy_tabs = array(
	'connection' => __( 'OpenAI & models', 'lucy-ai-content' ),
	'access'     => __( 'Access & limits', 'lucy-ai-content' ),
	'usage'      => __( 'Usage', 'lucy-ai-content' ),
);
$lucy_tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'connection'; // phpcs:ignore WordPress.Security.NonceVerification
if ( ! isset( $lucy_tabs[ $lucy_tab ] ) ) {
	$lucy_tab = 'connection';
}
$lucy_source = Lucy_Settings::key_source();

/** Build model options: suggestions + models found in the account + the current value. */
$lucy_model_options = function ( array $suggested, $current, $filter ) use ( $lucy_core ) {
	$options = $suggested;
	foreach ( (array) $lucy_core['models_cache'] as $id ) {
		if ( ! isset( $options[ $id ] ) && preg_match( $filter, $id ) ) {
			$options[ $id ] = $id;
		}
	}
	if ( $current && ! isset( $options[ $current ] ) ) {
		$options[ $current ] = $current;
	}
	$options['__custom'] = __( 'Other – type a model ID…', 'lucy-ai-content' );
	return $options;
};
?>
<div class="lucy-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'Super Admin', 'lucy-ai-content' ); ?></div>
		<h1><?php esc_html_e( 'Lucy control centre', 'lucy-ai-content' ); ?></h1>
		<p><?php esc_html_e( 'Connect OpenAI, choose models and decide who can use Lucy on this website.', 'lucy-ai-content' ); ?></p>
	</div>
</div>

<nav class="lucy-tabs" aria-label="<?php esc_attr_e( 'Super Admin sections', 'lucy-ai-content' ); ?>">
	<?php foreach ( $lucy_tabs as $lucy_key => $lucy_label ) : ?>
		<a href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_SUPER, array( 'tab' => $lucy_key ) ) ); ?>" class="<?php echo $lucy_key === $lucy_tab ? 'active' : ''; ?>"><?php echo esc_html( $lucy_label ); ?></a>
	<?php endforeach; ?>
</nav>

<?php if ( 'usage' === $lucy_tab ) : ?>
	<?php
	$lucy_all = get_option( Lucy_Usage::USAGE_OPTION, array() );
	$lucy_all = is_array( $lucy_all ) ? $lucy_all : array();
	krsort( $lucy_all );
	$lucy_m = Lucy_Usage::month();
	?>
	<div class="lucy-stats">
		<div class="lucy-stat"><span class="icon">▤</span><span class="lucy-small"><?php esc_html_e( 'Articles this month', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_m['articles'] ) ); ?></strong><span class="lucy-small"><?php echo $lucy_core['monthly_article_cap'] ? esc_html( sprintf( /* translators: %d: limit */ __( 'Limit %d', 'lucy-ai-content' ), $lucy_core['monthly_article_cap'] ) ) : esc_html__( 'No limit', 'lucy-ai-content' ); ?></span></div>
		<div class="lucy-stat"><span class="icon">▧</span><span class="lucy-small"><?php esc_html_e( 'Images this month', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_m['images'] ) ); ?></strong><span class="lucy-small"><?php echo $lucy_core['monthly_image_cap'] ? esc_html( sprintf( /* translators: %d: limit */ __( 'Limit %d', 'lucy-ai-content' ), $lucy_core['monthly_image_cap'] ) ) : esc_html__( 'No limit', 'lucy-ai-content' ); ?></span></div>
		<div class="lucy-stat"><span class="icon">◈</span><span class="lucy-small"><?php esc_html_e( 'Tokens this month', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_m['input_tokens'] + $lucy_m['output_tokens'] ) ); ?></strong><span class="lucy-small"><?php /* translators: 1: input tokens 2: output tokens */ echo esc_html( sprintf( __( '%1$s in · %2$s out', 'lucy-ai-content' ), number_format_i18n( $lucy_m['input_tokens'] ), number_format_i18n( $lucy_m['output_tokens'] ) ) ); ?></span></div>
		<div class="lucy-stat"><span class="icon">✓</span><span class="lucy-small"><?php esc_html_e( 'Saved as drafts', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_m['saved'] ) ); ?></strong><span class="lucy-small"><?php esc_html_e( 'This month', 'lucy-ai-content' ); ?></span></div>
	</div>
	<section class="lucy-card">
		<div class="lucy-cardhead"><h2 style="margin:0"><?php esc_html_e( 'Monthly totals', 'lucy-ai-content' ); ?></h2><a class="lucy-link" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_HISTORY ) ); ?>"><?php esc_html_e( 'See full history →', 'lucy-ai-content' ); ?></a></div>
		<div class="lucy-tablewrap"><table class="lucy-table">
			<thead><tr><th><?php esc_html_e( 'Month', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'Articles', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'Images', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'Input tokens', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'Output tokens', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'Saved', 'lucy-ai-content' ); ?></th></tr></thead>
			<tbody>
			<?php if ( ! $lucy_all ) : ?>
				<tr><td colspan="6"><?php esc_html_e( 'No usage yet.', 'lucy-ai-content' ); ?></td></tr>
			<?php endif; ?>
			<?php foreach ( $lucy_all as $lucy_month_key => $lucy_row ) : ?>
				<tr>
					<td><?php echo esc_html( $lucy_month_key ); ?></td>
					<td><?php echo esc_html( number_format_i18n( isset( $lucy_row['articles'] ) ? $lucy_row['articles'] : 0 ) ); ?></td>
					<td><?php echo esc_html( number_format_i18n( isset( $lucy_row['images'] ) ? $lucy_row['images'] : 0 ) ); ?></td>
					<td><?php echo esc_html( number_format_i18n( isset( $lucy_row['input_tokens'] ) ? $lucy_row['input_tokens'] : 0 ) ); ?></td>
					<td><?php echo esc_html( number_format_i18n( isset( $lucy_row['output_tokens'] ) ? $lucy_row['output_tokens'] : 0 ) ); ?></td>
					<td><?php echo esc_html( number_format_i18n( isset( $lucy_row['saved'] ) ? $lucy_row['saved'] : 0 ) ); ?></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table></div>
		<p class="lucy-hint" style="margin-top:12px"><?php esc_html_e( 'Token counts come from OpenAI. Check exact costs in your OpenAI dashboard (Usage).', 'lucy-ai-content' ); ?></p>
	</section>

<?php else : ?>

<div class="lucy-twocol">
	<div>
		<form class="lucy-card" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="lucy-core-form">
			<input type="hidden" name="action" value="lucy_save_core">
			<input type="hidden" name="lucy_tab" value="<?php echo esc_attr( $lucy_tab ); ?>">
			<?php wp_nonce_field( 'lucy_save_core' ); ?>

			<?php if ( 'connection' === $lucy_tab ) : ?>
				<h2><?php esc_html_e( 'OpenAI connection', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'The key stays on this server. It is stored encrypted and never shown to editors or sent to the browser.', 'lucy-ai-content' ); ?></p>

				<?php if ( 'config' === $lucy_source ) : ?>
					<div class="lucy-note success" style="margin-bottom:20px"><?php esc_html_e( 'The API key is set in wp-config.php (LUCY_OPENAI_API_KEY). That key is used and cannot be changed here.', 'lucy-ai-content' ); ?></div>
				<?php else : ?>
					<div class="lucy-field">
						<label for="lucy-api-key"><?php esc_html_e( 'OpenAI API key', 'lucy-ai-content' ); ?></label>
						<input type="password" id="lucy-api-key" name="lucy[api_key]" value="" autocomplete="new-password" placeholder="<?php echo 'settings' === $lucy_source ? esc_attr( Lucy_Settings::masked_key() ) : 'sk-…'; ?>">
						<div class="lucy-hint">
							<?php
							if ( 'settings' === $lucy_source ) {
								esc_html_e( 'A key is saved. Leave this empty to keep it, or paste a new key to replace it.', 'lucy-ai-content' );
							} else {
								echo wp_kses( __( 'Create a key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a>. Use a project key with a monthly budget.', 'lucy-ai-content' ), array( 'a' => array( 'href' => array(), 'target' => array() ) ) );
							}
							?>
						</div>
					</div>
					<?php if ( 'settings' === $lucy_source ) : ?>
						<label class="lucy-check" style="margin-bottom:20px"><input type="checkbox" name="lucy[remove_api_key]" value="1"> <span><?php esc_html_e( 'Remove the saved key', 'lucy-ai-content' ); ?></span></label>
					<?php endif; ?>
				<?php endif; ?>

				<div class="lucy-actions" style="margin-bottom:22px">
					<button type="button" class="lucy-btn secondary" id="lucy-test-connection"><?php esc_html_e( 'Test connection', 'lucy-ai-content' ); ?></button>
					<span id="lucy-test-result" class="lucy-small" role="status"></span>
				</div>

				<h2><?php esc_html_e( 'Models', 'lucy-ai-content' ); ?></h2>
				<p>
					<?php
					if ( $lucy_core['models_checked_at'] ) {
						/* translators: %s: time ago */
						echo esc_html( sprintf( __( 'Model list loaded from your OpenAI account %s ago.', 'lucy-ai-content' ), human_time_diff( (int) $lucy_core['models_checked_at'] ) ) );
					} else {
						esc_html_e( 'Run “Test connection” to load the models your OpenAI account can use.', 'lucy-ai-content' );
					}
					?>
				</p>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'select', 'text_model', __( 'Text model (articles)', 'lucy-ai-content' ), $lucy_core['text_model'], array( 'options' => $lucy_model_options( Lucy_Settings::suggested_text_models(), $lucy_core['text_model'], '/^(gpt|o\d|chatgpt)/i' ) ) );
					Lucy_Admin::field( 'text', 'text_model_custom', __( 'Custom text model ID', 'lucy-ai-content' ), '', array( 'placeholder' => __( 'Only if you chose “Other”', 'lucy-ai-content' ) ) );
					Lucy_Admin::field( 'select', 'image_model', __( 'Image model (featured images)', 'lucy-ai-content' ), $lucy_core['image_model'], array( 'options' => $lucy_model_options( Lucy_Settings::suggested_image_models(), $lucy_core['image_model'], '/(image|dall-e)/i' ) ) );
					Lucy_Admin::field( 'text', 'image_model_custom', __( 'Custom image model ID', 'lucy-ai-content' ), '', array( 'placeholder' => __( 'Only if you chose “Other”', 'lucy-ai-content' ) ) );
					Lucy_Admin::field(
						'select',
						'reasoning_effort',
						__( 'Thinking effort', 'lucy-ai-content' ),
						$lucy_core['reasoning_effort'],
						array(
							'options' => array(
								'low'     => __( 'Low – faster (recommended for blogs)', 'lucy-ai-content' ),
								'medium'  => __( 'Medium', 'lucy-ai-content' ),
								'high'    => __( 'High – slowest, most careful', 'lucy-ai-content' ),
								'minimal' => __( 'Minimal', 'lucy-ai-content' ),
								'none'    => __( 'None', 'lucy-ai-content' ),
								'default' => __( 'Model default', 'lucy-ai-content' ),
							),
							'hint'    => __( 'Only used by models that support it; ignored by others.', 'lucy-ai-content' ),
						)
					);
					Lucy_Admin::field( 'number', 'timeout', __( 'Request timeout (seconds)', 'lucy-ai-content' ), $lucy_core['timeout'], array( 'min' => 30, 'max' => 600, 'hint' => __( 'Some hosts stop requests after 60–120 seconds regardless of this value.', 'lucy-ai-content' ) ) );
					?>
				</div>

			<?php else : ?>
				<h2><?php esc_html_e( 'Lucy on this website', 'lucy-ai-content' ); ?></h2>
				<?php Lucy_Admin::checkbox( 'enabled', __( 'Lucy is switched on', 'lucy-ai-content' ), $lucy_core['enabled'], __( 'Switch off to stop all generation immediately. Settings and saved drafts are kept.', 'lucy-ai-content' ) ); ?>
				<?php Lucy_Admin::checkbox( 'demo_mode', __( 'Demo mode – test Lucy without OpenAI', 'lucy-ai-content' ), $lucy_core['demo_mode'], __( 'Lucy creates sample articles and simple graphics. No API key is needed and nothing is sent to OpenAI. Use it for test sites such as WordPress Playground; switch it off for real content.', 'lucy-ai-content' ) ); ?>

				<h2 style="margin-top:10px"><?php esc_html_e( 'Who can generate drafts', 'lucy-ai-content' ); ?></h2>
				<div class="lucy-field">
					<input type="hidden" name="lucy[_checkboxes][]" value="allowed_roles">
					<div class="lucy-checks">
						<?php foreach ( wp_roles()->get_names() as $lucy_role => $lucy_role_name ) : ?>
							<?php
							$lucy_role_obj = get_role( $lucy_role );
							if ( ! $lucy_role_obj || ! $lucy_role_obj->has_cap( 'edit_posts' ) ) {
								continue;
							}
							?>
							<label class="lucy-check"><input type="checkbox" name="lucy[allowed_roles][]" value="<?php echo esc_attr( $lucy_role ); ?>" <?php checked( in_array( $lucy_role, (array) $lucy_core['allowed_roles'], true ) ); ?>> <span><?php echo esc_html( translate_user_role( $lucy_role_name ) ); ?></span></label>
						<?php endforeach; ?>
					</div>
					<div class="lucy-hint"><?php esc_html_e( 'Only roles that can write posts are listed. Super Admins can always generate.', 'lucy-ai-content' ); ?></div>
				</div>

				<?php Lucy_Admin::checkbox( 'admins_can_configure', __( 'WordPress administrators can edit Lucy Settings (Admin Developer)', 'lucy-ai-content' ), $lucy_core['admins_can_configure'], __( 'Untick so only Super Admins can change the content brief and rules.', 'lucy-ai-content' ) ); ?>

				<h2 style="margin-top:10px"><?php esc_html_e( 'Monthly limits', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'Protect your OpenAI budget. 0 means no limit. Limits reset on the 1st of each month (site timezone).', 'lucy-ai-content' ); ?></p>
				<div class="lucy-formgrid">
					<?php
					Lucy_Admin::field( 'number', 'monthly_article_cap', __( 'Articles per month', 'lucy-ai-content' ), $lucy_core['monthly_article_cap'], array( 'min' => 0 ) );
					Lucy_Admin::field( 'number', 'monthly_image_cap', __( 'Images per month', 'lucy-ai-content' ), $lucy_core['monthly_image_cap'], array( 'min' => 0 ) );
					?>
				</div>
			<?php endif; ?>

			<div class="lucy-actions"><button type="submit" class="lucy-btn"><?php esc_html_e( 'Save', 'lucy-ai-content' ); ?></button></div>
		</form>

		<?php if ( 'access' === $lucy_tab ) : ?>
			<section class="lucy-card">
				<h2><?php esc_html_e( 'Lucy Super Admins', 'lucy-ai-content' ); ?></h2>
				<p><?php esc_html_e( 'The person who activated Lucy is the first Super Admin. Add other WordPress administrators here.', 'lucy-ai-content' ); ?></p>
				<?php if ( defined( 'LUCY_SUPER_ADMINS' ) && LUCY_SUPER_ADMINS ) : ?>
					<div class="lucy-note" style="margin-bottom:16px"><?php esc_html_e( 'Super Admins are set in wp-config.php (LUCY_SUPER_ADMINS), so this list is read-only.', 'lucy-ai-content' ); ?></div>
				<?php endif; ?>
				<div class="lucy-tablewrap"><table class="lucy-table">
					<thead><tr><th><?php esc_html_e( 'Name', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'Email', 'lucy-ai-content' ); ?></th><th></th></tr></thead>
					<tbody>
					<?php foreach ( Lucy_Access::super_admin_ids() as $lucy_id ) : ?>
						<?php $lucy_u = get_userdata( $lucy_id ); ?>
						<?php if ( ! $lucy_u ) { continue; } ?>
						<tr>
							<td><?php echo esc_html( $lucy_u->display_name ); ?><?php echo get_current_user_id() === $lucy_id ? ' <span class="lucy-badge purple">' . esc_html__( 'You', 'lucy-ai-content' ) . '</span>' : ''; ?></td>
							<td><?php echo esc_html( $lucy_u->user_email ); ?></td>
							<td style="text-align:right">
								<?php if ( ! ( defined( 'LUCY_SUPER_ADMINS' ) && LUCY_SUPER_ADMINS ) && count( Lucy_Access::super_admin_ids() ) > 1 ) : ?>
									<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
										<input type="hidden" name="action" value="lucy_super_admins">
										<input type="hidden" name="remove_user" value="<?php echo esc_attr( $lucy_id ); ?>">
										<?php wp_nonce_field( 'lucy_super_admins' ); ?>
										<button type="submit" class="lucy-link" style="color:#c63f55"><?php esc_html_e( 'Remove', 'lucy-ai-content' ); ?></button>
									</form>
								<?php endif; ?>
							</td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table></div>
				<?php if ( ! ( defined( 'LUCY_SUPER_ADMINS' ) && LUCY_SUPER_ADMINS ) ) : ?>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="lucy-actions" style="margin-top:16px">
						<input type="hidden" name="action" value="lucy_super_admins">
						<?php wp_nonce_field( 'lucy_super_admins' ); ?>
						<label for="lucy-new-admin" class="screen-reader-text"><?php esc_html_e( 'Username or email', 'lucy-ai-content' ); ?></label>
						<input type="text" id="lucy-new-admin" name="new_admin" placeholder="<?php esc_attr_e( 'Username or email of an administrator', 'lucy-ai-content' ); ?>" style="max-width:320px" required>
						<button type="submit" class="lucy-btn secondary"><?php esc_html_e( 'Add Super Admin', 'lucy-ai-content' ); ?></button>
					</form>
				<?php endif; ?>
			</section>
		<?php endif; ?>
	</div>

	<div>
		<section class="lucy-card">
			<h2><?php esc_html_e( 'Status', 'lucy-ai-content' ); ?></h2>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Lucy', 'lucy-ai-content' ); ?></span><?php echo (int) $lucy_core['enabled'] ? '<span class="lucy-badge">' . esc_html__( 'Switched on', 'lucy-ai-content' ) . '</span>' : '<span class="lucy-badge off">' . esc_html__( 'Switched off', 'lucy-ai-content' ) . '</span>'; ?></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'OpenAI key', 'lucy-ai-content' ); ?></span>
				<?php
				if ( 'none' === $lucy_source ) {
					echo '<span class="lucy-badge err">' . esc_html__( 'Missing', 'lucy-ai-content' ) . '</span>';
				} else {
					echo '<span class="lucy-key">' . esc_html( Lucy_Settings::masked_key() ) . '</span>';
				}
				?>
			</div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Text model', 'lucy-ai-content' ); ?></span><code><?php echo esc_html( $lucy_core['text_model'] ); ?></code></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'Image model', 'lucy-ai-content' ); ?></span><code><?php echo esc_html( $lucy_core['image_model'] ); ?></code></div>
			<div class="lucy-row"><span class="lucy-small"><?php esc_html_e( 'SEO plugin', 'lucy-ai-content' ); ?></span><span><?php echo esc_html( Lucy_Settings::seo_plugin_label( Lucy_Settings::active_seo_plugin() ) ); ?></span></div>
			<div class="lucy-row" style="margin:0"><span class="lucy-small"><?php esc_html_e( 'Plugin version', 'lucy-ai-content' ); ?></span><span><?php echo esc_html( LUCY_VERSION ); ?></span></div>
		</section>
		<section class="lucy-card">
			<h2><?php esc_html_e( 'Security check', 'lucy-ai-content' ); ?></h2>
			<ul class="lucy-checklist">
				<?php foreach ( Lucy_Admin::security_checks() as $lucy_check ) : ?>
					<li class="<?php echo esc_attr( 'ok' === $lucy_check[0] ? 'ok' : ( 'warn' === $lucy_check[0] ? 'bad' : 'todo' ) ); ?>">
						<strong><?php echo esc_html( $lucy_check[1] ); ?></strong>
						<?php if ( $lucy_check[2] ) : ?><div class="lucy-hint" style="margin:2px 0 4px 18px"><?php echo esc_html( $lucy_check[2] ); ?></div><?php endif; ?>
					</li>
				<?php endforeach; ?>
			</ul>
		</section>
		<div class="lucy-note">
			<?php esc_html_e( 'Tip for developers: you can keep the key out of the database by adding this to wp-config.php:', 'lucy-ai-content' ); ?><br>
			<code>define( 'LUCY_OPENAI_API_KEY', 'sk-...' );</code>
		</div>
	</div>
</div>

<?php endif; ?>
