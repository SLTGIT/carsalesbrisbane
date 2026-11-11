<?php
/**
 * Image templates: your own background picture + type settings.
 *
 * Lucy writes the post title onto the template and saves the result as the featured image.
 * This is deliberately separate from the writing: templates are managed in their own screen,
 * and an article can be written with or without one.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

/**
 * One-line list splitter shared by this file.
 *
 * @param string $value Lines or comma separated text.
 * @return string[]
 */
function splitlist_helper( $value ) {
	return array_values( array_filter( array_map( 'trim', preg_split( '/[\r\n,]+/', (string) $value ) ) ) );
}

class Lucy_Images {

	const OPTION = 'lucy_image_templates';

	public static function init() {
		add_filter( 'upload_mimes', array( __CLASS__, 'allow_fonts' ) );
		add_filter( 'wp_check_filetype_and_ext', array( __CLASS__, 'check_font_type' ), 10, 4 );
		add_filter( 'attachment_fields_to_edit', array( __CLASS__, 'font_field' ), 10, 2 );
		add_filter( 'attachment_fields_to_save', array( __CLASS__, 'save_font_field' ), 10, 2 );
	}

	/** Lets administrators upload a font file for their templates. */
	public static function allow_fonts( $mimes ) {
		if ( current_user_can( 'manage_options' ) ) {
			$mimes['ttf'] = 'font/ttf';
			$mimes['otf'] = 'font/otf';
		}
		return $mimes;
	}

