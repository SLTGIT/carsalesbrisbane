<?php
/**
 * Setup: guided checklist → Activate Lucy for this website.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_steps  = Lucy_Context::setup_steps();
$lucy_active = Lucy_Context::is_active();
$lucy_can    = Lucy_Context::can_activate();
$lucy_s      = Lucy_Settings::content();
?>
<div class="lucy-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'AI Growth Plan · setup', 'lucy-ai-content' ); ?></div>
		<h1><?php echo $lucy_active ? esc_html__( 'Lucy is active on this website', 'lucy-ai-content' ) : esc_html__( 'Set up Lucy for this website', 'lucy-ai-content' ); ?></h1>
		<p><?php esc_html_e( 'Tell Lucy about the business once. Then the Lucy button works on every page and section, with no need to explain the business again.', 'lucy-ai-content' ); ?></p>
	</div>
	<?php if ( $lucy_active ) : ?>
		<a class="lucy-btn" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_TEMPLATES ) ); ?>"><?php esc_html_e( 'Create a page →', 'lucy-ai-content' ); ?></a>
	<?php endif; ?>
</div>

<div class="lucy-twocol">
	<div>
		<section class="lucy-card">
			<h2><?php esc_html_e( 'Setup steps', 'lucy-ai-content' ); ?></h2>
			<?php foreach ( $lucy_steps as $lucy_i => $lucy_step ) : ?>
				<?php
				$lucy_page = isset( $lucy_step['page'] ) ? $lucy_step['page'] : Lucy_Admin::PAGE_SETTINGS;
				$lucy_link = isset( $lucy_step['url'] ) ? $lucy_step['url'] : Lucy_Admin::url( $lucy_page, array( 'tab' => $lucy_step['tab'] ) );
				$lucy_ok   = Lucy_Admin::PAGE_SUPER !== $lucy_page || Lucy_Access::is_super_admin();
				?>
				<div class="lucy-step <?php echo $lucy_step['done'] ? 'done' : ''; ?>">
					<span class="num"><?php echo $lucy_step['done'] ? '✓' : esc_html( $lucy_i + 1 ); ?></span>
					<span class="t"><strong><?php echo esc_html( $lucy_step['label'] ); ?></strong>
						<span class="lucy-small"><?php echo $lucy_step['required'] ? esc_html__( 'Required', 'lucy-ai-content' ) : esc_html__( 'Recommended', 'lucy-ai-content' ); ?><?php echo ! empty( $lucy_step['hint'] ) ? ' · ' . esc_html( $lucy_step['hint'] ) : ''; ?></span></span>
					<?php if ( $lucy_ok ) : ?>
						<a class="lucy-btn small <?php echo $lucy_step['done'] ? 'secondary' : ''; ?>" href="<?php echo esc_url( $lucy_link ); ?>"><?php echo $lucy_step['done'] ? esc_html__( 'Edit', 'lucy-ai-content' ) : esc_html__( 'Start', 'lucy-ai-content' ); ?></a>
					<?php else : ?>
						<span class="lucy-small"><?php esc_html_e( 'Ask a Super Admin', 'lucy-ai-content' ); ?></span>
					<?php endif; ?>
				</div>
			<?php endforeach; ?>
		</section>

		<form class="lucy-card" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="lucy_activate">
			<?php wp_nonce_field( 'lucy_activate' ); ?>
			<?php if ( $lucy_active ) : ?>
				<h2>✓ <?php esc_html_e( 'Activated', 'lucy-ai-content' ); ?></h2>
				<p><?php /* translators: %s: date */ echo esc_html( sprintf( __( 'Since %s. Editors now see the Lucy button on every block, and Lucy uses this Growth profile everywhere.', 'lucy-ai-content' ), wp_date( get_option( 'date_format' ), (int) $lucy_s['activated_at'] ) ) ); ?></p>
				<div class="lucy-actions">
					<a class="lucy-btn" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_AUDIT ) ); ?>"><?php esc_html_e( 'Run the website audit', 'lucy-ai-content' ); ?></a>
					<button type="submit" name="deactivate" value="1" class="lucy-btn secondary"><?php esc_html_e( 'Deactivate', 'lucy-ai-content' ); ?></button>
				</div>
			<?php else : ?>
				<h2><?php esc_html_e( 'Activate Lucy', 'lucy-ai-content' ); ?></h2>
				<p><?php echo $lucy_can ? esc_html__( 'All required steps are done. Activate to switch on the Lucy button in the editor.', 'lucy-ai-content' ) : esc_html__( 'Finish the required steps above to activate.', 'lucy-ai-content' ); ?></p>
				<button type="submit" class="lucy-btn" <?php disabled( ! $lucy_can ); ?>>✦ <?php esc_html_e( 'Activate Lucy', 'lucy-ai-content' ); ?></button>
			<?php endif; ?>
		</form>
	</div>

	<div>
		<section class="lucy-card">
			<h2><?php esc_html_e( 'How Lucy works', 'lucy-ai-content' ); ?></h2>
			<ul class="lucy-checklist">
				<li class="ok"><strong><?php esc_html_e( 'Growth profile', 'lucy-ai-content' ); ?></strong> – <?php esc_html_e( 'the business, market, keywords and facts (permanent).', 'lucy-ai-content' ); ?></li>
				<li class="ok"><strong><?php esc_html_e( 'Page + section', 'lucy-ai-content' ); ?></strong> – <?php esc_html_e( 'read automatically from the page you are editing.', 'lucy-ai-content' ); ?></li>
				<li class="ok"><strong><?php esc_html_e( 'Your instruction', 'lucy-ai-content' ); ?></strong> – <?php esc_html_e( 'what to do right now.', 'lucy-ai-content' ); ?></li>
			</ul>
		</section>
		<details class="lucy-card">
			<summary style="cursor:pointer;font-weight:600"><?php esc_html_e( 'See exactly what Lucy is told about this business', 'lucy-ai-content' ); ?></summary>
			<div class="lucy-brief" style="margin-top:12px"><?php echo esc_html( Lucy_Context::website_brief() ); ?></div>
		</details>
	</div>
</div>
