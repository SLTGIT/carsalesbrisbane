<?php
/**
 * Website audit (AI Growth Plan steps 1–2): scans the published pages and posts of this website and
 * finds weak, missing, outdated or poorly targeted content, measured against the Growth profile
 * (what the business sells, keywords, cities, brands). Rule-based and free – no AI calls.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Audit {

	const OPTION = 'lucy_audit';
	const MAX    = 500;

	public static function last() {
		$data = get_option( self::OPTION, array() );
		return is_array( $data ) && ! empty( $data['time'] ) ? $data : null;
	}

	/** Split a settings textarea into a clean list. */
	private static function list_of( $value ) {
		return array_values( array_filter( array_map( 'trim', preg_split( '/[\r\n,;]+/', (string) $value ) ), 'strlen' ) );
	}

	private static function contains( $haystack, array $needles ) {
		foreach ( $needles as $n ) {
			if ( '' !== $n && false !== stripos( $haystack, $n ) ) {
				return $n;
			}
		}
		return '';
	}

	/** Run the audit and store the result. */
	public static function run() {
		$s        = Lucy_Settings::content();
		$keywords = self::list_of( $s['primary_keywords'] );
		$places   = array_merge( self::list_of( $s['cities'] ), self::list_of( $s['locations'] ), self::list_of( $s['zip_codes'] ) );
		$now      = time();
		$year     = (int) wp_date( 'Y' );

		$posts = get_posts(
			array(
				'post_type'      => array( 'page', 'post' ),
				'post_status'    => 'publish',
				'posts_per_page' => self::MAX,
				'orderby'        => 'modified',
				'order'          => 'DESC',
			)
		);

		$pages       = array();
		$titles      = '';
		$recent_blog = 0;
		foreach ( $posts as $post ) {
			$content = (string) $post->post_content;
			$text    = trim( preg_replace( '/\s+/u', ' ', wp_strip_all_tags( function_exists( 'strip_shortcodes' ) ? strip_shortcodes( $content ) : $content ) ) );
			$words   = '' === $text ? 0 : count( preg_split( '/\s+/u', $text ) );
			$title   = (string) $post->post_title;
			$titles .= ' ' . $title . ' ' . $post->post_name;
			$id      = (int) $post->ID;
			$meta    = (string) get_post_meta( $id, '_yoast_wpseo_metadesc', true );
			$meta    = $meta ? $meta : (string) get_post_meta( $id, 'rank_math_description', true );
			$focus   = (string) get_post_meta( $id, '_yoast_wpseo_focuskw', true );
			$focus   = $focus ? $focus : (string) get_post_meta( $id, 'rank_math_focus_keyword', true );
			$mod     = strtotime( $post->post_modified_gmt ? $post->post_modified_gmt . ' UTC' : $post->post_modified );
			$months  = $mod ? floor( ( $now - $mod ) / ( 30 * DAY_IN_SECONDS ) ) : 0;
			if ( 'post' === $post->post_type && $months < 3 ) {
				$recent_blog++;
			}

			$issues = array();
			$score  = 100;
			$add    = function ( $severity, $label, $penalty ) use ( &$issues, &$score ) {
				$issues[] = array( $severity, $label );
				$score   -= $penalty;
			};
			if ( preg_match( '/lorem ipsum|consectetur adipiscing/i', $text ) ) {
				$add( 'high', __( 'Placeholder (lorem ipsum) text', 'lucy-ai-content' ), 30 );
			}
			$min = 'post' === $post->post_type ? 600 : 300;
			if ( $words < $min ) {
				/* translators: %d: number of words */
				$add( $words < 150 ? 'high' : 'medium', sprintf( __( 'Thin content (%d words)', 'lucy-ai-content' ), $words ), $words < 150 ? 25 : 12 );
			}
			if ( '' === trim( $meta ) && '' === trim( (string) $post->post_excerpt ) ) {
				$add( 'medium', __( 'No meta description', 'lucy-ai-content' ), 12 );
			}
			if ( $keywords && '' === $focus && '' === self::contains( $title . ' ' . $text, $keywords ) ) {
				$add( 'medium', __( 'Not targeting any primary keyword', 'lucy-ai-content' ), 15 );
			}
			if ( $places && 'page' === $post->post_type && '' === self::contains( $title . ' ' . $text, $places ) ) {
				$add( 'medium', __( 'No target city, area or ZIP mentioned', 'lucy-ai-content' ), 10 );
			}
			if ( $months >= 18 ) {
				/* translators: %d: months */
				$add( 'low', sprintf( __( 'Not updated in %d months', 'lucy-ai-content' ), $months ), 8 );
			}
			if ( preg_match_all( '/\b(20[0-9]{2})\b/', $title, $m ) ) {
				$max = max( array_map( 'intval', $m[1] ) );
				if ( $max > 2000 && $max < $year - 1 ) {
					/* translators: %d: year */
					$add( 'medium', sprintf( __( 'Title mentions %d – may be outdated', 'lucy-ai-content' ), $max ), 10 );
				}
			}
			$missing_alt = preg_match_all( '/<img(?![^>]*\balt="[^"]+")[^>]*>/i', $content );
			if ( $missing_alt ) {
				/* translators: %d: number of images */
				$add( 'low', sprintf( _n( '%d image without alt text', '%d images without alt text', $missing_alt, 'lucy-ai-content' ), $missing_alt ), 5 );
			}
			if ( $words >= 300 && ! preg_match( '/<h2|wp:heading/i', $content ) ) {
				$add( 'low', __( 'No H2 sub-headings', 'lucy-ai-content' ), 5 );
			}

			$pages[] = array(
				'id'     => $id,
				'title'  => $title ? $title : __( '(no title)', 'lucy-ai-content' ),
				'type'   => $post->post_type,
				'words'  => $words,
				'months' => (int) $months,
				'score'  => max( 0, $score ),
				'issues' => $issues,
			);
		}
		usort(
			$pages,
			function ( $a, $b ) {
				return $a['score'] - $b['score'];
			}
		);

		$gaps   = self::gaps( $s, $titles, $recent_blog, count( $posts ) );
		$avg    = $pages ? (int) round( array_sum( wp_list_pluck( $pages, 'score' ) ) / count( $pages ) ) : 0;
		$result = array(
			'time'   => $now,
			'score'  => max( 0, $avg - min( 30, 5 * count( $gaps ) ) ),
			'pages'  => $pages,
			'gaps'   => $gaps,
			'counts' => array(
				'pages'  => count( $pages ),
				'issues' => array_sum(
					array_map(
						function ( $p ) {
							return count( $p['issues'] );
						},
						$pages
					)
				),
				'gaps'   => count( $gaps ),
			),
		);
		update_option( self::OPTION, $result, false );
		return $result;
	}

	/** Missing content, based on what the business sells and where. */
	private static function gaps( array $s, $titles, $recent_blog, $total ) {
		$gaps   = array();
		$cities = self::list_of( $s['cities'] );
		$city   = $cities ? $cities[0] : '';
		$in     = $city ? ' in ' . $city : '';
		$depts  = (array) $s['departments'];
		$needs  = array(
			'used'      => array( array( 'used' ), 'location', 'Used Cars' . $in, 'used cars' . strtolower( $in ), __( 'You sell used vehicles but have no page targeting used-car searches.', 'lucy-ai-content' ) ),
			'new'       => array( array( 'new ' ), 'location', 'New Cars' . $in, 'new cars' . strtolower( $in ), __( 'You sell new vehicles but have no page targeting new-car searches.', 'lucy-ai-content' ) ),
			'certified' => array( array( 'certified', 'cpo' ), 'service', 'Certified Pre-Owned Vehicles', 'certified pre-owned', __( 'Certified pre-owned is a priority but has no page.', 'lucy-ai-content' ) ),
			'finance'   => array( array( 'financ', 'loan', 'credit' ), 'service', 'Car Finance' . $in, 'car finance' . strtolower( $in ), __( 'Finance is a priority but there is no finance page – a high-intent search.', 'lucy-ai-content' ) ),
			'trade'     => array( array( 'trade', 'sell your', 'we buy' ), 'service', 'Sell or Trade In Your Car' . $in, 'sell my car' . strtolower( $in ), __( 'Trade-ins are a priority but there is no trade-in / sell-your-car page.', 'lucy-ai-content' ) ),
			'service'   => array( array( 'service', 'repair', 'maintenance' ), 'service', 'Car Service & Repairs' . $in, 'car service' . strtolower( $in ), __( 'Service is a priority but there is no service page.', 'lucy-ai-content' ) ),
			'parts'     => array( array( 'parts', 'accessor' ), 'service', 'Parts & Accessories', 'car parts' . strtolower( $in ), __( 'Parts are a priority but there is no parts page.', 'lucy-ai-content' ) ),
			'specials'  => array( array( 'special', 'offer', 'deal' ), 'service', 'Current Specials & Offers', 'car deals' . strtolower( $in ), __( 'Specials are a priority but there is no offers page.', 'lucy-ai-content' ) ),
		);
		foreach ( $depts as $d ) {
			if ( isset( $needs[ $d ] ) && '' === self::contains( $titles, $needs[ $d ][0] ) ) {
				$gaps[] = array(
					'type'     => $needs[ $d ][1],
					'title'    => $needs[ $d ][2],
					'keyword'  => $needs[ $d ][3],
					'why'      => $needs[ $d ][4],
					'priority' => in_array( $d, array( 'used', 'new', 'finance' ), true ) ? 'high' : 'medium',
				);
			}
		}
		foreach ( array_slice( $cities, 0, 10 ) as $c ) {
			if ( '' === self::contains( $titles, array( $c ) ) ) {
				$kind   = in_array( 'used', $depts, true ) ? 'Used Cars' : ( $s['industry'] ? $s['industry'] : 'Car Dealer' );
				$gaps[] = array(
					'type'     => 'location',
					'title'    => $kind . ' in ' . $c,
					'keyword'  => strtolower( $kind ) . ' in ' . strtolower( $c ),
					/* translators: %s: city */
					'why'      => sprintf( __( '%s is a target city but no page targets it – you are missing local and “near me” searches there.', 'lucy-ai-content' ), $c ),
					'priority' => 'high',
				);
			}
		}
		foreach ( array_slice( self::list_of( $s['brands'] ), 0, 10 ) as $brand ) {
			if ( '' === self::contains( $titles, array( $brand ) ) ) {
				$gaps[] = array(
					'type'     => 'location',
					'title'    => $brand . ' Dealer' . $in,
					'keyword'  => strtolower( $brand ) . ' dealer' . strtolower( $in ),
					/* translators: %s: brand */
					'why'      => sprintf( __( 'You carry %s but have no page for people searching for that brand.', 'lucy-ai-content' ), $brand ),
					'priority' => 'medium',
				);
			}
		}
		if ( $total > 0 && $recent_blog < 2 ) {
			$gaps[] = array(
				'type'     => 'blog',
				'title'    => __( 'A helpful buying guide for your audience', 'lucy-ai-content' ),
				'keyword'  => '',
				'why'      => __( 'Fewer than 2 blog posts in the last 3 months. Regular helpful articles build search visibility and give social media something to share.', 'lucy-ai-content' ),
				'priority' => 'low',
			);
		}
		return $gaps;
	}

	public static function create_url( array $gap ) {
		return add_query_arg(
			array(
				'lucy_title'   => rawurlencode( $gap['title'] ),
				'lucy_keyword' => rawurlencode( $gap['keyword'] ),
			),
			admin_url( 'admin.php?page=' . Lucy_Admin::PAGE_GENERATE )
		);
	}
}
