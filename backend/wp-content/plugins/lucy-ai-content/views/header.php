<?php
/**
 * Lucy top bar – logo, page switcher and the current Lucy role.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_page  = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
$lucy_nav   = array();
if ( Lucy_Access::can_configure() ) {
	$lucy_nav[ Lucy_Admin::PAGE_SETUP ] = __( 'Setup', 'lucy-ai-content' );
}
if ( Lucy_Access::can_generate() ) {
	$lucy_nav[ Lucy_Admin::PAGE_GENERATE ] = __( 'Write', 'lucy-ai-content' );
	$lucy_nav[ Lucy_Admin::PAGE_IMAGES ]   = __( 'Image templates', 'lucy-ai-content' );
}
if ( Lucy_Access::can_configure() ) {
	$lucy_nav[ Lucy_Admin::PAGE_TRAIN ] = __( 'Train Lucy', 'lucy-ai-content' );
	$lucy_nav[ Lucy_Admin::PAGE_AUDIT ] = __( 'Audit', 'lucy-ai-content' );
}
if ( Lucy_Access::can_generate() ) {
	$lucy_nav[ Lucy_Admin::PAGE_HISTORY ] = __( 'History', 'lucy-ai-content' );
}
if ( Lucy_Access::can_configure() ) {
	$lucy_nav[ Lucy_Admin::PAGE_SETTINGS ] = __( 'Growth profile', 'lucy-ai-content' );
}
if ( Lucy_Access::is_super_admin() ) {
	$lucy_nav[ Lucy_Admin::PAGE_SUPER ] = __( 'Super Admin', 'lucy-ai-content' );
}
$lucy_user     = wp_get_current_user();
$lucy_initials = strtoupper( substr( $lucy_user->display_name ? $lucy_user->display_name : $lucy_user->user_login, 0, 2 ) );
?>
<div class="lucy-topbar">
	<a class="lucy-logo" href="<?php echo esc_url( Lucy_Admin::url( key( $lucy_nav ) ? key( $lucy_nav ) : Lucy_Admin::PAGE_GENERATE ) ); ?>"><span class="mark">l</span><span>lucy<span class="dot">.</span></span></a>
	<nav class="lucy-roles" aria-label="<?php esc_attr_e( 'Lucy pages', 'lucy-ai-content' ); ?>">
		<?php foreach ( $lucy_nav as $lucy_slug => $lucy_label ) : ?>
			<a href="<?php echo esc_url( Lucy_Admin::url( $lucy_slug ) ); ?>" class="<?php echo $lucy_slug === $lucy_page ? 'selected' : ''; ?>"<?php echo $lucy_slug === $lucy_page ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $lucy_label ); ?></a>
		<?php endforeach; ?>
	</nav>
	<div class="lucy-who">
		<?php if ( ! Lucy_Context::is_active() ) : ?>
			<span class="lucy-badge warn"><?php esc_html_e( 'Not activated', 'lucy-ai-content' ); ?></span>
		<?php endif; ?>
		<?php if ( Lucy_Demo::enabled() ) : ?>
			<span class="lucy-badge warn"><?php esc_html_e( 'Demo mode', 'lucy-ai-content' ); ?></span>
		<?php endif; ?>
		<?php if ( ! (int) Lucy_Settings::get( 'enabled' ) ) : ?>
			<span class="lucy-badge off"><?php esc_html_e( 'Lucy is switched off', 'lucy-ai-content' ); ?></span>
		<?php endif; ?>
		<span><?php echo esc_html( Lucy_Access::current_role_label() ); ?></span>
		<span class="lucy-avatar" title="<?php echo esc_attr( $lucy_user->display_name ); ?>"><?php echo esc_html( $lucy_initials ); ?></span>
	</div>
</div>
