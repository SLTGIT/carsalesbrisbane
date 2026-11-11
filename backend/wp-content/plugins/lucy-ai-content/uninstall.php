<?php
/**
 * Runs when the plugin is DELETED from Plugins → Installed Plugins (not when it is only deactivated).
 * Removes Lucy's settings, usage and history. Posts and images Lucy created are kept.
 *
 * @package Lucy
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

foreach ( array( 'lucy_settings', 'lucy_core', 'lucy_super_admins', 'lucy_usage', 'lucy_history', 'lucy_audit' ) as $lucy_option ) {
	delete_option( $lucy_option );
}

global $wpdb;
// Unsaved drafts are stored as transients named lucy_draft_{user ID}.
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_lucy\_draft\_%' OR option_name LIKE '\_transient\_timeout\_lucy\_draft\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
