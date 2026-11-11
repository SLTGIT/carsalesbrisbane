<?php
/**
 * Demo mode: Lucy works without OpenAI and without an API key.
 *
 * Use it to test the plugin safely (for example in WordPress Playground or on a staging site):
 * articles are sample text built from your topic and settings, and images are simple generated
 * graphics. Nothing is sent to OpenAI and no key is needed. Switch it on under Lucy → Super Admin → Access & limits.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_Demo {

	public static function enabled() {
		return 1 === (int) Lucy_Settings::get( 'demo_mode' );
	}

	/** Pretend model list for "Test connection". */
	public static function models() {
		return array_merge( array_keys( Lucy_Settings::suggested_text_models() ), array_keys( Lucy_Settings::suggested_image_models() ) );
	}

	/** Build a sample draft from the editor's request, in the same shape OpenAI would return. */
	public static function structured_response( array $payload ) {
		$s        = Lucy_Settings::content();
		$input    = isset( $payload['input'] ) ? (string) $payload['input'] : '';
		$topic    = self::line( $input, 'Topic / working title:' );
		$keywords = self::line( $input, 'Target keywords:' );
		$topic    = $topic ? $topic : 'choosing your next car';
		$business = $s['business_name'] ? $s['business_name'] : get_bloginfo( 'name' );
		$kw_list  = array_values( array_filter( array_map( 'trim', explode( ',', $keywords ) ) ) );
		$cities   = array_values( array_filter( array_map( 'trim', preg_split( '/[\r\n,]+/', (string) $s['cities'] ) ) ) );
		$city     = $cities ? $cities[0] : '';
		$area     = $city ? ' in ' . $city : '';
		$audience = $s['audience'] ? $s['audience'] : 'local buyers';

		// However the topic was typed, Lucy writes it properly: "UTE under 70,000" → "Ute Under $70,000".
		$topic  = self::add_currency( $topic, $s );
		$title  = Lucy_Settings::title_case( $topic );
		$phrase = Lucy_Settings::sentence_phrase( $topic );
		$one    = Lucy_Settings::phrase_with_article( $phrase );
		$focus  = $kw_list ? $kw_list[0] : Lucy_Settings::lower_text( $phrase );
		$t      = esc_html( $phrase );
		$b      = esc_html( $business );

		$html  = '<p><strong>Demo mode:</strong> this is sample text so you can test Lucy without an OpenAI key. With demo mode switched off, Lucy writes a full, original article on this topic that follows your Growth profile, tone and writing rules.</p>';
		$html .= '<p>Shopping for ' . esc_html( $one ) . ' is easier when you know what to compare. This guide from ' . $b . ' covers what to look for, the questions worth asking and how to work out what a car really costs to own, so you can decide with confidence.</p>';
		$html .= '<h2>Start with how you actually drive</h2><p>Before comparing models, write down how the car will be used each week: the school run, work, towing or longer trips. For ' . esc_html( $audience ) . ', that one list rules options in or out faster than any spec sheet.</p>';
		$html .= '<h2>What to check before you buy</h2><ol><li>Read the service logbook and match it to the odometer.</li><li>Run a vehicle history check.</li><li>Book an independent pre-purchase inspection.</li><li>Take a proper test drive on roads you know.</li></ol>';
		$html .= '<h3>Quick checklist</h3><ul><li>Set a budget that includes running costs, not just the purchase price.</li><li>Compare two or three vehicles side by side.</li><li>Ask for the finance terms in writing.</li></ul>';
		$html .= '<h2>Plan the budget, not just the price</h2><p>Registration, insurance, servicing and tyres all add up over a year. If you are considering finance, ask for a written breakdown so you can compare offers fairly. The team at ' . $b . $area . ' can talk you through the numbers before you commit.</p>';
		$html .= '<h2>Common mistakes to avoid</h2><p>Most regrets come from rushing: buying the first car seen, skipping the inspection, or budgeting for the sticker price alone. Take the extra day – ' . $b . ' would rather you bought the right car than a quick one.</p>';
		if ( ! empty( $s['include_cta'] ) && ( $s['cta_text'] || $s['cta_url'] ) ) {
			$cta   = esc_html( $s['cta_text'] ? $s['cta_text'] : 'Contact us' );
			$html .= '<p>' . ( $s['cta_url'] ? '<a href="' . esc_url( $s['cta_url'] ) . '">' . $cta . '</a>' : $cta ) . '</p>';
		}

		$pairs = array(
			array( 'What should I check first?', 'Start with the service history and an independent inspection. Together they show whether the car has been looked after and whether its story matches what you have been told.' ),
			array( 'How long should a test drive be?', 'Aim for at least 20 minutes on roads you know, including a hill start, some highway driving and a tight park.' ),
			array( 'Can I get finance on a used car?', 'Yes. ' . $business . ' can arrange pre-approval before you visit, so you know your budget and your repayments in advance.' ),
			array( 'Do you accept trade-ins?', 'Yes. Bring your current car in for a free appraisal and its value goes straight toward your next one.' ),
			array( 'What does the price really include?', 'Ask for the drive-away figure in writing. It should cover on-road costs so you can compare offers fairly.' ),
			array( 'Is a warranty included?', 'Ask what cover comes with the car and what an extended warranty would add. Get both in writing before you decide.' ),
			array( 'How do I compare two similar cars?', 'Put them side by side on the things you will notice daily: running costs, boot space, safety features and service intervals.' ),
			array( 'Can I reserve a car before I visit?', 'Call ahead' . $area . ' and the team can hold a car and have it ready for your test drive.' ),
			array( 'What paperwork should I bring?', 'Bring your licence, and for a trade-in, the registration papers, service records and both keys.' ),
			array( 'Do you deliver?', 'Ask the team' . $area . ' – delivery is often possible, and they will confirm the cost before anything is agreed.' ),
		);
		$faqs = array();
		for ( $i = 0; $i < (int) $s['faq_count'] && $i < count( $pairs ); $i++ ) {
			$faqs[] = array(
				'question' => $pairs[ $i ][0],
				'answer'   => $pairs[ $i ][1],
			);
		}

		$meta_title = Lucy_Settings::clip( $title . ' | ' . $business, 60 );
		$meta_desc  = Lucy_Settings::clip( 'A practical guide to buying ' . $one . ' from ' . $business . $area . ': what to check, the questions to ask and how to plan your budget.', 158, '.' );
		return array(
			'data'  => array(
				'title'            => $title,
				'slug'             => sanitize_title( $title ),
				'meta_title'       => $meta_title,
				'meta_description' => $meta_desc,
				'focus_keyword'    => $focus,
				'excerpt'          => Lucy_Settings::clip( 'A plain-language guide to buying ' . $one . ', with a checklist you can take to the dealership.', 200 ),
				'article_html'     => $html,
				'faqs'             => $faqs,
				'tags'             => $kw_list ? array_slice( $kw_list, 0, 5 ) : array( 'buying guide', 'used cars' ),
				'image_prompt'     => 'A bright, natural photo that suits an article about ' . $one . ' at a friendly car dealership.',
				'image_alt_text'   => Lucy_Settings::clip( ucfirst( $phrase ) . ' at ' . $business, 110 ),
				'review_notes'     => array( 'Demo mode: this is sample content, not real research. Switch demo mode off to generate a real article.' ),
			),
			'usage' => array(
				'input_tokens'  => 0,
				'output_tokens' => 0,
			),
			'model' => 'demo-mode',
		);
	}

	/** A simple branded graphic instead of an AI image. */
	public static function image( array $payload ) {
		if ( ! function_exists( 'imagecreatetruecolor' ) ) {
			return new WP_Error( 'lucy_demo_gd', __( 'Demo images need the PHP GD extension. Untick “Create a featured image” to continue.', 'lucy-ai-content' ) );
		}
		$w  = 1536;
		$h  = 800;
		$im = imagecreatetruecolor( $w, $h );
		for ( $y = 0; $y < $h; $y++ ) {
			$r = (int) ( 104 + 120 * $y / $h );
			$g = (int) ( 80 + 90 * $y / $h );
			$b = (int) ( 232 - 40 * $y / $h );
			imageline( $im, 0, $y, $w, $y, imagecolorallocate( $im, $r, $g, $b ) );
		}
		$soft = imagecolorallocatealpha( $im, 255, 255, 255, 90 );
		imagefilledellipse( $im, (int) ( $w * 0.72 ), (int) ( $h * 0.45 ), 520, 520, $soft );
		imagefilledellipse( $im, (int) ( $w * 0.30 ), (int) ( $h * 0.70 ), 300, 300, $soft );
		imagefilledellipse( $im, (int) ( $w * 0.50 ), (int) ( $h * 0.50 ), 180, 180, imagecolorallocatealpha( $im, 255, 255, 255, 40 ) );
		ob_start();
		imagejpeg( $im, null, 85 );
		$bytes = ob_get_clean();
		imagedestroy( $im );
		return array(
			'bytes'  => $bytes,
			'format' => 'jpeg',
			'usage'  => array(),
		);
	}

	/* ------------------------------------------------------------------
	 * In-editor assist (demo): sample copy built from the website + page + section context
	 * ------------------------------------------------------------------ */

	/**
	 * Writes a bare budget figure the way a person would: "under 70,000" → "under $70,000".
	 * Numbers that already carry a unit (70,000 km) or a symbol are left alone.
	 *
	 * @param string $topic The topic as typed.
	 * @param array  $s     Content settings (for the country).
	 * @return string
	 */
	private static function add_currency( $topic, array $s ) {
		$country = Lucy_Settings::lower_text( $s['country'] );
		$symbol  = '$';
		if ( false !== strpos( $country, 'india' ) ) {
			$symbol = '₹';
		} elseif ( false !== strpos( $country, 'kingdom' ) || false !== strpos( $country, 'britain' ) ) {
			$symbol = '£';
		} elseif ( preg_match( '/germany|france|spain|italy|netherlands|ireland|euro/', $country ) ) {
			$symbol = '€';
		}
		return preg_replace_callback(
			'/\b(under|below|over|above|around|about|up to|less than|from)\s+([0-9][0-9,.]*[kKmM]?)\b(?!\s*(km|kms|kilometre|kilometres|kilometers|miles|mile|mi|kg|hp|kw|cc|litre|litres|liter|liters|l\b|%))/u',
			function ( $m ) use ( $symbol ) {
				return $m[1] . ' ' . $symbol . $m[2];
			},
			(string) $topic
		);
	}

	private static function line( $text, $label ) {
		foreach ( preg_split( '/\r\n|\n/', $text ) as $line ) {
			if ( 0 === strpos( $line, $label ) ) {
				return trim( substr( $line, strlen( $label ) ) );
			}
		}
		return '';
	}

}
