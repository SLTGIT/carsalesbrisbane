<?php
/**
 * Structured data for published Lucy posts: FAQPage and Article.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Frontend {

	public static function init() {
		add_action( 'wp_head', array( __CLASS__, 'schema' ), 20 );
	}

	/** Prints the schema for the post being viewed. */
	public static function schema() {
		if ( ! is_singular() ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id || 'publish' !== get_post_status( $post_id ) || ! (int) get_post_meta( $post_id, '_lucy_generated', true ) ) {
			return;
		}
		if ( ! (int) Lucy_Settings::get( 'faq_schema' ) ) {
			return;
		}
		foreach ( self::graph( $post_id ) as $item ) {
			echo "\n<script type=\"application/ld+json\" class=\"lucy-schema\">" . wp_json_encode( $item, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG ) . "</script>\n";
		}
	}

	/** @return array[] Schema objects for a post. */
	public static function graph( $post_id ) {
		$out  = array();
		$faqs = self::faqs( $post_id );
		if ( $faqs ) {
			$out[] = array(
				'@context'   => 'https://schema.org',
				'@type'      => 'FAQPage',
				'mainEntity' => $faqs,
			);
		}
		$s     = Lucy_Settings::content();
		$title = wp_strip_all_tags( get_the_title( $post_id ) );
		$image = function_exists( 'get_the_post_thumbnail_url' ) ? get_the_post_thumbnail_url( $post_id, 'full' ) : '';
		$out[] = array_filter(
			array(
				'@context'      => 'https://schema.org',
				'@type'         => 'Article',
				'headline'      => Lucy_Settings::clip( $title, 110 ),
				'datePublished' => get_the_date( 'c', $post_id ),
				'dateModified'  => get_the_modified_date( 'c', $post_id ),
				'mainEntityOfPage' => get_permalink( $post_id ),
				'image'         => $image ? $image : null,
				'author'        => array_filter(
					array(
						'@type' => 'Organization',
						'name'  => $s['business_name'] ? $s['business_name'] : get_bloginfo( 'name' ),
						'url'   => $s['website_url'],
					)
				),
				'publisher'     => array_filter(
					array(
						'@type' => 'Organization',
						'name'  => $s['business_name'] ? $s['business_name'] : get_bloginfo( 'name' ),
						'url'   => $s['website_url'],
					)
				),
			)
		);
		return $out;
	}

	/**
	 * FAQ entities saved with the post.
	 *
	 * Only FAQs that are still in the post count: an editor may have deleted some by hand.
	 *
	 * @param int $post_id Post.
	 * @return array[]
	 */
	public static function faqs( $post_id ) {
		$raw  = (string) get_post_meta( $post_id, '_lucy_faqs', true );
		$faqs = json_decode( $raw, true );
		if ( ! is_array( $faqs ) ) {
			return array();
		}
		$content = html_entity_decode( wp_strip_all_tags( (string) get_post_field( 'post_content', $post_id ) ), ENT_QUOTES, 'UTF-8' );
		$out     = array();
		foreach ( $faqs as $faq ) {
			$question = isset( $faq['question'] ) ? trim( html_entity_decode( wp_strip_all_tags( $faq['question'] ), ENT_QUOTES, 'UTF-8' ) ) : '';
			$answer   = isset( $faq['answer'] ) ? trim( html_entity_decode( wp_strip_all_tags( $faq['answer'] ), ENT_QUOTES, 'UTF-8' ) ) : '';
			if ( '' === $question || '' === $answer ) {
				continue;
			}
			if ( '' !== $content && false === strpos( $content, $question ) ) {
				continue;
			}
			$out[] = array(
				'@type'          => 'Question',
				'name'           => $question,
				'acceptedAnswer' => array(
					'@type' => 'Answer',
					'text'  => $answer,
				),
			);
		}
		return $out;
	}
}
