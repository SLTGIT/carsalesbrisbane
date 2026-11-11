<?php
/**
 * “Write with Lucy”: one popup, one finished article.
 *
 * The same request runs from the Lucy admin screen and from the button in the post editor.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Write {

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	public static function routes() {
		register_rest_route(
			'lucy/v1',
			'/write',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'rest_write' ),
				'permission_callback' => array( __CLASS__, 'permission' ),
			)
		);
		register_rest_route(
			'lucy/v1',
			'/apply',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'rest_apply' ),
				'permission_callback' => array( __CLASS__, 'permission' ),
			)
		);
		register_rest_route(
			'lucy/v1',
			'/image',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'rest_image' ),
				'permission_callback' => array( __CLASS__, 'permission' ),
			)
		);
	}

	public static function permission( $request = null ) {
		$post_id = $request ? absint( $request->get_param( 'post_id' ) ) : 0;
		if ( $post_id && ! current_user_can( 'edit_post', $post_id ) ) {
			return false;
		}
		return current_user_can( 'edit_posts' ) && Lucy_Access::can_generate();
	}

	/* ------------------------------------------------------------------ */

	public static function rest_write( $request ) {
		$out = self::write( (array) $request->get_json_params() );
		return is_wp_error( $out ) ? $out : rest_ensure_response( $out );
	}

	public static function rest_apply( $request ) {
		$out = self::apply( (array) $request->get_json_params() );
		return is_wp_error( $out ) ? $out : rest_ensure_response( $out );
	}

	public static function rest_image( $request ) {
		$p       = (array) $request->get_json_params();
		$title   = isset( $p['title'] ) ? sanitize_text_field( $p['title'] ) : '';
		$post_id = isset( $p['post_id'] ) ? absint( $p['post_id'] ) : 0;
		$keywords = isset( $p['keywords'] ) ? sanitize_text_field( $p['keywords'] ) : '';
		$image    = Lucy_Images::create( isset( $p['image_template'] ) ? $p['image_template'] : '', $title, $post_id, $keywords );
		if ( is_wp_error( $image ) ) {
			return $image;
		}
		if ( $post_id ) {
			set_post_thumbnail( $post_id, $image['id'] );
		}
		return rest_ensure_response( array( 'image' => $image ) );
	}

	/* ------------------------------------------------------------------ */

	/** Cleans what the popup sent. */
	public static function clean( array $p ) {
		return array(
			'title'          => isset( $p['title'] ) ? sanitize_text_field( wp_unslash( $p['title'] ) ) : '',
			'keywords'       => isset( $p['keywords'] ) ? sanitize_text_field( wp_unslash( $p['keywords'] ) ) : '',
			'instruction'    => isset( $p['instruction'] ) ? Lucy_Settings::substr( sanitize_textarea_field( wp_unslash( $p['instruction'] ) ), 2000 ) : '',
			'reference_url'  => isset( $p['reference_url'] ) ? esc_url_raw( trim( (string) wp_unslash( $p['reference_url'] ) ) ) : '',
			'reference_text' => isset( $p['reference_text'] ) ? Lucy_Settings::substr( sanitize_textarea_field( wp_unslash( $p['reference_text'] ) ), 20000 ) : '',
			'image_template' => isset( $p['image_template'] ) ? sanitize_key( $p['image_template'] ) : '',
			'category'       => isset( $p['category'] ) ? absint( $p['category'] ) : 0,
			'post_id'        => isset( $p['post_id'] ) ? absint( $p['post_id'] ) : 0,
			'words'          => isset( $p['words'] ) ? absint( $p['words'] ) : 0,
			'faqs'           => isset( $p['faqs'] ) && '' !== $p['faqs'] ? absint( $p['faqs'] ) : '',
		);
	}

	/**
	 * Writes the article.
	 *
	 * @param array $raw Popup fields.
	 * @return array|WP_Error
	 */
	public static function write( array $raw ) {
		if ( ! (int) Lucy_Settings::get( 'enabled' ) ) {
			return new WP_Error( 'lucy_off', __( 'Lucy is switched off for this website.', 'lucy-ai-content' ), array( 'status' => 403 ) );
		}
		if ( ! Lucy_Context::is_active() ) {
			return new WP_Error(
				'lucy_not_active',
				__( 'Lucy is not set up for this website yet. Finish Lucy → Setup and click “Activate Lucy”.', 'lucy-ai-content' ),
				array(
					'status'   => 403,
					'setupUrl' => admin_url( 'admin.php?page=' . Lucy_Admin::PAGE_SETUP ),
				)
			);
		}
		if ( 'none' === Lucy_Settings::key_source() && ! Lucy_Demo::enabled() ) {
			return new WP_Error( 'lucy_no_key', __( 'No OpenAI API key is set. A Lucy Super Admin must add one (or switch on demo mode).', 'lucy-ai-content' ), array( 'status' => 400 ) );
		}
		$p = self::clean( $raw );
		if ( '' === trim( $p['title'] ) ) {
			return new WP_Error( 'lucy_title', __( 'Give Lucy a title or topic to write about.', 'lucy-ai-content' ), array( 'status' => 400 ) );
		}
		$limit = Lucy_Usage::check_limit( 'article' );
		if ( is_wp_error( $limit ) ) {
			return $limit;
		}

		$reference = $p['reference_text'];
		$read      = null;
		if ( $p['reference_url'] ) {
			$read = Lucy_Reference::fetch( $p['reference_url'] );
			if ( is_wp_error( $read ) ) {
				return $read;
			}
			$reference = trim( Lucy_Reference::as_prompt( $read ) . "\n\n" . $reference );
		}

		$req = array(
			'mode'       => trim( $p['reference_text'] ) ? 'rewrite' : 'new',
			'topic'      => $p['title'],
			'keywords'   => $p['keywords'],
			'extra'      => $p['instruction'],
			'reference'  => $reference,
			'category'   => $p['category'],
			'with_image' => 0,
			'words'      => $p['words'],
			'faqs'       => $p['faqs'],
		);

		$draft = Lucy_Generator::generate_text( $req );
		if ( is_wp_error( $draft ) ) {
			return $draft;
		}
		$draft['blocked'] = Lucy_Generator::find_blocked_terms( $draft );
		$draft['content'] = Lucy_Generator::compose_content( $draft );

		$image = null;
		if ( $p['image_template'] ) {
			$template = Lucy_Images::get( $p['image_template'] );
			$photo_id = 0;
			// Layouts that want a real photo: Lucy makes one for this article first.
			if ( $template && 'ai' === $template['background'] ) {
				$limit = Lucy_Usage::check_limit( 'image' );
				if ( is_wp_error( $limit ) ) {
					$draft['image_error'] = $limit->get_error_message();
				} else {
					$photo = Lucy_Generator::create_image(
						array_merge(
							$draft,
							array( 'image_prompt' => self::photo_prompt( $draft, $p ) )
						)
					);
					if ( is_wp_error( $photo ) ) {
						$draft['image_error'] = $photo->get_error_message();
					} else {
						$photo_id = (int) $photo['id'];
					}
				}
			}
			$made = Lucy_Images::create(
				$p['image_template'],
				$draft['title'],
				$p['post_id'],
				$p['keywords'],
				array(
					'image_id' => $photo_id,
					'subtitle' => self::strapline( $draft ),
				)
			);
			if ( is_wp_error( $made ) ) {
				$draft['image_error'] = $made->get_error_message();
			} else {
				$image = $made;
			}
		}
		$draft['image'] = $image;

		Lucy_Usage::add(
			array(
				'articles'      => 1,
				'images'        => $image ? 1 : 0,
				'input_tokens'  => isset( $draft['usage']['input_tokens'] ) ? $draft['usage']['input_tokens'] : 0,
				'output_tokens' => isset( $draft['usage']['output_tokens'] ) ? $draft['usage']['output_tokens'] : 0,
			)
		);
		if ( $read ) {
			$draft['reference'] = array(
				'url'   => $read['url'],
				'title' => $read['title'],
				'words' => str_word_count( $read['text'] ),
			);
		}
		return $draft;
	}

	/**
	 * The photo brief for a hero layout: a real scene, no words in the picture.
	 *
	 * @param array $draft Finished article.
	 * @param array $p     Popup fields.
	 * @return string
	 */
	private static function photo_prompt( array $draft, array $p ) {
		$s      = Lucy_Settings::content();
		$cities = array_filter( array_map( 'trim', preg_split( '/[\r\n,]+/', (string) $s['cities'] ) ) );
		$city   = $cities ? reset( $cities ) : '';
		$base   = ! empty( $draft['image_prompt'] ) ? $draft['image_prompt'] : $draft['title'];
		return trim(
			$base . ' Wide editorial photograph for a car dealership blog header'
			. ( $city ? ', a suburban street or park in ' . $city : '' )
			. '. Real vehicle, natural daylight, clean composition with open space on the left half for a headline.'
			. ' No text, no words, no lettering, no logos, no watermarks, no number plates.'
		);
	}

	/** A short strapline for the picture, taken from the article itself. */
	private static function strapline( array $draft ) {
		$source = ! empty( $draft['excerpt'] ) ? $draft['excerpt'] : $draft['meta_description'];
		$words  = preg_split( '/\s+/', trim( wp_strip_all_tags( (string) $source ) ) );
		$words  = array_slice( $words, 0, 7 );
		return rtrim( implode( ' ', $words ), ' ,.;:' );
	}

	/**
	 * Puts the SEO fields, FAQs and featured image onto a post the editor is already working on.
	 *
	 * @param array $raw post_id + the draft fields.
	 * @return array|WP_Error
	 */
	public static function apply( array $raw ) {
		$post_id = isset( $raw['post_id'] ) ? absint( $raw['post_id'] ) : 0;
		if ( ! $post_id || ! get_post( $post_id ) ) {
			return new WP_Error( 'lucy_post', __( 'Save the post once first, then Lucy can add the SEO fields and the picture.', 'lucy-ai-content' ), array( 'status' => 400 ) );
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new WP_Error( 'lucy_cap', __( 'You cannot edit this post.', 'lucy-ai-content' ), array( 'status' => 403 ) );
		}
		$draft = isset( $raw['draft'] ) && is_array( $raw['draft'] ) ? $raw['draft'] : array();
		$get   = function ( $key ) use ( $draft ) {
			return isset( $draft[ $key ] ) ? $draft[ $key ] : '';
		};
		$meta_title = sanitize_text_field( $get( 'meta_title' ) );
		$meta_desc  = sanitize_text_field( $get( 'meta_description' ) );
		$focus      = sanitize_text_field( $get( 'focus_keyword' ) );
		$faqs       = array();
		if ( isset( $draft['faqs'] ) && is_array( $draft['faqs'] ) ) {
			foreach ( array_slice( $draft['faqs'], 0, 12 ) as $faq ) {
				if ( ! empty( $faq['question'] ) && ! empty( $faq['answer'] ) ) {
					$faqs[] = array(
						'question' => sanitize_text_field( $faq['question'] ),
						'answer'   => sanitize_textarea_field( $faq['answer'] ),
					);
				}
			}
		}
		update_post_meta( $post_id, '_lucy_generated', 1 );
		update_post_meta( $post_id, '_lucy_faqs', wp_slash( wp_json_encode( $faqs ) ) );

		$seo = Lucy_Settings::active_seo_plugin();
		if ( 'yoast' === $seo ) {
			update_post_meta( $post_id, '_yoast_wpseo_title', $meta_title );
			update_post_meta( $post_id, '_yoast_wpseo_metadesc', $meta_desc );
			update_post_meta( $post_id, '_yoast_wpseo_focuskw', $focus );
		} elseif ( 'rankmath' === $seo ) {
			update_post_meta( $post_id, 'rank_math_title', $meta_title );
			update_post_meta( $post_id, 'rank_math_description', $meta_desc );
			update_post_meta( $post_id, 'rank_math_focus_keyword', $focus );
		}
		$excerpt = sanitize_textarea_field( $get( 'excerpt' ) );
		if ( $excerpt ) {
			wp_update_post(
				array(
					'ID'           => $post_id,
					'post_excerpt' => wp_slash( $excerpt ),
				)
			);
		}
		$image_id = isset( $raw['image_id'] ) ? absint( $raw['image_id'] ) : 0;
		if ( $image_id && get_post( $image_id ) ) {
			set_post_thumbnail( $post_id, $image_id );
			wp_update_post(
				array(
					'ID'          => $image_id,
					'post_parent' => $post_id,
				)
			);
		}
		do_action( 'lucy_draft_saved', $post_id, $draft );
		return array(
			'ok'       => true,
			'seo'      => $seo,
			'faqs'     => count( $faqs ),
			'image_id' => $image_id,
		);
	}
}