	public static function check_font_type( $data, $file, $filename, $mimes ) {
		if ( preg_match( '/\.(ttf|otf)$/i', (string) $filename ) && current_user_can( 'manage_options' ) ) {
			$data['ext']  = strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) );
			$data['type'] = 'ttf' === $data['ext'] ? 'font/ttf' : 'font/otf';
		}
		return $data;
	}

	/** A “Use as a Lucy font” tick box on font files in the Media Library. */
	public static function font_field( $fields, $post ) {
		if ( ! preg_match( '/\.(ttf|otf)$/i', (string) get_attached_file( $post->ID ) ) ) {
			return $fields;
		}
		$checked           = get_post_meta( $post->ID, '_lucy_font', true ) ? 'checked' : '';
		$fields['lucy_font'] = array(
			'label' => __( 'Lucy', 'lucy-ai-content' ),
			'input' => 'html',
			'html'  => '<label><input type="checkbox" name="attachments[' . (int) $post->ID . '][lucy_font]" value="1" ' . $checked . '> ' . esc_html__( 'Use as a Lucy font', 'lucy-ai-content' ) . '</label>',
		);
		return $fields;
	}

	public static function save_font_field( $post, $attachment ) {
		if ( isset( $attachment['lucy_font'] ) && $attachment['lucy_font'] ) {
			update_post_meta( $post['ID'], '_lucy_font', 1 );
		} else {
			delete_post_meta( $post['ID'], '_lucy_font' );
		}
		return $post;
	}

	/** Fonts that ship with Lucy, plus any the user uploaded. */
	public static function fonts() {
		$fonts = array(
			'poppins-bold'    => array( 'label' => 'Poppins Bold', 'file' => LUCY_DIR . 'assets/fonts/Poppins-Bold.ttf' ),
			'poppins-regular' => array( 'label' => 'Poppins Regular', 'file' => LUCY_DIR . 'assets/fonts/Poppins-Regular.ttf' ),
			'dejavu-serif'    => array( 'label' => 'DejaVu Serif Bold', 'file' => LUCY_DIR . 'assets/fonts/DejaVuSerif-Bold.ttf' ),
		);
		foreach ( self::uploaded_fonts() as $id => $font ) {
			$fonts[ $id ] = $font;
		}
		return apply_filters( 'lucy_image_fonts', $fonts );
	}

	/** Font files the user uploaded through the Media Library (.ttf / .otf). */
	public static function uploaded_fonts() {
		$out   = array();
		$files = get_posts(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'posts_per_page' => 30,
				'meta_key'       => '_lucy_font', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => '1', // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		foreach ( $files as $file ) {
			$path = get_attached_file( $file->ID );
			if ( $path && file_exists( $path ) ) {
				$out[ 'upload-' . $file->ID ] = array(
					'label' => $file->post_title ? $file->post_title : basename( $path ),
					'file'  => $path,
				);
			}
		}
		return $out;
	}

	public static function font_file( $key ) {
		$fonts = self::fonts();
		if ( isset( $fonts[ $key ] ) && file_exists( $fonts[ $key ]['file'] ) ) {
			return $fonts[ $key ]['file'];
		}
		return LUCY_DIR . 'assets/fonts/Poppins-Bold.ttf';
	}

	/** Sizes Lucy produces. */
	const FEATURED_W = 1200;
	const FEATURED_H = 630;
	const THUMB      = 600;

	/**
	 * Ready-made layouts, drawn from the brand colours and logo in your Growth profile.
	 * Someone with no designer can pick one and have usable blog images in a minute.
	 */
	public static function presets() {
		return array(
			'hero-ai'    => array(
				'label'       => __( 'Dealer hero – Lucy makes the photo', 'lucy-ai-content' ),
				'description' => __( 'A real-looking photo of the vehicle the article is about, your logo in a white badge, the headline in caps with your city highlighted, and a strapline underneath.', 'lucy-ai-content' ),
				'settings'    => array(
					'background' => 'ai', 'scrim' => 'light', 'scrim_strength' => 74, 'font' => 'poppins-bold', 'font_size' => 58, 'uppercase' => 1,
					'align' => 'left', 'valign' => 'middle', 'box_x' => 5, 'box_y' => 12, 'box_w' => 48, 'line_height' => 118, 'max_lines' => 4,
					'colour' => '#12161d', 'use_brand' => 0, 'highlight' => 1, 'rule' => 1, 'logo_badge' => 1, 'show_logo' => 1, 'logo_pos' => 'tl',
					'overlay' => 0, 'shadow' => 0, 'motif' => 0, 'thumbnail' => 1,
				),
			),
			'hero-photo' => array(
				'label'       => __( 'Dealer hero – my photo', 'lucy-ai-content' ),
				'description' => __( 'The same layout using a photo you upload: logo badge, big headline with a highlighted word, rule and strapline.', 'lucy-ai-content' ),
				'settings'    => array(
					'background' => 'image', 'scrim' => 'light', 'scrim_strength' => 74, 'font' => 'poppins-bold', 'font_size' => 58, 'uppercase' => 1,
					'align' => 'left', 'valign' => 'middle', 'box_x' => 5, 'box_y' => 12, 'box_w' => 48, 'line_height' => 118, 'max_lines' => 4,
					'colour' => '#12161d', 'use_brand' => 0, 'highlight' => 1, 'rule' => 1, 'logo_badge' => 1, 'show_logo' => 1, 'logo_pos' => 'tl',
					'overlay' => 0, 'shadow' => 0, 'motif' => 0, 'thumbnail' => 1,
				),
			),
			'hero-dark'  => array(
				'label'       => __( 'Dealer hero – dark', 'lucy-ai-content' ),
				'description' => __( 'Photo darkened behind white type, logo badge top-left, highlighted word in your brand colour. Good for night or busy photos.', 'lucy-ai-content' ),
				'settings'    => array(
					'background' => 'ai', 'scrim' => 'dark', 'scrim_strength' => 78, 'font' => 'poppins-bold', 'font_size' => 58, 'uppercase' => 1,
					'align' => 'left', 'valign' => 'middle', 'box_x' => 5, 'box_y' => 12, 'box_w' => 50, 'line_height' => 118, 'max_lines' => 4,
					'colour' => '#ffffff', 'use_brand' => 0, 'highlight' => 1, 'rule' => 1, 'logo_badge' => 1, 'show_logo' => 1, 'logo_pos' => 'tl',
					'overlay' => 12, 'shadow' => 0, 'motif' => 0, 'thumbnail' => 1,
				),
			),
		);
	}

	/** Every saved template. */
	public static function all() {
		$list = get_option( self::OPTION, array() );
		return is_array( $list ) ? $list : array();
	}

	public static function get( $id ) {
		$all = self::all();
		return isset( $all[ $id ] ) ? $all[ $id ] : null;
	}

	public static function defaults() {
		return array(
			'background'  => 'image',
			'scrim'       => 'light',
			'scrim_strength' => 70,
			'logo_badge'  => 1,
			'highlight'   => 1,
			'highlight_colour' => '#0f6b6b',
			'highlight_text'   => '#ffd23f',
			'rule'        => 1,
			'subtitle'    => '',
			'subtitle_size' => 22,
			'motif'       => 0,
			'motif_side'  => 'right',
			'panel'       => 0,
			'use_brand'   => 1,
			'band'        => 0,
			'show_logo'   => 1,
			'logo_pos'    => 'tl',
			'logo_size'   => 16,
			'thumbnail'   => 1,
			'cover'       => 0,
			'cover_x'     => 0,
			'cover_y'     => 0,
			'cover_w'     => 0,
			'cover_h'     => 0,
			'learned'     => 0,
			'name'        => __( 'New template', 'lucy-ai-content' ),
			'image_id'    => 0,
			'font'        => 'poppins-bold',
			'font_size'   => 64,
			'colour'      => '#ffffff',
			'align'       => 'left',
			'valign'      => 'bottom',
			'box_x'       => 8,
			'box_y'       => 8,
			'box_w'       => 62,
			'line_height' => 128,
			'uppercase'   => 0,
			'shadow'      => 1,
			'overlay'     => 35,
			'max_lines'   => 4,
		);
	}

	/** Saves (or creates) one template and returns its id. */
	public static function save( $id, array $raw ) {
		$all = self::all();
		$t   = array_merge( self::defaults(), isset( $all[ $id ] ) ? $all[ $id ] : array() );

		$t['name']        = isset( $raw['name'] ) ? sanitize_text_field( wp_unslash( $raw['name'] ) ) : $t['name'];
		$t['image_id']    = isset( $raw['image_id'] ) ? absint( $raw['image_id'] ) : $t['image_id'];
		$t['font']        = isset( $raw['font'] ) && isset( self::fonts()[ sanitize_key( $raw['font'] ) ] ) ? sanitize_key( $raw['font'] ) : $t['font'];
		$t['font_size']   = isset( $raw['font_size'] ) ? min( 220, max( 14, absint( $raw['font_size'] ) ) ) : $t['font_size'];
		$t['colour']      = isset( $raw['colour'] ) && preg_match( '/^#[0-9a-f]{6}$/i', $raw['colour'] ) ? strtolower( $raw['colour'] ) : $t['colour'];
		$t['align']       = isset( $raw['align'] ) && in_array( $raw['align'], array( 'left', 'center', 'right' ), true ) ? $raw['align'] : $t['align'];
		$t['valign']      = isset( $raw['valign'] ) && in_array( $raw['valign'], array( 'top', 'middle', 'bottom' ), true ) ? $raw['valign'] : $t['valign'];
		$t['box_x']       = isset( $raw['box_x'] ) ? min( 90, max( 0, absint( $raw['box_x'] ) ) ) : $t['box_x'];
		$t['box_y']       = isset( $raw['box_y'] ) ? min( 90, max( 0, absint( $raw['box_y'] ) ) ) : $t['box_y'];
		$t['box_w']       = isset( $raw['box_w'] ) ? min( 100, max( 10, absint( $raw['box_w'] ) ) ) : $t['box_w'];
		$t['line_height'] = isset( $raw['line_height'] ) ? min( 250, max( 90, absint( $raw['line_height'] ) ) ) : $t['line_height'];
		$t['uppercase']   = empty( $raw['uppercase'] ) ? 0 : 1;
		$t['shadow']      = empty( $raw['shadow'] ) ? 0 : 1;
		$t['overlay']     = isset( $raw['overlay'] ) ? min( 85, max( 0, absint( $raw['overlay'] ) ) ) : $t['overlay'];
		$t['max_lines']   = isset( $raw['max_lines'] ) ? min( 6, max( 1, absint( $raw['max_lines'] ) ) ) : $t['max_lines'];
		$t['background']  = isset( $raw['background'] ) && in_array( $raw['background'], array( 'brand', 'image', 'ai' ), true ) ? $raw['background'] : 'image';
		$t['motif']       = empty( $raw['motif'] ) ? 0 : 1;
		$t['scrim']       = isset( $raw['scrim'] ) && in_array( $raw['scrim'], array( 'none', 'light', 'dark' ), true ) ? $raw['scrim'] : $t['scrim'];
		$t['scrim_strength'] = isset( $raw['scrim_strength'] ) ? min( 100, max( 0, absint( $raw['scrim_strength'] ) ) ) : $t['scrim_strength'];
		$t['logo_badge']  = empty( $raw['logo_badge'] ) ? 0 : 1;
		$t['highlight']   = empty( $raw['highlight'] ) ? 0 : 1;
		$t['rule']        = empty( $raw['rule'] ) ? 0 : 1;
		$t['subtitle']    = isset( $raw['subtitle'] ) ? Lucy_Settings::clip( sanitize_text_field( $raw['subtitle'] ), 90 ) : $t['subtitle'];
		$t['subtitle_size'] = isset( $raw['subtitle_size'] ) ? min( 60, max( 10, absint( $raw['subtitle_size'] ) ) ) : $t['subtitle_size'];
		foreach ( array( 'highlight_colour', 'highlight_text' ) as $key ) {
			if ( isset( $raw[ $key ] ) && preg_match( '/^#[0-9a-f]{6}$/i', (string) $raw[ $key ] ) ) {
				$t[ $key ] = strtolower( $raw[ $key ] );
			}
		}
		$t['motif_side']  = isset( $raw['motif_side'] ) && 'left' === $raw['motif_side'] ? 'left' : 'right';
		$t['panel']       = empty( $raw['panel'] ) ? 0 : 1;
		$t['use_brand']   = empty( $raw['use_brand'] ) ? 0 : 1;
		$t['band']        = empty( $raw['band'] ) ? 0 : 1;
		$t['show_logo']   = empty( $raw['show_logo'] ) ? 0 : 1;
		$t['logo_pos']    = isset( $raw['logo_pos'] ) && in_array( $raw['logo_pos'], array( 'tl', 'tr', 'bl', 'br' ), true ) ? $raw['logo_pos'] : $t['logo_pos'];
		$t['logo_size']   = isset( $raw['logo_size'] ) ? min( 40, max( 5, absint( $raw['logo_size'] ) ) ) : $t['logo_size'];
		$t['thumbnail']   = empty( $raw['thumbnail'] ) ? 0 : 1;
		$t['cover']       = empty( $raw['cover'] ) ? 0 : 1;
		foreach ( array( 'cover_x', 'cover_y', 'cover_w', 'cover_h' ) as $key ) {
			$t[ $key ] = isset( $raw[ $key ] ) ? min( 100, max( 0, (float) $raw[ $key ] ) ) : $t[ $key ];
		}
		$t['learned'] = empty( $raw['learned'] ) ? 0 : 1;

		$all        = self::all();
		$id         = $id ? sanitize_key( $id ) : 'tpl-' . substr( md5( microtime() . wp_rand() ), 0, 8 );
		$all[ $id ] = $t;
		update_option( self::OPTION, $all, false );
		return $id;
	}

	public static function delete( $id ) {
		$all = self::all();
		unset( $all[ sanitize_key( $id ) ] );
		update_option( self::OPTION, $all, false );
	}

	/**
	 * Reads a reference picture that already has a title on it.
	 *
	 * Finds where the title sits, what colour it is and how it is aligned, so Lucy can
	 * cover those words and write the new title in exactly the same place.
	 *
	 * @param int $attachment_id Picture in the Media Library.
	 * @return array|WP_Error Template settings to fill in.
	 */
	public static function analyse( $attachment_id ) {
		$path = get_attached_file( (int) $attachment_id );
		if ( ! $path || ! file_exists( $path ) ) {
			return new WP_Error( 'lucy_tpl_image', __( 'Choose a picture first.', 'lucy-ai-content' ) );
		}
		$img = self::open( $path );
		if ( is_wp_error( $img ) ) {
			return $img;
		}
		$w = imagesx( $img );
		$h = imagesy( $img );

		// Work on a small copy: fast, and it ignores photo grain.
		$sw    = 240;
		$sh    = max( 1, (int) round( $h * ( $sw / $w ) ) );
		$small = imagecreatetruecolor( $sw, $sh );
		imagecopyresampled( $small, $img, 0, 0, 0, 0, $sw, $sh, $w, $h );
		imagedestroy( $img );

		$marks = self::edge_map( $small, $sw, $sh );
		imagedestroy( $small );
		if ( ! $marks['pixels'] ) {
			return new WP_Error( 'lucy_tpl_notext', __( 'Lucy could not find a title on that picture. Set the position by hand, or use a picture where the title is clearly readable.', 'lucy-ai-content' ) );
		}

		// A headline usually sits on one side of a photo, so look at the left half, the right half
		// and the whole picture, and keep the best candidate.
		$best = null;
		foreach ( array( array( 0, (int) round( $sw * 0.58 ) ), array( (int) round( $sw * 0.42 ), $sw ), array( 0, $sw ) ) as $range ) {
			$found = self::text_block( $marks, $sw, $sh, $range[0], $range[1] );
			if ( $found && ( ! $best || $found['score'] > $best['score'] ) ) {
				$best = $found;
			}
		}
		if ( ! $best ) {
			return new WP_Error( 'lucy_tpl_notext', __( 'Lucy could not pick out a title on that picture – the photo is too busy. Set the cover box by hand if you need one.', 'lucy-ai-content' ) );
		}

		$top   = $best['top'];
		$bot   = $best['bottom'];
		$left  = $best['left'];
		$right = $best['right'];
		$lines = $best['lines'];
		$box_h = max( 1, $bot - $top );
		$line_h = $box_h / max( 1, $lines );

		$pct = function ( $value, $of ) {
			return max( 0, min( 100, round( $value / $of * 100, 1 ) ) );
		};
		$left_pct  = $pct( $left, $sw );
		$right_pct = 100 - $pct( $right, $sw );
		$align     = 'left';
		if ( abs( $left_pct - $right_pct ) < 6 ) {
			$align = 'center';
		} elseif ( $right_pct < $left_pct - 6 ) {
			$align = 'right';
		}
		$middle = ( $top + $bot ) / 2 / $sh;
		$valign = 'middle';
		if ( $middle < 0.38 ) {
			$valign = 'top';
		} elseif ( $middle > 0.62 ) {
			$valign = 'bottom';
		}

		$cr = $best['r'];
		$cg = $best['g'];
		$cb = $best['b'];
		$cl = 0.2126 * $cr + 0.7152 * $cg + 0.0722 * $cb;
		if ( $cl > 195 ) {
			$cr = 255;
			$cg = 255;
			$cb = 255; // Near-white type is white.
		} elseif ( $cl < 55 ) {
			$cr = 17;
			$cg = 17;
			$cb = 17; // Near-black type is black.
		}
		$colour = sprintf( '#%02x%02x%02x', $cr, $cg, $cb );

		$size = (int) round( ( $line_h / $sh ) * $h * 0.86 * ( 1200 / $w ) );
		$size = min( 220, max( 18, $size ) );

		$pad_x = max( 1.0, ( $right - $left ) * 0.03 / $sw * 100 );
		$pad_y = max( 1.5, $box_h * 0.26 / $sh * 100 );

		$found = array(
			'font_size'   => $size,
			'colour'      => $colour,
			'align'       => $align,
			'valign'      => $valign,
			'box_x'       => 'right' === $align ? max( 0, 100 - $pct( $right, $sw ) ) : $left_pct,
			'box_y'       => 'bottom' === $valign ? max( 0, 100 - $pct( $bot, $sh ) ) : $pct( $top, $sh ),
			'box_w'       => max( 20, $pct( $right - $left, $sw ) + 4 ),
			'max_lines'   => min( 6, max( 1, $lines + 1 ) ),
			'line_height' => 120,
			'cover'       => 1,
			'cover_x'     => max( 0, $left_pct - $pad_x ),
			'cover_y'     => max( 0, $pct( $top, $sh ) - $pad_y ),
			'cover_w'     => min( 100, $pct( $right - $left, $sw ) + $pad_x * 2 ),
			'cover_h'     => min( 100, $pct( $box_h, $sh ) + $pad_y * 2 ),
			'learned'     => 1,
			'lines'       => $lines,
		);
		$found['cover'] = self::can_cover( $attachment_id, $found ) ? 1 : 0;
		return $found;
	}

	/** Marks the pixels that stand out from their surroundings – type does, sky does not. */
	private static function edge_map( $small, $sw, $sh ) {
		$lum   = array();
		$total = 0;
		for ( $y = 0; $y < $sh; $y++ ) {
			for ( $x = 0; $x < $sw; $x++ ) {
				$rgb             = imagecolorat( $small, $x, $y );
				$lum[ $y ][ $x ] = ( 0.2126 * ( ( $rgb >> 16 ) & 255 ) + 0.7152 * ( ( $rgb >> 8 ) & 255 ) + 0.0722 * ( $rgb & 255 ) );
				$total          += $lum[ $y ][ $x ];
			}
		}
		$mean   = $total / ( $sw * $sh );
		$marks  = array();
		$colours = array();
		$count  = 0;
		for ( $y = 1; $y < $sh - 1; $y++ ) {
			for ( $x = 1; $x < $sw - 1; $x++ ) {
				$here = $lum[ $y ][ $x ];
				$edge = abs( $here - $lum[ $y ][ $x - 1 ] ) + abs( $here - $lum[ $y ][ $x + 1 ] )
					+ abs( $here - $lum[ $y - 1 ][ $x ] ) + abs( $here - $lum[ $y + 1 ][ $x ] );
				if ( $edge > 150 && abs( $here - $mean ) > 45 ) {
					$marks[ $y ][ $x ]   = 1;
					$colours[ $y ][ $x ] = imagecolorat( $small, $x, $y );
					$count++;
				}
			}
		}
		return array(
			'marks'   => $marks,
			'colours' => $colours,
			'pixels'  => $count,
		);
	}

	/**
	 * Finds the strongest block of type inside a slice of the picture.
	 *
	 * @param array $marks Edge map.
	 * @param int   $sw    Small width.
	 * @param int   $sh    Small height.
	 * @param int   $from  Left edge of the slice.
	 * @param int   $to    Right edge of the slice.
	 * @return array|null
	 */
	private static function text_block( array $marks, $sw, $sh, $from, $to ) {
		$slice_w = max( 1, $to - $from );
		$rows    = array();
		foreach ( $marks['marks'] as $y => $cols ) {
			$xs = array();
			foreach ( array_keys( $cols ) as $x ) {
				if ( $x >= $from && $x < $to ) {
					$xs[] = $x;
				}
			}
			$count = count( $xs );
			// A line of type lights up part of the row, not all of it.
			if ( $count >= max( 4, (int) round( $slice_w * 0.06 ) ) && $count <= (int) round( $slice_w * 0.8 ) ) {
				sort( $xs );
				$rows[ $y ] = $xs;
			}
		}
		if ( ! $rows ) {
			return null;
		}
		// Group rows into bands and keep the strongest one.
		$bands   = array();
		$current = null;
		$prev    = null;
		foreach ( array_keys( $rows ) as $y ) {
			if ( null === $prev || $y - $prev > max( 3, (int) round( $sh * 0.035 ) ) ) {
				if ( $current ) {
					$bands[] = $current;
				}
				$current = array( 'rows' => array(), 'score' => 0 );
			}
			$current['rows'][] = $y;
			$current['score'] += count( $rows[ $y ] );
			$prev              = $y;
		}
		if ( $current ) {
			$bands[] = $current;
		}
		usort(
			$bands,
			function ( $a, $b ) {
				return $b['score'] - $a['score'];
			}
		);
		$band = $bands[0];

		// A headline is several lines with gaps between them: pull in the neighbouring bands
		// that sit in the same column, so the whole block is found, not one line of it.
		$block_left  = $sw;
		$block_right = 0;
		foreach ( $band['rows'] as $y ) {
			$block_left  = min( $block_left, min( $rows[ $y ] ) );
			$block_right = max( $block_right, max( $rows[ $y ] ) );
		}
		$line_gap = max( 4, (int) round( ( max( $band['rows'] ) - min( $band['rows'] ) + 1 ) * 2.2 ) );
		$changed  = true;
		while ( $changed ) {
			$changed = false;
			foreach ( $bands as $i => $other ) {
				if ( $other === $band || empty( $other['rows'] ) ) {
					continue;
				}
				$o_top    = min( $other['rows'] );
				$o_bottom = max( $other['rows'] );
				$b_top    = min( $band['rows'] );
				$b_bottom = max( $band['rows'] );
				$gap      = $o_top > $b_bottom ? $o_top - $b_bottom : ( $b_top > $o_bottom ? $b_top - $o_bottom : 0 );
				if ( $gap > $line_gap ) {
					continue;
				}
				$o_left  = $sw;
				$o_right = 0;
				foreach ( $other['rows'] as $y ) {
					$o_left  = min( $o_left, min( $rows[ $y ] ) );
					$o_right = max( $o_right, max( $rows[ $y ] ) );
				}
				// Same column of the picture?
				$overlap = min( $block_right, $o_right ) - max( $block_left, $o_left );
				if ( $overlap < ( $block_right - $block_left ) * 0.25 ) {
					continue;
				}
				$band['rows']  = array_merge( $band['rows'], $other['rows'] );
				$band['score'] += $other['score'];
				$block_left    = min( $block_left, $o_left );
				$block_right   = max( $block_right, $o_right );
				$bands[ $i ]   = array( 'rows' => array(), 'score' => 0 );
				$changed       = true;
			}
		}
		sort( $band['rows'] );

		// Extents, ignoring stray marks at the edges.
		$all = array();
		foreach ( $band['rows'] as $y ) {
			$all = array_merge( $all, $rows[ $y ] );
		}
		sort( $all );
		$left  = $all[ (int) floor( count( $all ) * 0.03 ) ];
		$right = $all[ (int) min( count( $all ) - 1, floor( count( $all ) * 0.97 ) ) ];
		$top   = min( $band['rows'] );
		$bot   = max( $band['rows'] );
		$box_h = max( 1, $bot - $top );
		if ( ( $right - $left ) > $sw * 0.72 || $box_h > $sh * 0.5 || ( $right - $left ) < $sw * 0.08 ) {
			return null; // That is the photo, not a headline.
		}

		$lines = 1;
		$prev  = null;
		foreach ( $band['rows'] as $y ) {
			if ( null !== $prev && $y - $prev > max( 2, (int) round( $sh * 0.015 ) ) ) {
				$lines++;
			}
			$prev = $y;
		}

		$r = 0;
		$g = 0;
		$b = 0;
		$n = 0;
		foreach ( $band['rows'] as $y ) {
			foreach ( $rows[ $y ] as $x ) {
				if ( isset( $marks['colours'][ $y ][ $x ] ) ) {
					$rgb = $marks['colours'][ $y ][ $x ];
					$r  += ( $rgb >> 16 ) & 255;
					$g  += ( $rgb >> 8 ) & 255;
					$b  += $rgb & 255;
					$n++;
				}
			}
		}
		if ( $n < 30 ) {
			return null;
		}
		return array(
			'score'  => $band['score'],
			'top'    => $top,
			'bottom' => $bot,
			'left'   => $left,
			'right'  => $right,
			'lines'  => $lines,
			'r'      => (int) ( $r / $n ),
			'g'      => (int) ( $g / $n ),
			'b'      => (int) ( $b / $n ),
		);
	}

	/** Opens a picture file as a GD image. */	/** Opens a picture file as a GD image. */
	private static function open( $path ) {
		$info = @getimagesize( $path );
		if ( ! $info ) {
			return new WP_Error( 'lucy_tpl_image', __( 'Lucy could not open that picture.', 'lucy-ai-content' ) );
		}
		$img = null;
		if ( IMAGETYPE_JPEG === $info[2] ) {
			$img = @imagecreatefromjpeg( $path );
		} elseif ( IMAGETYPE_PNG === $info[2] ) {
			$img = @imagecreatefrompng( $path );
		} elseif ( defined( 'IMAGETYPE_WEBP' ) && IMAGETYPE_WEBP === $info[2] && function_exists( 'imagecreatefromwebp' ) ) {
			$img = @imagecreatefromwebp( $path );
		}
		if ( ! $img ) {
			return new WP_Error( 'lucy_tpl_image', __( 'The picture must be a JPEG, PNG or WebP file.', 'lucy-ai-content' ) );
		}
		imagealphablending( $img, true );
		imagesavealpha( $img, true );
		return $img;
	}

	/**
	 * Hides the old title: fills its box with the background from just above and below it, then softens the join.
	 *
	 * @param resource|GdImage $img Image being drawn on.
	 * @param array            $t   Template settings.
	 * @return void
	 */
	private static function cover_old_text( $img, array $t ) {
		$w  = imagesx( $img );
		$h  = imagesy( $img );
		$x  = (int) round( $w * ( (float) $t['cover_x'] / 100 ) );
		$y  = (int) round( $h * ( (float) $t['cover_y'] / 100 ) );
		$bw = (int) round( $w * ( (float) $t['cover_w'] / 100 ) );
		$bh = (int) round( $h * ( (float) $t['cover_h'] / 100 ) );
		if ( $bw < 4 || $bh < 4 ) {
			return;
		}
		$x  = max( 0, min( $w - 1, $x ) );
		$y  = max( 0, min( $h - 1, $y ) );
		$bw = min( $bw, $w - $x );
		$bh = min( $bh, $h - $y );

		// Read a clean row just above and just below the old title, then fade one into the other.
		// On a sky, a gradient or a plain panel this is invisible.
		$above   = max( 0, $y - 2 );
		$below   = min( $h - 1, $y + $bh + 2 );
		$top_row = array();
		$bot_row = array();
		for ( $i = 0; $i < $bw; $i++ ) {
			$top_row[ $i ] = imagecolorat( $img, $x + $i, $above );
			$bot_row[ $i ] = imagecolorat( $img, $x + $i, $below );
		}
		for ( $row = 0; $row < $bh; $row++ ) {
			$mix = $bh > 1 ? $row / ( $bh - 1 ) : 0;
			for ( $i = 0; $i < $bw; $i++ ) {
				$a  = $top_row[ $i ];
				$b  = $bot_row[ $i ];
				$r  = (int) round( ( ( ( $a >> 16 ) & 255 ) * ( 1 - $mix ) ) + ( ( ( $b >> 16 ) & 255 ) * $mix ) );
				$g  = (int) round( ( ( ( $a >> 8 ) & 255 ) * ( 1 - $mix ) ) + ( ( ( $b >> 8 ) & 255 ) * $mix ) );
				$bl = (int) round( ( ( $a & 255 ) * ( 1 - $mix ) ) + ( ( $b & 255 ) * $mix ) );
				imagesetpixel( $img, $x + $i, $y + $row, imagecolorallocate( $img, $r, $g, $bl ) );
			}
		}

		// Soften the patch and feather its edges so no rectangle shows.
		$pad   = max( 4, (int) round( min( $bw, $bh ) * 0.12 ) );
		$fx    = max( 0, $x - $pad );
		$fy    = max( 0, $y - $pad );
		$fw    = min( $w - $fx, $bw + $pad * 2 );
		$fh    = min( $h - $fy, $bh + $pad * 2 );
		$patch = imagecreatetruecolor( $fw, $fh );
		imagecopy( $patch, $img, 0, 0, $fx, $fy, $fw, $fh );
		for ( $i = 0; $i < 4; $i++ ) {
			imagefilter( $patch, IMG_FILTER_GAUSSIAN_BLUR );
		}
		for ( $row = 0; $row < $fh; $row++ ) {
			$edge  = min( $row, $fh - 1 - $row ) / max( 1, $pad );
			$alpha = (int) round( max( 0, min( 1, $edge ) ) * 100 );
			if ( $alpha > 0 ) {
				imagecopymerge( $img, $patch, $fx, $fy + $row, 0, $row, $fw, 1, $alpha );
			}
		}
		imagedestroy( $patch );
	}

	/**
	 * Can the old title be covered without wrecking the photo?
	 *
	 * Covering works by rebuilding the background from the rows above and below the words. That is
	 * invisible on a sky, a gradient or a plain panel, and obvious on a photo full of detail – so
	 * Lucy checks first and says so rather than smearing someone's picture.
	 *
	 * @param int   $attachment_id Picture.
	 * @param array $box           cover_x / cover_y / cover_w / cover_h as percentages.
	 * @return bool
	 */
	public static function can_cover( $attachment_id, array $box ) {
		$path = get_attached_file( (int) $attachment_id );
		if ( ! $path || ! file_exists( $path ) ) {
			return false;
		}
		$img = self::open( $path );
		if ( is_wp_error( $img ) ) {
			return false;
		}
		$w = imagesx( $img );
		$h = imagesy( $img );
		$x = (int) round( $w * ( (float) $box['cover_x'] / 100 ) );
		$y = (int) round( $h * ( (float) $box['cover_y'] / 100 ) );
		$bw = (int) round( $w * ( (float) $box['cover_w'] / 100 ) );
		$bh = (int) round( $h * ( (float) $box['cover_h'] / 100 ) );

		// How much detail is in the rows Lucy would copy from, and are those two rows alike?
		$rows  = array( max( 0, $y - 3 ), min( $h - 1, $y + $bh + 3 ) );
		$means = array();
		$steps = 0;
		$jumps = 0;
		foreach ( $rows as $row ) {
			$sum = array( 0, 0, 0, 0 );
			$last = null;
			for ( $i = 0; $i < $bw; $i += 3 ) {
				$px = min( $w - 1, $x + $i );
				$rgb = imagecolorat( $img, $px, $row );
				$lum = 0.2126 * ( ( $rgb >> 16 ) & 255 ) + 0.7152 * ( ( $rgb >> 8 ) & 255 ) + 0.0722 * ( $rgb & 255 );
				if ( null !== $last ) {
					$steps++;
					if ( abs( $lum - $last ) > 14 ) {
						$jumps++;
					}
				}
				$last    = $lum;
				$sum[0] += ( $rgb >> 16 ) & 255;
				$sum[1] += ( $rgb >> 8 ) & 255;
				$sum[2] += $rgb & 255;
				$sum[3]++;
			}
			$means[] = $sum[3] ? array( $sum[0] / $sum[3], $sum[1] / $sum[3], $sum[2] / $sum[3] ) : array( 0, 0, 0 );
		}
		imagedestroy( $img );
		if ( ! $steps || count( $means ) < 2 ) {
			return false;
		}
		// Rebuilding fades the row above into the row below. If those are different scenes
		// (sky above, road below), the result would be a smear, so Lucy declines.
		$distance = sqrt(
			pow( $means[0][0] - $means[1][0], 2 ) + pow( $means[0][1] - $means[1][1], 2 ) + pow( $means[0][2] - $means[1][2], 2 )
		);
		return ( $jumps / $steps ) < 0.18 && $distance < 60;
	}

	/**
	 * Draws the title onto the template and returns the files.	/**
	 * Draws the title onto the template and returns the files.
	 *
	 * @param array  $t        Template settings.
	 * @param string $title    Post title.
	 * @param string $keywords Target keywords (used for the artwork and the highlighted word).
	 * @param string $subtitle Strapline under the headline.
	 * @return array|WP_Error
	 */
	public static function compose( array $t, $title, $keywords = '', $subtitle = '' ) {
		if ( ! function_exists( 'imagecreatetruecolor' ) || ! function_exists( 'imagettftext' ) ) {
			return new WP_Error( 'lucy_gd', __( 'This server cannot draw text on images (the PHP GD extension with FreeType is missing). Ask your host to enable it.', 'lucy-ai-content' ) );
		}
		$img = self::render( $t, $title, self::FEATURED_W, self::FEATURED_H, $keywords, $subtitle );
		if ( is_wp_error( $img ) ) {
			return $img;
		}
		$tmp = wp_tempnam( 'lucy-featured.jpg' );
		imagejpeg( $img, $tmp, 88 );
		imagedestroy( $img );

		// The square version is drawn again at its own size, so the title fits instead of being cropped.
		$thumb_path = '';
		if ( ! empty( $t['thumbnail'] ) ) {
			$square = self::render( $t, $title, self::THUMB, self::THUMB, $keywords, $subtitle );
			if ( ! is_wp_error( $square ) ) {
				$thumb_path = wp_tempnam( 'lucy-thumb.jpg' );
				imagejpeg( $square, $thumb_path, 88 );
				imagedestroy( $square );
			}
		}
		return array(
			'path'   => $tmp,
			'thumb'  => $thumb_path,
			'width'  => self::FEATURED_W,
			'height' => self::FEATURED_H,
		);
	}

	private static function render( array $t, $title, $w, $h, $keywords = '', $subtitle = '' ) {
		$brand = self::brand();

		if ( 'brand' === $t['background'] ) {
			$img = self::brand_background( $w, $h, $brand );
		} else {
			$path = $t['image_id'] ? get_attached_file( $t['image_id'] ) : '';
			if ( ! $path || ! file_exists( $path ) ) {
				if ( 'ai' === $t['background'] ) {
					return new WP_Error( 'lucy_tpl_no_photo', __( 'Lucy has not made the photo for this article yet.', 'lucy-ai-content' ) );
				}
				return new WP_Error( 'lucy_tpl_image', __( 'This template has no background picture yet. Edit it and choose one, or switch it to your brand colours.', 'lucy-ai-content' ) );
			}
			$src = self::open( $path );
			if ( is_wp_error( $src ) ) {
				return $src;
			}
			// Whatever size or shape was uploaded, Lucy fits it without squashing it.
			$img = self::fit( $src, $w, $h );
			imagedestroy( $src );
		}

		if ( ! empty( $t['motif'] ) ) {
			$motif = self::motif_for( $title, $keywords );
			$side  = 'left' === $t['motif_side'] ? 0.26 : 0.74;
			$mw    = (int) round( $w * ( $h >= $w ? 0.66 : 0.44 ) );
			$mcy   = (int) round( $h * ( $h >= $w ? 0.42 : 0.72 ) );
			self::draw_motif( $img, $motif, (int) round( $w * $side ), $mcy, $mw, self::hex_rgb( $brand['text'] ), 68 );
		}

		if ( ! empty( $t['cover'] ) && 'brand' !== $t['background'] ) {
			self::cover_old_text( $img, $t ); // Hide the title that was already on the picture.
		}

		if ( (int) $t['overlay'] > 0 ) {
			$shade = imagecolorallocatealpha( $img, 0, 0, 0, (int) round( 127 - ( (int) $t['overlay'] / 100 * 127 ) ) );
			imagefilledrectangle( $img, 0, 0, $w, $h, $shade );
		}

		// A soft fade behind the words, so the headline reads over any photo.
		if ( ! empty( $t['scrim'] ) && 'none' !== $t['scrim'] ) {
			self::draw_scrim( $img, $t, $w, $h );
		}
		if ( ! empty( $t['panel'] ) ) {
			list( $pr, $pg, $pb ) = self::hex_rgb( $brand['primary'] );
			$panel = imagecolorallocatealpha( $img, $pr, $pg, $pb, 28 );
			imagefilledrectangle( $img, 0, 0, (int) round( $w * 0.56 ), $h, $panel );
		}

		$font = self::font_file( $t['font'] );
		$size = max( 10, (int) round( (int) $t['font_size'] * ( $w / self::FEATURED_W ) ) );
		$text = trim( wp_strip_all_tags( (string) $title ) );
		$text = $t['uppercase'] ? mb_strtoupper( $text ) : $text;
		$boxw = (int) round( $w * ( (int) $t['box_w'] / 100 ) );
		$max_lines = $h >= $w ? min( 8, (int) $t['max_lines'] + 3 ) : (int) $t['max_lines'];
		$lines     = self::wrap( $text, $font, $size, $boxw, $max_lines );
		$tries     = 0;
		while ( $tries < 8 && $size > 16 && self::was_trimmed( $lines, $text ) ) {
			$size  = (int) round( $size * 0.92 );
			$lines = self::wrap( $text, $font, $size, $boxw, $max_lines );
			$tries++;
		}
		if ( ! $lines ) {
			return new WP_Error( 'lucy_tpl_text', __( 'There is no title to write on the picture.', 'lucy-ai-content' ) );
		}

		// The word worth shouting: the city, or the main keyword.
		$hit = ! empty( $t['highlight'] ) ? self::highlight_line( $lines, $keywords ) : array( -1, '' );

		$step   = (int) round( $size * ( (int) $t['line_height'] / 100 ) );
		$sub    = $t['subtitle'] ? $t['subtitle'] : $subtitle;
		$sub    = $sub ? mb_strtoupper( trim( wp_strip_all_tags( $sub ) ) ) : '';
		$sub_size = $sub ? max( 9, (int) round( (int) $t['subtitle_size'] * ( $w / self::FEATURED_W ) ) ) : 0;
		$extra  = $sub ? (int) round( $step * 0.9 ) : 0;
		$blockh = $step * count( $lines ) + $extra;

		$x0 = (int) round( $w * ( (int) $t['box_x'] / 100 ) );
		$y0 = (int) round( $h * ( (int) $t['box_y'] / 100 ) );
		if ( 'middle' === $t['valign'] ) {
			$y0 = (int) round( ( $h - $blockh ) / 2 );
		} elseif ( 'bottom' === $t['valign'] ) {
			$y0 = $h - $blockh - (int) round( $h * ( (int) $t['box_y'] / 100 ) );
		}
		$y0 = max( (int) round( $h * 0.04 ), $y0 );

		if ( ! empty( $t['band'] ) ) {
			self::draw_band( $img, $t, $brand, $x0, $y0, $boxw, $blockh, $step );
		}

		$text_colour = ( ! empty( $t['use_brand'] ) && empty( $t['learned'] ) ) ? $brand['text'] : $t['colour'];
		list( $r, $g, $b ) = self::hex_rgb( $text_colour );
		$colour = imagecolorallocate( $img, $r, $g, $b );
		$shadow = imagecolorallocatealpha( $img, 0, 0, 0, 70 );

		list( $hr, $hg, $hb ) = self::hex_rgb( $t['highlight_colour'] ? $t['highlight_colour'] : $brand['primary'] );
		$hl_box = imagecolorallocatealpha( $img, $hr, $hg, $hb, 12 );
		list( $tr, $tg, $tb ) = self::hex_rgb( $t['highlight_text'] );
		$hl_text = imagecolorallocate( $img, $tr, $tg, $tb );

		foreach ( $lines as $i => $line ) {
			$box = imagettfbbox( $size, 0, $font, $line );
			$lw  = abs( $box[2] - $box[0] );
			$x   = $x0;
			if ( 'center' === $t['align'] ) {
				$x = $x0 + (int) round( ( $boxw - $lw ) / 2 );
			} elseif ( 'right' === $t['align'] ) {
				$x = $x0 + ( $boxw - $lw );
			}
			$y = $y0 + ( $step * ( $i + 1 ) ) - (int) round( $step * 0.25 );

			if ( $i === $hit[0] && '' !== $hit[1] ) {
				// Only the word itself is highlighted, the rest of the line stays normal.
				$at     = mb_stripos( $line, $hit[1] );
				$before = mb_substr( $line, 0, $at );
				$word   = mb_substr( $line, $at, mb_strlen( $hit[1] ) );
				$after  = mb_substr( $line, $at + mb_strlen( $hit[1] ) );
				$wbefore = '' === $before ? 0 : abs( imagettfbbox( $size, 0, $font, $before )[2] - imagettfbbox( $size, 0, $font, $before )[0] );
				$wword   = abs( imagettfbbox( $size, 0, $font, $word )[2] - imagettfbbox( $size, 0, $font, $word )[0] );
				$pad_x   = (int) round( $size * 0.22 );
				$pad_y   = (int) round( $size * 0.18 );
				$wx      = $x + (int) $wbefore;
				imagefilledrectangle( $img, $wx - $pad_x, $y - $size - $pad_y, $wx + (int) $wword + $pad_x, $y + (int) round( $size * 0.28 ) + $pad_y, $hl_box );
				if ( '' !== $before ) {
					imagettftext( $img, $size, 0, $x, $y, $colour, $font, $before );
				}
				imagettftext( $img, $size, 0, $wx, $y, $hl_text, $font, $word );
				if ( '' !== $after ) {
					// Leave room for the highlight box so the next word does not touch it.
					imagettftext( $img, $size, 0, $wx + (int) $wword + $pad_x, $y, $colour, $font, ltrim( $after ) );
				}
				continue;
			}
			if ( (int) $t['shadow'] ) {
				imagettftext( $img, $size, 0, $x + 2, $y + 3, $shadow, $font, $line );
			}
			imagettftext( $img, $size, 0, $x, $y, $colour, $font, $line );
		}

		// A rule and a strapline, the way a designed header reads.
		$below = $y0 + $step * count( $lines );
		if ( ! empty( $t['rule'] ) ) {
			$rule_y = $below + (int) round( $step * 0.18 );
			imagesetthickness( $img, max( 2, (int) round( $size * 0.07 ) ) );
			imageline( $img, $x0, $rule_y, $x0 + (int) round( $boxw * 0.62 ), $rule_y, $colour );
			imagesetthickness( $img, 1 );
		}
		if ( $sub ) {
			$sub_y = $below + (int) round( $step * 0.72 );
			self::draw_tracked( $img, $sub, $font, $sub_size, $x0, $sub_y, $colour, (int) round( $sub_size * 0.10 ) );
		}

		if ( ! empty( $t['show_logo'] ) ) {
			self::draw_logo( $img, $t, $brand );
		}
		return $img;
	}

	/** A soft fade on the text side so a headline reads over any photo. */
	private static function draw_scrim( $img, array $t, $w, $h ) {
		$strength = max( 0, min( 100, (int) $t['scrim_strength'] ) ) / 100;
		$dark     = 'dark' === $t['scrim'];
		$width    = (int) round( $w * 0.66 );
		for ( $x = 0; $x < $width; $x++ ) {
			$fade = 1 - ( $x / $width );
			$fade = $fade * $fade; // Stronger at the edge, gone by the middle.
			$a    = (int) round( 127 - ( $fade * $strength * 127 ) );
			if ( $a >= 126 ) {
				continue;
			}
			$col = $dark
				? imagecolorallocatealpha( $img, 8, 12, 20, $a )
				: imagecolorallocatealpha( $img, 255, 255, 255, $a );
			imageline( $img, $x, 0, $x, $h, $col );
		}
	}

	/**
	 * Which word to highlight: the city, or the main keyword.
	 *
	 * @param string[] $lines    Wrapped headline.
	 * @param string   $keywords Target keywords.
	 * @return array   array( line index, the word ) – line index is -1 when nothing fits.
	 */
	private static function highlight_line( array $lines, $keywords ) {
		$s      = Lucy_Settings::content();
		$skip   = array( 'best', 'used', 'new', 'cheap', 'top', 'the', 'and', 'for', 'with', 'near', 'from', 'your', 'car', 'cars', 'under', 'over', 'guide', 'buying' );
		$wanted = array();
		// Whole place names first (they read best highlighted), then single strong words from the keywords.
		foreach ( array_merge( splitlist_helper( $s['cities'] ), splitlist_helper( $s['locations'] ) ) as $place ) {
			$place = trim( preg_replace( '/[^A-Za-z0-9 ]/', '', $place ) );
			if ( Lucy_Settings::strlen( $place ) > 2 ) {
				$wanted[] = Lucy_Settings::lower_text( $place );
			}
		}
		foreach ( splitlist_helper( $keywords ) as $phrase ) {
			foreach ( preg_split( '/\s+/', trim( preg_replace( '/[^A-Za-z0-9 ]/', '', $phrase ) ) ) as $word ) {
				$word = Lucy_Settings::lower_text( $word );
				if ( Lucy_Settings::strlen( $word ) > 3 && ! in_array( $word, $skip, true ) ) {
					$wanted[] = $word;
				}
			}
		}
		$wanted = array_values( array_unique( $wanted ) );
		$best = array( -1, '' );
		foreach ( $lines as $i => $line ) {
			$plain = Lucy_Settings::lower_text( $line );
			foreach ( $wanted as $word ) {
				$at = strpos( $plain, $word );
				if ( false === $at ) {
					continue;
				}
				// Use the words as they appear on the line, not as they were typed.
				$actual = mb_substr( $line, mb_strlen( mb_substr( $plain, 0, $at ) ), mb_strlen( $word ) );
				if ( -1 === $best[0] || mb_strlen( $actual ) > mb_strlen( $best[1] ) ) {
					$best = array( $i, $actual );
				}
			}
		}
		return $best;
	}

	/** Letter-spaced small caps, drawn one character at a time (GD has no tracking). */
	private static function draw_tracked( $img, $text, $font, $size, $x, $y, $colour, $tracking ) {
		foreach ( preg_split( '//u', $text, -1, PREG_SPLIT_NO_EMPTY ) as $char ) {
			imagettftext( $img, $size, 0, $x, $y, $colour, $font, $char );
			$box = imagettfbbox( $size, 0, $font, $char );
			$x  += abs( $box[2] - $box[0] ) + $tracking;
			if ( ' ' === $char ) {
				$x += (int) round( $size * 0.28 );
			}
		}
	}

	/**
	 * Makes the picture and puts it in the Media Library.	/**
	 * Makes the picture and puts it in the Media Library.
	 *
	 * @param string $template_id Template to use.
	 * @param string $title       Post title.
	 * @param int    $post_id     Post it belongs to (0 for none).
	 * @return array|WP_Error array( id, url )
	 */
	public static function create( $template_id, $title, $post_id = 0, $keywords = '', array $args = array() ) {
		$t = self::get( sanitize_key( $template_id ) );
		if ( ! $t ) {
			return new WP_Error( 'lucy_tpl_missing', __( 'That image template no longer exists.', 'lucy-ai-content' ) );
		}
		if ( ! empty( $args['image_id'] ) ) {
			$t['image_id'] = absint( $args['image_id'] ); // The photo Lucy just made for this article.
		}
		$made = self::compose( $t, $title, $keywords, isset( $args['subtitle'] ) ? $args['subtitle'] : '' );
		if ( is_wp_error( $made ) ) {
			return $made;
		}
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$base = $title ? sanitize_title( $title ) : 'lucy-featured';
		$stamp = wp_date( 'YmdHis' );
		$name = sanitize_file_name( $base . '-' . $stamp . '.jpg' );
		$id   = media_handle_sideload(
			array(
				'name'     => $name,
				'tmp_name' => $made['path'],
			),
			(int) $post_id,
			$title
		);
		if ( is_wp_error( $id ) ) {
			wp_delete_file( $made['path'] );
			return $id;
		}
		update_post_meta( $id, '_wp_attachment_image_alt', Lucy_Settings::clip( $title, 120 ) );
		update_post_meta( $id, '_lucy_generated', 1 );
		update_post_meta( $id, '_lucy_template', sanitize_key( $template_id ) );
		$url = wp_get_attachment_image_url( $id, 'large' );

		$out = array(
			'id'  => (int) $id,
			'url' => $url ? $url : wp_get_attachment_url( $id ),
		);

		// A square thumbnail as well, for listings, related posts and social profiles.
		if ( ! empty( $t['thumbnail'] ) && ! empty( $made['thumb'] ) ) {
			$thumb_id = media_handle_sideload(
				array(
					'name'     => sanitize_file_name( $base . '-' . $stamp . '-square.jpg' ),
					'tmp_name' => $made['thumb'],
				),
				(int) $post_id,
				$title
			);
			if ( is_wp_error( $thumb_id ) ) {
				wp_delete_file( $made['thumb'] );
			} else {
				update_post_meta( $thumb_id, '_wp_attachment_image_alt', Lucy_Settings::clip( $title, 120 ) );
				update_post_meta( $thumb_id, '_lucy_generated', 1 );
				update_post_meta( $thumb_id, '_lucy_thumbnail_of', (int) $id );
				update_post_meta( $id, '_lucy_square_thumbnail', (int) $thumb_id );
				$thumb_url        = wp_get_attachment_image_url( $thumb_id, 'medium' );
				$out['thumb_id']  = (int) $thumb_id;
				$out['thumb_url'] = $thumb_url ? $thumb_url : wp_get_attachment_url( $thumb_id );
			}
		}
		return $out;
	}

	/** A preview for the admin screen: the same drawing, returned as a data URL. */
	public static function preview( array $t, $title ) {
		$made = self::compose( $t, $title );
		if ( is_wp_error( $made ) ) {
			return $made;
		}
		$data = file_get_contents( $made['path'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		wp_delete_file( $made['path'] );
		if ( ! empty( $made['thumb'] ) ) {
			wp_delete_file( $made['thumb'] );
		}
		return 'data:image/jpeg;base64,' . base64_encode( $data ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
	}

	/**
	 * Picks the artwork that suits the article: an SUV for an SUV round-up, a ute for a ute guide,
	 * an EV with its plug for an electric story, a spanner for servicing, and so on.
	 *
	 * @param string $title    Post title.
	 * @param string $keywords Target keywords.
	 * @return string
	 */
	public static function motif_for( $title, $keywords = '' ) {
		$text = Lucy_Settings::lower_text( $title . ' ' . $keywords );
		$map  = array(
			'ev'      => array( 'ev', 'evs', 'electric', 'hybrid', 'phev', 'charging', 'charger', 'battery' ),
			'ute'     => array( 'ute', 'utes', 'dual cab', 'dual-cab', 'pickup', 'pick-up', 'truck', 'tray', 'towing', 'tradie' ),
			'suv'     => array( 'suv', 'suvs', '4wd', '4x4', 'crossover', 'wagon', 'family car', 'seven seat', '7 seat' ),
			'van'     => array( 'van', 'vans', 'people mover', 'commercial', 'fleet' ),
			'service' => array( 'service', 'servicing', 'repair', 'mechanic', 'maintenance', 'logbook', 'tyres', 'brakes' ),
			'finance' => array( 'finance', 'financing', 'loan', 'repayment', 'lease', 'budget', 'price', 'deal', 'trade-in', 'trade in' ),
		);
		foreach ( $map as $motif => $words ) {
			foreach ( $words as $word ) {
				if ( false !== strpos( $text, $word ) ) {
					return $motif;
				}
			}
		}
		return 'car';
	}

	/**
	 * Draws the artwork as a flat silhouette, the way a designer would place it on a template.
	 *
	 * @param resource|GdImage $img   Image being drawn on.
	 * @param string           $motif Which artwork.
	 * @param int              $cx    Centre x.
	 * @param int              $cy    Centre y (ground line).
	 * @param int              $width Width of the artwork.
	 * @param array            $rgb   Colour to draw it in.
	 * @param int              $alpha 0 (solid) to 127 (invisible).
	 * @return void
	 */
	public static function draw_motif( $img, $motif, $cx, $cy, $width, array $rgb, $alpha = 45 ) {
		$solid = imagecolorallocatealpha( $img, $rgb[0], $rgb[1], $rgb[2], $alpha );
		$soft  = imagecolorallocatealpha( $img, $rgb[0], $rgb[1], $rgb[2], min( 118, $alpha + 40 ) );
		$u     = $width / 100; // Everything is drawn in units of 1% of the artwork width.
		$px    = function ( $v ) use ( $cx, $u, $width ) {
			return (int) round( $cx - $width / 2 + $v * $u );
		};
		$py    = function ( $v ) use ( $cy, $u ) {
			return (int) round( $cy - $v * $u ); // y counts up from the ground line.
		};
		$poly  = function ( array $points ) use ( $px, $py ) {
			$out = array();
			foreach ( $points as $point ) {
				$out[] = $px( $point[0] );
				$out[] = $py( $point[1] );
			}
			return $out;
		};

		if ( 'service' === $motif ) {
			imagefilledellipse( $img, $px( 50 ), $py( 2 ), (int) ( 80 * $u ), (int) ( 10 * $u ), $soft );
			imagefilledpolygon( $img, $poly( array( array( 18, 18 ), array( 26, 28 ), array( 80, 58 ), array( 88, 46 ), array( 32, 16 ) ) ), $solid );
			imagefilledellipse( $img, $px( 20 ), $py( 22 ), (int) ( 28 * $u ), (int) ( 28 * $u ), $solid );
			imagefilledellipse( $img, $px( 20 ), $py( 22 ), (int) ( 13 * $u ), (int) ( 13 * $u ), $soft );
			imagefilledellipse( $img, $px( 84 ), $py( 52 ), (int) ( 26 * $u ), (int) ( 26 * $u ), $solid );
			imagefilledellipse( $img, $px( 84 ), $py( 52 ), (int) ( 12 * $u ), (int) ( 12 * $u ), $soft );
			return;
		}
		if ( 'finance' === $motif ) {
			imagefilledellipse( $img, $px( 50 ), $py( 2 ), (int) ( 80 * $u ), (int) ( 10 * $u ), $soft );
			imagefilledpolygon( $img, $poly( array( array( 14, 16 ), array( 60, 16 ), array( 88, 44 ), array( 60, 72 ), array( 14, 72 ) ) ), $solid );
			imagefilledellipse( $img, $px( 70 ), $py( 44 ), (int) ( 13 * $u ), (int) ( 13 * $u ), $soft );
			imagefilledellipse( $img, $px( 32 ), $py( 56 ), (int) ( 15 * $u ), (int) ( 15 * $u ), $soft );
			imagefilledellipse( $img, $px( 48 ), $py( 32 ), (int) ( 15 * $u ), (int) ( 15 * $u ), $soft );
			imagesetthickness( $img, max( 2, (int) ( 4 * $u ) ) );
			imageline( $img, $px( 26 ), $py( 30 ), $px( 54 ), $py( 58 ), $soft );
			imagesetthickness( $img, 1 );
			return;
		}

		// One vehicle, four rooflines. Ground line at 0, wheels sitting on it.
		$shapes = array(
			'suv' => array(
				'body'   => array( array( 6, 14 ), array( 8, 30 ), array( 92, 30 ), array( 94, 14 ), array( 88, 10 ), array( 12, 10 ) ),
				'cabin'  => array( array( 22, 30 ), array( 27, 54 ), array( 69, 54 ), array( 74, 30 ) ),
				'window' => array( array( 26, 32 ), array( 30, 50 ), array( 68, 50 ), array( 71, 32 ) ),
			),
			'car' => array(
				'body'   => array( array( 5, 12 ), array( 7, 28 ), array( 93, 28 ), array( 95, 12 ), array( 88, 9 ), array( 12, 9 ) ),
				'cabin'  => array( array( 26, 28 ), array( 36, 46 ), array( 64, 46 ), array( 74, 28 ) ),
				'window' => array( array( 30, 30 ), array( 38, 43 ), array( 62, 43 ), array( 70, 30 ) ),
			),
			'ute' => array(
				'body'   => array( array( 6, 14 ), array( 8, 30 ), array( 94, 30 ), array( 94, 14 ), array( 88, 10 ), array( 12, 10 ) ),
				'cabin'  => array( array( 20, 30 ), array( 25, 52 ), array( 52, 52 ), array( 55, 30 ) ),
				'window' => array( array( 24, 32 ), array( 28, 48 ), array( 51, 48 ), array( 52, 32 ) ),
				'tray'   => array( array( 56, 30 ), array( 56, 42 ), array( 94, 42 ), array( 94, 30 ) ),
			),
			'van' => array(
				'body'   => array( array( 6, 14 ), array( 8, 30 ), array( 92, 30 ), array( 94, 14 ), array( 88, 10 ), array( 12, 10 ) ),
				'cabin'  => array( array( 16, 30 ), array( 18, 62 ), array( 84, 62 ), array( 86, 30 ) ),
				'window' => array( array( 22, 34 ), array( 23, 57 ), array( 58, 57 ), array( 58, 34 ) ),
			),
		);
		$shape = isset( $shapes[ $motif ] ) ? $shapes[ $motif ] : ( 'ev' === $motif ? $shapes['car'] : $shapes['car'] );

		imagefilledellipse( $img, $px( 50 ), $py( 1 ), (int) ( 92 * $u ), (int) ( 9 * $u ), $soft );
		if ( isset( $shape['tray'] ) ) {
			imagefilledpolygon( $img, $poly( $shape['tray'] ), $solid );
		}
		imagefilledpolygon( $img, $poly( $shape['cabin'] ), $solid );
		imagefilledpolygon( $img, $poly( $shape['body'] ), $solid );
		imagefilledpolygon( $img, $poly( $shape['window'] ), $soft );

		$wheel = (int) round( 24 * $u );
		foreach ( array( 27, 73 ) as $wx ) {
			imagefilledellipse( $img, $px( $wx ), $py( 12 ), $wheel, $wheel, $solid );
			imagefilledellipse( $img, $px( $wx ), $py( 12 ), (int) round( 10 * $u ), (int) round( 10 * $u ), $soft );
		}

		if ( 'ev' === $motif ) {
			imagefilledpolygon(
				$img,
				$poly( array( array( 104, 30 ), array( 93, 52 ), array( 101, 52 ), array( 95, 70 ), array( 114, 46 ), array( 105, 46 ) ) ),
				$solid
			);
		}
	}

	/** Logo and colours from the Growth profile. */	/** Logo and colours from the Growth profile. */
	public static function brand() {
		$s = Lucy_Settings::content();
		return array(
			'logo_id'   => (int) $s['brand_logo_id'],
			'primary'   => $s['brand_primary'],
			'secondary' => $s['brand_secondary'],
			'text'      => $s['brand_text'],
		);
	}

	/** A clean background drawn from the two brand colours. */
	private static function brand_background( $w, $h, array $brand ) {
		$img = imagecreatetruecolor( $w, $h );
		list( $r1, $g1, $b1 ) = self::hex_rgb( $brand['primary'] );
		list( $r2, $g2, $b2 ) = self::hex_rgb( $brand['secondary'] );
		for ( $x = 0; $x < $w; $x++ ) {
			$mix = $x / max( 1, $w - 1 );
			$col = imagecolorallocate(
				$img,
				(int) round( $r1 * ( 1 - $mix ) + $r2 * $mix ),
				(int) round( $g1 * ( 1 - $mix ) + $g2 * $mix ),
				(int) round( $b1 * ( 1 - $mix ) + $b2 * $mix )
			);
			imageline( $img, $x, 0, $x, $h, $col );
		}
		// A soft shape so it does not look like a flat rectangle.
		$soft = imagecolorallocatealpha( $img, 255, 255, 255, 118 );
		imagefilledellipse( $img, (int) ( $w * 0.88 ), (int) ( $h * 0.16 ), (int) ( $w * 0.42 ), (int) ( $h * 0.5 ), $soft );
		return $img;
	}

	/**
	 * Fits any picture to the size Lucy needs: fills the frame, centre-cropped, never squashed.
	 *
	 * @param resource|GdImage $src Source picture.
	 * @param int              $w   Target width.
	 * @param int              $h   Target height.
	 * @return resource|GdImage
	 */
	private static function fit( $src, $w, $h ) {
		$sw  = imagesx( $src );
		$sh  = imagesy( $src );
		$out = imagecreatetruecolor( $w, $h );
		$scale = max( $w / $sw, $h / $sh );
		$cw    = (int) round( $w / $scale );
		$ch    = (int) round( $h / $scale );
		$cx    = (int) round( ( $sw - $cw ) / 2 );
		$cy    = (int) round( ( $sh - $ch ) / 2 );
		imagecopyresampled( $out, $src, 0, 0, max( 0, $cx ), max( 0, $cy ), $w, $h, $cw, $ch );
		return $out;
	}

	/** A brand-colour band behind the title. */
	private static function draw_band( $img, array $t, array $brand, $x0, $y0, $boxw, $blockh, $step ) {
		list( $r, $g, $b ) = self::hex_rgb( $brand['primary'] );
		$pad   = (int) round( $step * 0.35 );
		$band  = imagecolorallocatealpha( $img, $r, $g, $b, 22 );
		$left  = max( 0, $x0 - $pad );
		$top   = max( 0, $y0 - (int) round( $pad * 0.6 ) );
		$right = min( imagesx( $img ), $x0 + $boxw + $pad );
		$bot   = min( imagesy( $img ), $y0 + $blockh + (int) round( $pad * 0.4 ) );
		imagefilledrectangle( $img, $left, $top, $right, $bot, $band );
	}

	/** Places the logo from the Growth profile in one corner. */
	private static function draw_logo( $img, array $t, array $brand ) {
		if ( ! $brand['logo_id'] ) {
			return;
		}
		$path = get_attached_file( $brand['logo_id'] );
		if ( ! $path || ! file_exists( $path ) ) {
			return;
		}
		$logo = self::open( $path );
		if ( is_wp_error( $logo ) ) {
			return;
		}
		$w   = imagesx( $img );
		$h   = imagesy( $img );
		$lw  = (int) round( $w * ( (int) $t['logo_size'] / 100 ) );
		$lh  = (int) round( imagesy( $logo ) * ( $lw / imagesx( $logo ) ) );
		$pad = (int) round( $w * 0.04 );
		$x   = in_array( $t['logo_pos'], array( 'tr', 'br' ), true ) ? $w - $lw - $pad : $pad;
		$y   = in_array( $t['logo_pos'], array( 'bl', 'br' ), true ) ? $h - $lh - $pad : $pad;

		// A soft white badge behind the logo, so it reads on a photo.
		if ( ! empty( $t['logo_badge'] ) ) {
			$bpad  = (int) round( $lw * 0.18 );
			$badge = imagecolorallocatealpha( $img, 255, 255, 255, 22 );
			$bx1   = $x - $bpad;
			$by1   = $y - $bpad;
			$bx2   = $x + $lw + $bpad;
			$by2   = $y + $lh + $bpad;
			$radius = (int) round( min( $bx2 - $bx1, $by2 - $by1 ) * 0.42 );
			imagefilledrectangle( $img, $bx1 + $radius, $by1, $bx2 - $radius, $by2, $badge );
			imagefilledrectangle( $img, $bx1, $by1 + $radius, $bx2, $by2 - $radius, $badge );
			foreach ( array( array( $bx1 + $radius, $by1 + $radius ), array( $bx2 - $radius, $by1 + $radius ), array( $bx1 + $radius, $by2 - $radius ), array( $bx2 - $radius, $by2 - $radius ) ) as $corner ) {
				imagefilledellipse( $img, $corner[0], $corner[1], $radius * 2, $radius * 2, $badge );
			}
		}
		imagealphablending( $img, true );
		imagecopyresampled( $img, $logo, $x, $y, 0, 0, $lw, $lh, imagesx( $logo ), imagesy( $logo ) );
		imagedestroy( $logo );
	}

	/** True when wrapping had to leave words out. */
	private static function was_trimmed( array $lines, $text ) {
		$written = trim( preg_replace( '/…$/u', '', implode( ' ', $lines ) ) );
		return Lucy_Settings::strlen( $written ) < Lucy_Settings::strlen( trim( $text ) ) - 1;
	}

	/** Breaks the title into lines that fit the text box. */
	private static function wrap( $text, $font, $size, $boxw, $max_lines ) {
		$words = preg_split( '/\s+/', trim( $text ) );
		$lines = array();
		$line  = '';
		foreach ( $words as $word ) {
			$try = '' === $line ? $word : $line . ' ' . $word;
			$box = imagettfbbox( $size, 0, $font, $try );
			if ( abs( $box[2] - $box[0] ) > $boxw && '' !== $line ) {
				$lines[] = $line;
				$line    = $word;
				if ( count( $lines ) >= $max_lines ) {
					break;
				}
			} else {
				$line = $try;
			}
		}
		if ( count( $lines ) < $max_lines && '' !== $line ) {
			$lines[] = $line;
		}
		if ( count( $lines ) >= $max_lines ) {
			$last  = count( $lines ) - 1;
			$extra = array_slice( $words, 0 );
			$used  = implode( ' ', $lines );
			if ( Lucy_Settings::strlen( $used ) < Lucy_Settings::strlen( $text ) ) {
				$lines[ $last ] = rtrim( $lines[ $last ], ' ,.;:' ) . '…';
			}
			unset( $extra );
		}
		return $lines;
	}

	private static function hex_rgb( $hex ) {
		$hex = ltrim( (string) $hex, '#' );
		return array( hexdec( substr( $hex, 0, 2 ) ), hexdec( substr( $hex, 2, 2 ) ), hexdec( substr( $hex, 4, 2 ) ) );
	}
}
