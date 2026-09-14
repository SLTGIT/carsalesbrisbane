<?php
/**
 * Monthly usage counters and generation history.
 *
 * Kept in two small options so no custom database table is needed:
 *  - lucy_usage   : array( '2026-09' => array( 'articles' => 3, 'images' => 2, 'input_tokens' => …, 'output_tokens' => … ) )
 *  - lucy_history : newest-first list of the last 300 generations.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Usage {

	const USAGE_OPTION   = 'lucy_usage';
	const HISTORY_OPTION = 'lucy_history';
	const HISTORY_LIMIT  = 300;

	public static function month_key() {
		return wp_date( 'Y-m' );
	}

	/** Usage totals for a month (default: this month, in the site's timezone). */
	public static function month( $key = null ) {
		$key   = $key ? $key : self::month_key();
		$all   = get_option( self::USAGE_OPTION, array() );
		$month = ( is_array( $all ) && isset( $all[ $key ] ) ) ? $all[ $key ] : array();
		return wp_parse_args(
			$month,
			array(
				'articles'      => 0,
				'images'        => 0,
				'input_tokens'  => 0,
				'output_tokens' => 0,
				'saved'         => 0,
				'assists'       => 0,
			)
		);
	}

	public static function add( array $amounts ) {
		$all = get_option( self::USAGE_OPTION, array() );
		$all = is_array( $all ) ? $all : array();
		$key = self::month_key();
		$cur = self::month( $key );
		foreach ( $amounts as $field => $value ) {
			$cur[ $field ] = ( isset( $cur[ $field ] ) ? (int) $cur[ $field ] : 0 ) + (int) $value;
		}
		$all[ $key ] = $cur;
		// Keep 24 months of totals.
		krsort( $all );
		$all = array_slice( $all, 0, 24, true );
		update_option( self::USAGE_OPTION, $all, false );
	}

	/** @return true|WP_Error  Checks the Super Admin's monthly limits before spending anything. */
	public static function check_limit( $type ) {
		$month = self::month();
		if ( 'article' === $type ) {
			$cap = (int) Lucy_Settings::get( 'monthly_article_cap' );
			if ( $cap > 0 && $month['articles'] >= $cap ) {
				/* translators: %d: monthly article limit */
				return new WP_Error( 'lucy_limit', sprintf( __( 'This site has reached its monthly limit of %d articles. A Lucy Super Admin can raise the limit.', 'lucy-ai-content' ), $cap ) );
			}
		}
		if ( 'image' === $type ) {
			$cap = (int) Lucy_Settings::get( 'monthly_image_cap' );
			if ( $cap > 0 && $month['images'] >= $cap ) {
				/* translators: %d: monthly image limit */
				return new WP_Error( 'lucy_limit', sprintf( __( 'This site has reached its monthly limit of %d images. A Lucy Super Admin can raise the limit.', 'lucy-ai-content' ), $cap ) );
			}
		}
		if ( 'assist' === $type ) {
			$cap = (int) Lucy_Settings::get( 'monthly_assist_cap' );
			if ( $cap > 0 && $month['assists'] >= $cap ) {
				/* translators: %d: monthly limit */
				return new WP_Error( 'lucy_limit', sprintf( __( 'This site has reached its monthly limit of %d Lucy edits. A Lucy Super Admin can raise the limit.', 'lucy-ai-content' ), $cap ), array( 'status' => 429 ) );
			}
		}
		return true;
	}

	/* ------------------------------------------------------------------ */

	/** Adds a history row and returns its ID. */
	public static function log( array $entry ) {
		$entry = wp_parse_args(
			$entry,
			array(
				'id'            => wp_generate_password( 12, false ),
				'time'          => time(),
				'user_id'       => get_current_user_id(),
				'topic'         => '',
				'mode'          => 'new',
				'model'         => '',
				'input_tokens'  => 0,
				'output_tokens' => 0,
				'image'         => 0,
				'status'        => 'generated',
				'post_id'       => 0,
				'error'         => '',
			)
		);
		$history = self::history_raw();
		array_unshift( $history, $entry );
		update_option( self::HISTORY_OPTION, array_slice( $history, 0, self::HISTORY_LIMIT ), false );
		return $entry['id'];
	}

	public static function update( $id, array $changes ) {
		$history = self::history_raw();
		foreach ( $history as $i => $row ) {
			if ( isset( $row['id'] ) && $row['id'] === $id ) {
				$history[ $i ] = array_merge( $row, $changes );
				update_option( self::HISTORY_OPTION, $history, false );
				return true;
			}
		}
		return false;
	}

	private static function history_raw() {
		$history = get_option( self::HISTORY_OPTION, array() );
		return is_array( $history ) ? $history : array();
	}

	/** History visible to the current user: everything for admins, own rows for editors. */
	public static function history_for_current_user() {
		$rows = self::history_raw();
		if ( Lucy_Access::can_view_all_history() ) {
			return $rows;
		}
		$me = get_current_user_id();
		return array_values(
			array_filter(
				$rows,
				function ( $row ) use ( $me ) {
					return isset( $row['user_id'] ) && (int) $row['user_id'] === $me;
				}
			)
		);
	}

	public static function clear_history() {
		update_option( self::HISTORY_OPTION, array(), false );
	}
}
