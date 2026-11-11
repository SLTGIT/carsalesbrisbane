<?php
/**
 * The only place Lucy talks to OpenAI.
 *
 * Uses:
 *  - GET  /v1/models              → connection test and live model list
 *  - POST /v1/responses           → article text (Structured Outputs, JSON schema)
 *  - POST /v1/images/generations  → featured image (base64)
 *
 * Model names change often, so this client is forgiving: if OpenAI says a model does not accept an
 * optional setting (temperature, reasoning effort, a custom image size…), Lucy removes that setting
 * and tries once more instead of failing.
 *
 * For testing you can point Lucy at another server: define( 'LUCY_OPENAI_BASE_URL', 'http://localhost:8080/v1' );
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

class Lucy_OpenAI {

	const DEFAULT_BASE = 'https://api.openai.com/v1';

	/** Optional request settings Lucy may drop if a model refuses them. */
	const OPTIONAL_PARAMS = array( 'temperature', 'top_p', 'reasoning', 'max_output_tokens' );

	private $api_key;
	private $timeout;

	public function __construct( $api_key = null, $timeout = null ) {
		$this->api_key = null === $api_key ? Lucy_Settings::get_api_key() : $api_key;
		$this->timeout = null === $timeout ? (int) Lucy_Settings::get( 'timeout' ) : (int) $timeout;
	}

	public static function base_url() {
		$base = defined( 'LUCY_OPENAI_BASE_URL' ) ? LUCY_OPENAI_BASE_URL : self::DEFAULT_BASE;
		return untrailingslashit( apply_filters( 'lucy_openai_base_url', $base ) );
	}

	/**
	 * Send one HTTP request to OpenAI.
	 *
	 * @return array|WP_Error Decoded JSON on success.
	 */
	public function request( $method, $path, $body = null ) {
		if ( ! $this->api_key ) {
			return new WP_Error( 'lucy_no_key', __( 'No OpenAI API key is set. A Lucy Super Admin must add one under Lucy → Super Admin.', 'lucy-ai-content' ) );
		}

		$args = array(
			'method'  => $method,
			'timeout' => max( 15, $this->timeout ),
			'headers' => array(
				'Authorization' => 'Bearer ' . $this->api_key,
				'Content-Type'  => 'application/json',
			),
		);
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}

		$response = wp_remote_request( self::base_url() . $path, $args );

		if ( is_wp_error( $response ) ) {
			$message = $response->get_error_message();
			if ( false !== stripos( $message, 'timed out' ) || false !== stripos( $message, 'cURL error 28' ) ) {
				return new WP_Error( 'lucy_timeout', __( 'OpenAI took too long to answer. Please try again, or ask your Super Admin to raise the timeout or lower the word count.', 'lucy-ai-content' ) );
			}
			/* translators: %s: technical error message */
			return new WP_Error( 'lucy_network', sprintf( __( 'Could not reach OpenAI: %s', 'lucy-ai-content' ), $message ) );
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$data   = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $status >= 400 ) {
			return $this->http_error( $status, is_array( $data ) ? $data : array() );
		}
		if ( ! is_array( $data ) ) {
			return new WP_Error( 'lucy_bad_json', __( 'OpenAI sent a reply Lucy could not read. Please try again.', 'lucy-ai-content' ) );
		}
		return $data;
	}

	/** Turn an OpenAI error into a friendly message (and keep the details for retries). */
	private function http_error( $status, array $data ) {
		$error   = isset( $data['error'] ) && is_array( $data['error'] ) ? $data['error'] : array();
		$message = isset( $error['message'] ) ? (string) $error['message'] : '';
		$param   = isset( $error['param'] ) ? (string) $error['param'] : '';
		$code    = isset( $error['code'] ) ? (string) $error['code'] : '';

		switch ( $status ) {
			case 401:
				$friendly = __( 'OpenAI rejected the API key. Check the key under Lucy → Super Admin.', 'lucy-ai-content' );
				break;
			case 403:
				$friendly = __( 'OpenAI refused access. For image models your OpenAI organization may need to be verified (OpenAI dashboard → Settings → Organization).', 'lucy-ai-content' );
				break;
			case 404:
				$friendly = __( 'OpenAI could not find that model. Pick another model under Lucy → Super Admin (use “Test connection” to load the models your account can use).', 'lucy-ai-content' );
				break;
			case 429:
				$friendly = ( 'insufficient_quota' === $code )
					? __( 'Your OpenAI account has no credit left. Add billing credit in the OpenAI dashboard.', 'lucy-ai-content' )
					: __( 'OpenAI is limiting requests right now. Wait a minute and try again.', 'lucy-ai-content' );
				break;
			default:
				$friendly = $status >= 500
					? __( 'OpenAI had a temporary problem. Please try again in a moment.', 'lucy-ai-content' )
					: __( 'OpenAI could not complete the request.', 'lucy-ai-content' );
		}
		if ( $message && 401 !== $status ) {
			$friendly .= ' (' . wp_strip_all_tags( $message ) . ')';
		}

		return new WP_Error(
			'lucy_openai_' . $status,
			$friendly,
			array(
				'status' => $status,
				'param'  => $param,
				'code'   => $code,
				'raw'    => $message,
			)
		);
	}

	/** Which optional setting did OpenAI complain about? */
	private static function rejected_param( WP_Error $error ) {
		$data = $error->get_error_data();
		if ( ! is_array( $data ) || 400 !== (int) $data['status'] ) {
			return '';
		}
		$param = $data['param'];
		$raw   = strtolower( $data['raw'] );
		foreach ( self::OPTIONAL_PARAMS as $optional ) {
			if ( $param === $optional || 0 === strpos( $param, $optional . '.' ) ) {
				return $optional;
			}
			if ( '' === $param && false !== strpos( $raw, "'" . $optional ) && ( false !== strpos( $raw, 'unsupported' ) || false !== strpos( $raw, 'not supported' ) ) ) {
				return $optional;
			}
		}
		return '';
	}

	/* ------------------------------------------------------------------ */

	/** @return string[]|WP_Error List of model IDs available to this API key. */
	public function list_models() {
		if ( Lucy_Demo::enabled() ) {
			return Lucy_Demo::models();
		}
		$data = $this->request( 'GET', '/models' );
		if ( is_wp_error( $data ) ) {
			return $data;
		}
		$ids = array();
		foreach ( (array) ( isset( $data['data'] ) ? $data['data'] : array() ) as $model ) {
			if ( ! empty( $model['id'] ) ) {
				$ids[] = (string) $model['id'];
			}
		}
		sort( $ids );
		return $ids;
	}

	/**
	 * Call the Responses API and return the decoded JSON object produced by the model.
	 *
	 * @return array|WP_Error array( 'data' => array, 'usage' => array, 'model' => string )
	 */
	public function structured_response( array $payload ) {
		if ( Lucy_Demo::enabled() ) {
			return Lucy_Demo::structured_response( $payload );
		}
		$data = null;
		for ( $attempt = 0; $attempt < 4; $attempt++ ) {
			$data = $this->request( 'POST', '/responses', $payload );
			if ( ! is_wp_error( $data ) ) {
				break;
			}
			$param = self::rejected_param( $data );
			if ( ! $param || ! isset( $payload[ $param ] ) ) {
				return $data;
			}
			unset( $payload[ $param ] ); // e.g. this model does not accept temperature → try without it.
		}
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		if ( isset( $data['status'] ) && 'incomplete' === $data['status'] ) {
			$reason = isset( $data['incomplete_details']['reason'] ) ? $data['incomplete_details']['reason'] : '';
			if ( 'max_output_tokens' === $reason ) {
				return new WP_Error( 'lucy_incomplete', __( 'The article was cut off because it was too long for one answer. Lower the target word count and try again.', 'lucy-ai-content' ) );
			}
			if ( 'content_filter' === $reason ) {
				return new WP_Error( 'lucy_filtered', __( 'OpenAI stopped this answer because of its content policy. Change the topic or instructions and try again.', 'lucy-ai-content' ) );
			}
		}
		if ( isset( $data['error'] ) && is_array( $data['error'] ) && ! empty( $data['error']['message'] ) ) {
			return new WP_Error( 'lucy_openai', wp_strip_all_tags( $data['error']['message'] ) );
		}

		$text = '';
		foreach ( (array) ( isset( $data['output'] ) ? $data['output'] : array() ) as $item ) {
			if ( ! isset( $item['type'] ) || 'message' !== $item['type'] || empty( $item['content'] ) ) {
				continue;
			}
			foreach ( (array) $item['content'] as $part ) {
				if ( isset( $part['type'] ) && 'refusal' === $part['type'] ) {
					return new WP_Error( 'lucy_refusal', __( 'The model declined to write this. Try a different topic or wording.', 'lucy-ai-content' ) . ' ' . wp_strip_all_tags( (string) $part['refusal'] ) );
				}
				if ( isset( $part['type'] ) && 'output_text' === $part['type'] ) {
					$text .= (string) $part['text'];
				}
			}
		}
		if ( '' === $text && isset( $data['output_text'] ) ) {
			$text = (string) $data['output_text'];
		}

		$json = json_decode( $text, true );
		if ( ! is_array( $json ) ) {
			return new WP_Error( 'lucy_bad_output', __( 'The model’s answer was not in the expected format. Please try again.', 'lucy-ai-content' ) );
		}

		$usage = isset( $data['usage'] ) && is_array( $data['usage'] ) ? $data['usage'] : array();
		return array(
			'data'  => $json,
			'usage' => array(
				'input_tokens'  => isset( $usage['input_tokens'] ) ? (int) $usage['input_tokens'] : 0,
				'output_tokens' => isset( $usage['output_tokens'] ) ? (int) $usage['output_tokens'] : 0,
			),
			'model' => isset( $data['model'] ) ? (string) $data['model'] : ( isset( $payload['model'] ) ? $payload['model'] : '' ),
		);
	}

	/**
	 * Generate one image and return its raw bytes.
	 *
	 * @return array|WP_Error array( 'bytes' => string, 'format' => 'png'|'jpeg'|'webp' )
	 */
	public function generate_image( array $payload ) {
		if ( Lucy_Demo::enabled() ) {
			return Lucy_Demo::image( $payload );
		}
		$data = null;
		for ( $attempt = 0; $attempt < 4; $attempt++ ) {
			$data = $this->request( 'POST', '/images/generations', $payload );
			if ( ! is_wp_error( $data ) ) {
				break;
			}
			$info  = $data->get_error_data();
			$param = is_array( $info ) && 400 === (int) $info['status'] ? $info['param'] : '';
			if ( 'size' === $param && isset( $payload['size'] ) && '1536x1024' !== $payload['size'] ) {
				$payload['size'] = '1536x1024'; // Custom sizes not supported by this model → use the standard landscape size.
			} elseif ( in_array( $param, array( 'quality', 'output_format', 'output_compression', 'moderation' ), true ) && isset( $payload[ $param ] ) ) {
				unset( $payload[ $param ] );
			} else {
				return $data;
			}
		}
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		$item = isset( $data['data'][0] ) ? $data['data'][0] : array();
		if ( ! empty( $item['b64_json'] ) ) {
			$bytes = base64_decode( $item['b64_json'] ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
		} elseif ( ! empty( $item['url'] ) ) {
			$download = wp_remote_get( esc_url_raw( $item['url'] ), array( 'timeout' => 60 ) );
			$bytes    = is_wp_error( $download ) ? '' : wp_remote_retrieve_body( $download );
		} else {
			$bytes = '';
		}
		if ( ! $bytes ) {
			return new WP_Error( 'lucy_no_image', __( 'OpenAI did not return an image. Please try again.', 'lucy-ai-content' ) );
		}

		$format = isset( $data['output_format'] ) ? (string) $data['output_format'] : ( isset( $payload['output_format'] ) ? $payload['output_format'] : 'png' );
		return array(
			'bytes'  => $bytes,
			'format' => $format,
			'usage'  => isset( $data['usage'] ) && is_array( $data['usage'] ) ? $data['usage'] : array(),
		);
	}
}
