<?php
/**
 * Who can do what in Lucy.
 *
 *  Super Admin      – the person who activated Lucy (plus anyone they add). Controls the OpenAI key,
 *                     models, on/off switch, who may use Lucy and monthly limits. Sees all history.
 *  Admin Developer  – WordPress administrators. Edit the content settings (business brief, writing rules,
 *                     output, image, SEO). The Super Admin can switch this off so only Super Admins configure.
 *  Website editor   – any role the Super Admin allows (default: administrator, editor, author).
 *                     Generates drafts. Never publishes.
 *
 * Locked out? Add this line to wp-config.php with your user ID(s):
 *     define( 'LUCY_SUPER_ADMINS', '1' );
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Access {

	const OPTION = 'lucy_super_admins';

	/** Runs once when the plugin is activated. */
	public static function on_activate() {
		$ids = self::super_admin_ids();
		$me  = get_current_user_id();
		if ( $me && ! in_array( $me, $ids, true ) && empty( get_option( self::OPTION ) ) ) {
			update_option( self::OPTION, array( $me ), false );
		}
		// Make sure both option rows exist (not autoloaded, to keep the site fast).
		if ( false === get_option( Lucy_Settings::CONTENT_OPTION ) ) {
			add_option( Lucy_Settings::CONTENT_OPTION, Lucy_Settings::content_defaults(), '', 'no' );
		}
		if ( false === get_option( Lucy_Settings::CORE_OPTION ) ) {
			add_option( Lucy_Settings::CORE_OPTION, Lucy_Settings::core_defaults(), '', 'no' );
		}
	}

	/** @return int[] */
	public static function super_admin_ids() {
		if ( defined( 'LUCY_SUPER_ADMINS' ) && LUCY_SUPER_ADMINS ) {
			return array_values( array_filter( array_map( 'absint', explode( ',', (string) LUCY_SUPER_ADMINS ) ) ) );
		}
		$ids = get_option( self::OPTION, array() );
		return array_values( array_filter( array_map( 'absint', is_array( $ids ) ? $ids : array() ) ) );
	}

	public static function is_super_admin( $user_id = null ) {
		$user_id = null === $user_id ? get_current_user_id() : (int) $user_id;
		if ( ! $user_id ) {
			return false;
		}
		if ( is_multisite() && is_super_admin( $user_id ) ) {
			return true;
		}
		$ids = self::super_admin_ids();
		if ( empty( $ids ) ) {
			// Nobody assigned yet (e.g. activated with WP-CLI): any administrator acts as Super Admin.
			return user_can( $user_id, 'manage_options' );
		}
		return in_array( $user_id, $ids, true );
	}

	/** Admin Developer: may edit content settings. */
	public static function can_configure() {
		if ( self::is_super_admin() ) {
			return true;
		}
		return current_user_can( 'manage_options' ) && (int) Lucy_Settings::get( 'admins_can_configure' ) === 1;
	}

	/** May this user open the Generate screen? */
	public static function can_generate( $user_id = null ) {
		$user_id = null === $user_id ? get_current_user_id() : (int) $user_id;
		if ( ! $user_id || ! user_can( $user_id, 'edit_posts' ) ) {
			return false;
		}
		if ( self::is_super_admin( $user_id ) ) {
			return true;
		}
		$user    = get_userdata( $user_id );
		$allowed = (array) Lucy_Settings::get( 'allowed_roles' );
		return $user && count( array_intersect( (array) $user->roles, $allowed ) ) > 0;
	}

	/** Can this user see everyone's history (not only their own)? */
	public static function can_view_all_history() {
		return self::is_super_admin() || current_user_can( 'manage_options' );
	}

	public static function add_super_admin( $user_id ) {
		$ids = get_option( self::OPTION, array() );
		$ids = is_array( $ids ) ? array_values( array_filter( array_map( 'absint', $ids ) ) ) : array();
		// Nobody was assigned yet, so the administrator doing this is acting as Super Admin: keep them in the list
		// instead of locking them out by adding someone else.
		$me = get_current_user_id();
		if ( empty( $ids ) && $me && user_can( $me, 'manage_options' ) ) {
			$ids[] = (int) $me;
		}
		if ( ! in_array( (int) $user_id, $ids, true ) ) {
			$ids[] = (int) $user_id;
		}
		update_option( self::OPTION, array_values( $ids ), false );
	}

	/** Removes a Super Admin, but never the last one. */
	public static function remove_super_admin( $user_id ) {
		$ids = array_values( array_diff( self::super_admin_ids(), array( (int) $user_id ) ) );
		if ( empty( $ids ) ) {
			return false;
		}
		update_option( self::OPTION, $ids, false );
		return true;
	}

	/** Short role label used in the header pill. */
	public static function current_role_label() {
		if ( self::is_super_admin() ) {
			return __( 'Super Admin', 'lucy-ai-content' );
		}
		if ( self::can_configure() ) {
			return __( 'Admin Developer', 'lucy-ai-content' );
		}
		return __( 'Website editor', 'lucy-ai-content' );
	}
}
