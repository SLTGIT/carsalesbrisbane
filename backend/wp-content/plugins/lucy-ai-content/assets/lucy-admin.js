/**
 * Lucy admin JavaScript (no build step, no libraries).
 *
 * Generate screen flow:
 *   1. form      → editor enters a topic
 *   2. progress  → AJAX "lucy_generate_text", then (optional) "lucy_generate_image"
 *   3. review    → editor edits title, article, FAQs, SEO fields, alt text
 *   4. done      → AJAX "lucy_save_draft" created a WordPress draft
 *
 * If anything fails, the editor's text is kept and a "Try again" button appears.
 */
( function () {
	'use strict';

	var D = window.LucyData || {};
	var T = D.i18n || {};

	function $( sel, root ) { return ( root || document ).querySelector( sel ); }
	function $$( sel, root ) { return Array.prototype.slice.call( ( root || document ).querySelectorAll( sel ) ); }
	function show( el ) { if ( el ) { el.classList.remove( 'lucy-hidden' ); } }
	function hide( el ) { if ( el ) { el.classList.add( 'lucy-hidden' ); } }
	function val( sel ) { var el = $( sel ); return el ? el.value : ''; }
	function setVal( sel, v ) { var el = $( sel ); if ( el ) { el.value = v == null ? '' : v; } }

	/** POST to admin-ajax.php. Always resolves to { ok, data }. */
	function post( action, fields ) {
		var body = new FormData();
		body.append( 'action', action );
		body.append( 'nonce', D.nonce );
		Object.keys( fields || {} ).forEach( function ( k ) {
			if ( fields[ k ] !== undefined && fields[ k ] !== null ) {
				body.append( k, fields[ k ] );
			}
		} );
		return fetch( D.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: body } )
			.then( function ( res ) {
				return res.text().then( function ( text ) {
					var json = null;
					try { json = JSON.parse( text ); } catch ( e ) { json = null; }
					if ( ! json ) {
						return { ok: false, data: { message: T.networkError + ' (HTTP ' + res.status + ')' } };
					}
					return { ok: !! json.success, data: json.data || {} };
				} );
			} )
			.catch( function () {
				return { ok: false, data: { message: T.networkError } };
			} );
	}

	/* ------------------------------------------------------------------
	 * Character counters (any field with <span class="lucy-counter">)
	 * ------------------------------------------------------------------ */
	function initCounters() {
		$$( '.lucy-counter' ).forEach( function ( counter ) {
			var input = document.getElementById( counter.getAttribute( 'data-for' ) );
			var max = parseInt( counter.getAttribute( 'data-max' ), 10 );
			if ( ! input ) { return; }
			var update = function () {
				var len = Array.from( input.value || '' ).length;
				counter.textContent = len.toLocaleString() + ' / ' + max.toLocaleString();
				counter.classList.toggle( 'over', len > max );
			};
			input.addEventListener( 'input', update );
			input._lucyCount = update;
			update();
		} );
	}
	function refreshCounters() {
		$$( '.lucy-counter' ).forEach( function ( c ) {
			var input = document.getElementById( c.getAttribute( 'data-for' ) );
			if ( input && input._lucyCount ) { input._lucyCount(); }
		} );
	}

	/* ------------------------------------------------------------------
	 * Settings + Super Admin pages
	 * ------------------------------------------------------------------ */
	function initSettings() {
		var copy = $( '#lucy-copy-export' );
		if ( copy ) {
			copy.addEventListener( 'click', function () {
				var area = $( '#lucy-export' );
				area.select();
				var done = function () { copy.textContent = T.copied + ' ✓'; };
				if ( navigator.clipboard ) {
					navigator.clipboard.writeText( area.value ).then( done, function () { document.execCommand( 'copy' ); done(); } );
				} else {
					document.execCommand( 'copy' );
					done();
				}
			} );
		}

		// Model selects: show the "custom model" box only when "Other" is chosen.
		[ 'text', 'image' ].forEach( function ( kind ) {
			var select = $( '#lucy-' + kind + '-model' );
			var custom = $( '#lucy-' + kind + '-model-custom' );
			if ( ! select || ! custom ) { return; }
			var wrap = custom.closest( '.lucy-field' );
			var sync = function () { ( select.value === '__custom' ? show : hide )( wrap ); };
			select.addEventListener( 'change', sync );
			sync();
		} );

		var test = $( '#lucy-test-connection' );
		if ( test ) {
			test.addEventListener( 'click', function () {
				var out = $( '#lucy-test-result' );
				test.disabled = true;
				out.textContent = '…';
				out.style.color = '';
				post( 'lucy_test_connection', { api_key: val( '#lucy-api-key' ) } ).then( function ( r ) {
					test.disabled = false;
					if ( ! r.ok ) {
						out.textContent = '✕ ' + r.data.message;
						out.style.color = '#c63f55';
						return;
					}
					var msg = '✓ ' + r.data.message;
					if ( r.data.missing && r.data.missing.length ) {
						msg += ' ⚠ Not available to this key: ' + r.data.missing.join( ', ' ) + '. Choose another model below and save.';
						out.style.color = '#b78330';
					} else {
						out.style.color = '#338665';
					}
					out.textContent = msg + ' (Reload the page to see the full model list.)';
				} );
			} );
		}
	}

	/* ------------------------------------------------------------------
	 * Generate page
	 * ------------------------------------------------------------------ */
	function initGenerate() {
		var form = $( '#lucy-generate-form' );
		if ( ! form ) { return; }

		var state = { request: null, draft: null, image: null, failedAt: null, dirty: false };
		var steps = {
			form: $( '#lucy-step-form' ),
			progress: $( '#lucy-step-progress' ),
			review: $( '#lucy-step-review' ),
			done: $( '#lucy-step-done' )
		};
		var heading = $( '#lucy-generate-heading' );
		var editor = $( '#lucy-r-article' );

		function showStep( name ) {
			Object.keys( steps ).forEach( function ( k ) { ( k === name ? show : hide )( steps[ k ] ); } );
			( name === 'form' ? show : hide )( heading );
			hide( $( '#lucy-resume' ) );
			window.scrollTo( { top: 0, behavior: 'smooth' } );
		}

		/* --- Form ------------------------------------------------------ */
		// Pasting your own content switches Lucy into "improve my text" mode automatically.
		var syncMode = function () {
			var pasted = val( '#lucy-reference' ).trim();
			$( '#lucy-mode' ).value = pasted ? 'rewrite' : 'new';
		};
		var refBox = $( '#lucy-reference' );
		if ( refBox ) { refBox.addEventListener( 'input', syncMode ); }
		syncMode();

		function readForm() {
			var choice = val( '#lucy-image-choice' );
			syncMode();
			return {
				mode: val( '#lucy-mode' ),
				words: val( '#lucy-words' ),
				faqs: val( '#lucy-faqs' ),
				topic: val( '#lucy-topic' ).trim(),
				keywords: val( '#lucy-keywords' ),
				extra: val( '#lucy-extra' ),
				reference: val( '#lucy-reference' ),
				reference_url: val( '#lucy-reference-url' ).trim(),
				category: val( '#lucy-category' ),
				image_template: choice === '__ai' ? '' : choice,
				with_image: choice === '__ai' ? 1 : 0
			};
		}
		function fillForm( req ) {
			if ( ! req ) { return; }
			setVal( '#lucy-mode', req.mode );
			setVal( '#lucy-topic', req.topic );
			setVal( '#lucy-keywords', req.keywords );
			setVal( '#lucy-extra', req.extra );
			setVal( '#lucy-reference', req.reference );
			setVal( '#lucy-reference-url', req.reference_url || '' );
			setVal( '#lucy-words', req.words || '' );
			setVal( '#lucy-faqs', req.faqs || '' );
			setVal( '#lucy-category', req.category || '0' );
			setVal( '#lucy-image-choice', req.image_template || ( req.with_image ? '__ai' : '' ) );
			syncMode();
			refreshCounters();
		}

		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var err = $( '#lucy-form-error' );
			hide( err );
			var req = readForm();
			if ( ! req.topic ) {
				err.textContent = T.topicRequired; show( err ); $( '#lucy-topic' ).focus(); return;
			}
			if ( req.mode === 'rewrite' && ! req.reference.trim() ) {
				err.textContent = T.referenceRequired; show( err ); $( '#lucy-reference' ).focus(); return;
			}
			state.request = req;
			runGeneration();
		} );

		/* --- Progress -------------------------------------------------- */
		function setStep( name, status ) {
			var li = $( '.lucy-steps li[data-step="' + name + '"]' );
			if ( li ) { li.className = status || ''; }
		}
		function progressError( message, where ) {
			state.failedAt = where;
			var box = $( '#lucy-progress-error' );
			box.textContent = message;
			show( box );
			show( $( '#lucy-progress-actions' ) );
			( where === 'image' ? show : hide )( $( '[data-lucy="skip-image"]' ) );
			( where === 'image' ? hide : show )( $( '[data-lucy="back"]' ) );
		}

		function runGeneration() {
			showStep( 'progress' );
			hide( $( '#lucy-progress-error' ) );
			hide( $( '#lucy-progress-actions' ) );
			[ 'write', 'check', 'image', 'ready' ].forEach( function ( s ) { setStep( s, '' ); } );
			setStep( 'write', 'running' );

			post( 'lucy_generate_text', state.request ).then( function ( r ) {
				if ( ! r.ok ) {
					setStep( 'write', 'failed' );
					progressError( r.data.message, 'text' );
					return;
				}
				state.draft = r.data.draft;
				state.image = null;
				if ( r.data.referenceNote ) { state.referenceNote = r.data.referenceNote; }
				setStep( 'write', 'done' );
				setStep( 'check', 'done' );
				if ( r.data.wantImage ) {
					runImageInProgress();
				} else {
					setStep( 'image', 'skipped' );
					finishProgress();
				}
			} );
		}

		function runImageInProgress() {
			hide( $( '#lucy-progress-error' ) );
			hide( $( '#lucy-progress-actions' ) );
			setStep( 'image', 'running' );
			requestImage().then( function ( r ) {
				if ( ! r.ok ) {
					setStep( 'image', 'failed' );
					progressError( r.data.message, 'image' );
					return;
				}
				setStep( 'image', 'done' );
				finishProgress();
			} );
		}

		function finishProgress() {
			setStep( 'ready', 'done' );
			setTimeout( function () { showReview(); }, 400 );
		}

		function requestImage() {
			var d = state.draft || {};
			return post( 'lucy_generate_image', {
				image_template: ( state.request && state.request.image_template ) || '',
				title: $( '#lucy-r-title' ).value || d.title,
				slug: val( '#lucy-r-slug' ) || d.slug,
				image_alt_text: val( '#lucy-r-alt' ) || d.image_alt_text,
				image_prompt: val( '#lucy-r-image-prompt' ) || d.image_prompt
			} ).then( function ( r ) {
				if ( r.ok ) {
					state.image = r.data.image;
					if ( r.data.image_prompt ) { state.draft.image_prompt = r.data.image_prompt; }
					renderImage();
				}
				return r;
			} );
		}

		$( '[data-lucy="retry"]' ).addEventListener( 'click', function () {
			if ( state.failedAt === 'image' ) { runImageInProgress(); } else { runGeneration(); }
		} );
		$( '[data-lucy="back"]' ).addEventListener( 'click', function () {
			if ( state.failedAt === 'image' && state.draft ) { showReview(); return; }
			showStep( 'form' );
		} );
		$( '[data-lucy="skip-image"]' ).addEventListener( 'click', function () {
			setStep( 'image', 'skipped' );
			showReview();
		} );

		/* --- Review ---------------------------------------------------- */
		function renderImage() {
			var box = $( '#lucy-image' );
			box.innerHTML = '';
			if ( state.image && state.image.url ) {
				var img = document.createElement( 'img' );
				img.src = state.image.url;
				img.alt = val( '#lucy-r-alt' ) || ( state.draft && state.draft.image_alt_text ) || '';
				box.appendChild( img );
			} else {
				var empty = document.createElement( 'div' );
				empty.className = 'lucy-image-empty';
				empty.textContent = 'No featured image yet';
				box.appendChild( empty );
			}
			var btn = $( '#lucy-image-btn' );
			if ( btn ) { btn.textContent = state.image ? '✧ Create a new image' : '✧ Create image'; }
		}

		function faqRow( faq ) {
			var wrap = document.createElement( 'div' );
			wrap.className = 'lucy-faq';
			var q = document.createElement( 'input' );
			q.type = 'text';
			q.className = 'lucy-faq-q';
			q.placeholder = 'Question';
			q.setAttribute( 'aria-label', 'FAQ question' );
			q.value = faq.question || '';
			var a = document.createElement( 'textarea' );
			a.className = 'lucy-faq-a';
			a.placeholder = 'Answer';
			a.setAttribute( 'aria-label', 'FAQ answer' );
			a.style.marginTop = '8px';
			a.value = faq.answer || '';
			var rm = document.createElement( 'button' );
			rm.type = 'button';
			rm.className = 'lucy-link';
			rm.style.color = '#c63f55';
			rm.style.marginTop = '6px';
			rm.textContent = 'Remove';
			rm.addEventListener( 'click', function () { wrap.remove(); markDirty(); } );
			[ q, a ].forEach( function ( el ) { el.addEventListener( 'input', markDirty ); } );
			wrap.appendChild( q );
			wrap.appendChild( a );
			wrap.appendChild( rm );
			return wrap;
		}

		function renderFaqs( faqs ) {
			var list = $( '#lucy-r-faqs' );
			list.innerHTML = '';
			( faqs || [] ).forEach( function ( f ) { list.appendChild( faqRow( f ) ); } );
		}
		$( '#lucy-add-faq' ).addEventListener( 'click', function () {
			var row = faqRow( {} );
			$( '#lucy-r-faqs' ).appendChild( row );
			row.querySelector( 'input' ).focus();
		} );

		function showReview() {
			var d = state.draft;
			if ( ! d ) { showStep( 'form' ); return; }
			setVal( '#lucy-r-title', d.title );
			editor.innerHTML = d.article_html || ''; // Already cleaned by the server (wp_kses).
			renderFaqs( d.faqs );
			setVal( '#lucy-r-meta-title', d.meta_title );
			setVal( '#lucy-r-meta-description', d.meta_description );
			setVal( '#lucy-r-focus-keyword', d.focus_keyword );
			setVal( '#lucy-r-slug', d.slug );
			setVal( '#lucy-r-excerpt', d.excerpt );
			setVal( '#lucy-r-tags', ( d.tags || [] ).join( ', ' ) );
			setVal( '#lucy-r-alt', d.image_alt_text );
			setVal( '#lucy-r-image-prompt', d.image_prompt );
			setVal( '#lucy-r-category', ( state.request && state.request.category ) || '0' );

			var notes = $( '#lucy-notes' );
			notes.innerHTML = '';
			( d.review_notes || [] ).forEach( function ( n ) {
				var li = document.createElement( 'li' );
				li.className = 'todo';
				li.textContent = n;
				notes.appendChild( li );
			} );
			( d.review_notes && d.review_notes.length ? show : hide )( $( '#lucy-notes-wrap' ) );

			hide( $( '#lucy-save-error' ) );
			hide( $( '#lucy-save-anyway' ) );
			hide( $( '#lucy-image-error' ) );
			renderImage();
			refreshCounters();
			updateChecks();
			state.dirty = false;
			showStep( 'review' );
		}

		function collectDraft() {
			return {
				title: val( '#lucy-r-title' ).trim(),
				article_html: editor.innerHTML,
				faqs: JSON.stringify( $$( '.lucy-faq' ).map( function ( row ) {
					return { question: row.querySelector( '.lucy-faq-q' ).value.trim(), answer: row.querySelector( '.lucy-faq-a' ).value.trim() };
				} ).filter( function ( f ) { return f.question && f.answer; } ) ),
				meta_title: val( '#lucy-r-meta-title' ),
				meta_description: val( '#lucy-r-meta-description' ),
				focus_keyword: val( '#lucy-r-focus-keyword' ),
				slug: val( '#lucy-r-slug' ),
				excerpt: val( '#lucy-r-excerpt' ),
				tags: val( '#lucy-r-tags' ),
				image_alt_text: val( '#lucy-r-alt' ),
				category: val( '#lucy-r-category' )
			};
		}

		/** Blocked-word check in the browser (the server checks again when saving). */
		function findBlocked() {
			var terms = D.blockedTerms || [];
			if ( ! terms.length ) { return []; }
			var text = [ val( '#lucy-r-title' ), val( '#lucy-r-meta-title' ), val( '#lucy-r-meta-description' ), val( '#lucy-r-excerpt' ), editor.textContent, val( '#lucy-r-tags' ), val( '#lucy-r-alt' ) ]
				.concat( $$( '.lucy-faq input, .lucy-faq textarea' ).map( function ( el ) { return el.value; } ) ).join( ' \n ' );
			return terms.filter( function ( term ) {
				var escaped = term.trim().replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ).replace( /\s+/g, '\\s+' );
				try {
					return new RegExp( '(?<![\\p{L}\\p{N}])' + escaped + '(?![\\p{L}\\p{N}])', 'iu' ).test( text );
				} catch ( e ) {
					return text.toLowerCase().indexOf( term.toLowerCase() ) !== -1;
				}
			} );
		}

		function updateChecks() {
			var words = ( editor.textContent || '' ).trim().split( /\s+/ ).filter( Boolean ).length;
			var target = D.wordTarget || 0;
			var metaT = Array.from( val( '#lucy-r-meta-title' ) ).length;
			var metaD = Array.from( val( '#lucy-r-meta-description' ) ).length;
			var kw = val( '#lucy-r-focus-keyword' ).trim().toLowerCase();
			var faqs = $$( '.lucy-faq' ).length;
			var blocked = findBlocked();
			var items = [
				[ words >= target * 0.8 ? 'ok' : 'todo', words.toLocaleString() + ' words' + ( target ? ' (target ' + target.toLocaleString() + ')' : '' ) ],
				[ metaT > 0 && metaT <= 60 ? 'ok' : 'todo', 'Meta title ' + metaT + '/60 characters' ],
				[ metaD >= 120 && metaD <= 160 ? 'ok' : 'todo', 'Meta description ' + metaD + '/160 characters' ],
				[ kw && val( '#lucy-r-title' ).toLowerCase().indexOf( kw ) !== -1 ? 'ok' : 'todo', 'Focus keyword in title' ],
				[ faqs > 0 || ! D.faqTarget ? 'ok' : 'todo', faqs + ' FAQs' ],
				[ state.image ? 'ok' : 'todo', state.image ? 'Featured image ready' : 'No featured image' ],
				[ blocked.length ? 'bad' : 'ok', blocked.length ? 'Blocked words found' : 'No blocked words' ],
				[ 'todo', 'Facts, prices and links need human review' ]
			];
			var list = $( '#lucy-checks' );
			list.innerHTML = '';
			items.forEach( function ( it ) {
				var li = document.createElement( 'li' );
				li.className = it[ 0 ];
				li.textContent = it[ 1 ];
				list.appendChild( li );
			} );
			var box = $( '#lucy-blocked' );
			if ( blocked.length ) {
				box.textContent = 'Please remove or replace: ' + blocked.join( ', ' );
				show( box );
			} else {
				hide( box );
			}
			updateSerp();
		}

		function updateSerp() {
			var slug = val( '#lucy-r-slug' ) || 'your-post';
			$( '#lucy-serp-url' ).textContent = ( D.siteUrl || '' ).replace( /\/$/, '' ) + '/' + slug + '/';
			$( '#lucy-serp-title' ).textContent = val( '#lucy-r-meta-title' ) || val( '#lucy-r-title' ) || 'Meta title';
			$( '#lucy-serp-desc' ).textContent = val( '#lucy-r-meta-description' ) || 'Meta description';
		}

		function markDirty() { state.dirty = true; }
		var checkTimer = null;
		function scheduleChecks() { markDirty(); clearTimeout( checkTimer ); checkTimer = setTimeout( updateChecks, 250 ); }
		editor.addEventListener( 'input', scheduleChecks );
		$$( '#lucy-step-review input, #lucy-step-review textarea' ).forEach( function ( el ) { el.addEventListener( 'input', scheduleChecks ); } );
		$( '#lucy-r-faqs' ).addEventListener( 'input', scheduleChecks );

		// Paste as plain text so no hidden formatting ends up in the post.
		editor.addEventListener( 'paste', function ( e ) {
			var text = ( e.clipboardData || window.clipboardData ).getData( 'text/plain' );
			e.preventDefault();
			document.execCommand( 'insertText', false, text );
		} );

		// Formatting toolbar.
		$$( '.lucy-toolbar button' ).forEach( function ( b ) {
			b.addEventListener( 'mousedown', function ( e ) { e.preventDefault(); } ); // keep the text selection
			b.addEventListener( 'click', function () {
				var cmd = b.getAttribute( 'data-cmd' );
				var arg = b.getAttribute( 'data-arg' );
				editor.focus();
				if ( cmd === 'createLink' ) {
					var url = window.prompt( 'Link address (https://…)', 'https://' );
					if ( ! url || url === 'https://' ) { return; }
					document.execCommand( 'createLink', false, url );
				} else if ( cmd === 'formatBlock' ) {
					document.execCommand( 'formatBlock', false, '<' + arg + '>' );
				} else {
					document.execCommand( cmd, false, null );
				}
				scheduleChecks();
			} );
		} );

		// New image from the review screen.
		var imageBtn = $( '#lucy-image-btn' );
		if ( imageBtn ) {
			imageBtn.addEventListener( 'click', function () {
				var err = $( '#lucy-image-error' );
				hide( err );
				imageBtn.disabled = true;
				var label = imageBtn.textContent;
				imageBtn.textContent = '✧ Creating image… (up to a minute)';
				requestImage().then( function ( r ) {
					imageBtn.disabled = false;
					if ( ! r.ok ) {
						imageBtn.textContent = label;
						err.textContent = r.data.message;
						show( err );
						return;
					}
					updateChecks();
				} );
			} );
		}

		/* --- Save / discard -------------------------------------------- */
		function save( force ) {
			var err = $( '#lucy-save-error' );
			var btn = $( '#lucy-save-btn' );
			var anyway = $( '#lucy-save-anyway' );
			hide( err );
			var data = collectDraft();
			if ( ! data.title ) {
				err.textContent = T.titleRequired; show( err ); $( '#lucy-r-title' ).focus(); return;
			}
			data.force = force ? 1 : 0;
			btn.disabled = true;
			anyway.disabled = true;
			post( 'lucy_save_draft', data ).then( function ( r ) {
				btn.disabled = false;
				anyway.disabled = false;
				if ( ! r.ok ) {
					var msg = r.data.message || 'Error';
					if ( r.data.blocked && r.data.blocked.length ) {
						msg += ' ' + r.data.blocked.map( function ( b ) { return '“' + b.term + '” (' + b.fields.join( ', ' ) + ')'; } ).join( '; ' );
					}
					err.textContent = msg;
					show( err );
					( r.data.needsConfirm ? show : hide )( anyway );
					return;
				}
				state.dirty = false;
				state.draft = null;
				state.image = null;
				$( '#lucy-done-edit' ).href = r.data.edit_url;
				$( '#lucy-done-preview' ).href = r.data.preview_url;
				var seo = r.data.seo && r.data.seo !== 'None detected' ? ' SEO fields were added to ' + r.data.seo + '.' : '';
				$( '#lucy-done-text' ).textContent = 'Open it in the editor to make final changes, then publish when you are happy.' + seo;
				showStep( 'done' );
			} );
		}
		$( '#lucy-save-btn' ).addEventListener( 'click', function () { save( false ); } );
		$( '#lucy-save-anyway' ).addEventListener( 'click', function () { save( true ); } );

		function discard() {
			if ( ! window.confirm( T.confirmDiscard ) ) { return; }
			post( 'lucy_discard_draft', {} ).then( function () {
				state.draft = null;
				state.image = null;
				state.dirty = false;
				showStep( 'form' );
			} );
		}
		$( '#lucy-discard' ).addEventListener( 'click', discard );
		$( '#lucy-regenerate' ).addEventListener( 'click', function () {
			fillForm( state.request );
			showStep( 'form' );
			$( '#lucy-topic' ).focus();
		} );
		$( '#lucy-done-new' ).addEventListener( 'click', function () {
			form.reset();
			syncMode();
			refreshCounters();
			showStep( 'form' );
		} );

		// Warn before leaving the page with unsaved edits (the generated draft itself is kept for 24h).
		window.addEventListener( 'beforeunload', function ( e ) {
			if ( state.dirty && ! steps.review.classList.contains( 'lucy-hidden' ) ) {
				e.preventDefault();
				e.returnValue = '';
			}
		} );

		/* --- Resume an unsaved draft after reload ---------------------- */
		if ( D.savedDraft && D.savedDraft.draft ) {
			var banner = $( '#lucy-resume' );
			$( '#lucy-resume-title' ).textContent = D.savedDraft.draft.title || '';
			$( '#lucy-resume-age' ).textContent = D.savedDraft.updated ? ' (' + D.savedDraft.updated + ' ago)' : '';
			show( banner );
			$( '#lucy-resume-open' ).addEventListener( 'click', function () {
				state.request = D.savedDraft.request;
				state.draft = D.savedDraft.draft;
				state.image = D.savedDraft.image;
				fillForm( state.request );
				showReview();
			} );
			$( '#lucy-resume-discard' ).addEventListener( 'click', function () {
				post( 'lucy_discard_draft', {} ).then( function () { hide( banner ); } );
			} );
		}
	}

	document.addEventListener( 'DOMContentLoaded', function () {
		initCounters();
		initSettings();
		initGenerate();
	} );
}() );

/* ------------------------------------------------------------------
 * Image templates screen: pick a background, live preview
 * ------------------------------------------------------------------ */
( function () {
	'use strict';
	var form = document.getElementById( 'lucy-template-form' );
	if ( ! form ) { return; }
	var $ = function ( sel ) { return document.querySelector( sel ); };
	var imageField = $( '#lucy-tpl-image' );
	var preview = $( '#lucy-tpl-preview' );
	var frame = null;
	var timer = null;

	function settings() {
		var out = { image_id: imageField.value };
		[ 'font', 'font_size', 'colour', 'line_height', 'align', 'valign', 'box_x', 'box_y', 'box_w', 'overlay', 'max_lines', 'cover_x', 'cover_y', 'cover_w', 'cover_h', 'background', 'logo_pos', 'logo_size' ].forEach( function ( key ) {
			var node = $( '#lucy-tpl-' + key );
			if ( node ) { out[ key ] = node.value; }
		} );
		[ 'uppercase', 'shadow', 'cover', 'show_logo', 'use_brand', 'band', 'thumbnail' ].forEach( function ( key ) {
			var node = $( '#lucy-tpl-' + key );
			out[ key ] = node && node.checked ? 1 : 0;
		} );
		return out;
	}

	function draw() {
		var mode = $( '#lucy-tpl-background' );
		if ( ! imageField.value && ( ! mode || mode.value !== 'brand' ) ) {
			preview.innerHTML = '<p class="lucy-small">Choose a background picture to see the preview.</p>';
			return;
		}
		preview.innerHTML = '<p class="lucy-small">Drawing the preview…</p>';
		var body = new FormData();
		body.append( 'action', 'lucy_preview_template' );
		body.append( 'nonce', ( window.LucyAdmin && window.LucyAdmin.nonce ) || '' );
		body.append( 'title', ( $( '#lucy-tpl-sample' ) || {} ).value || '' );
		var s = settings();
		Object.keys( s ).forEach( function ( key ) { body.append( 'tpl[' + key + ']', s[ key ] ); } );
		fetch( ( window.LucyAdmin && window.LucyAdmin.ajaxUrl ) || window.ajaxurl, { method: 'POST', body: body, credentials: 'same-origin' } )
			.then( function ( r ) { return r.json(); } )
			.then( function ( r ) {
				if ( r && r.success && r.data.preview ) {
					preview.innerHTML = '<img alt="Preview of your image template" src="' + r.data.preview + '">';
				} else {
					preview.innerHTML = '<p class="lucy-small">' + ( ( r && r.data && r.data.message ) || 'Preview failed.' ) + '</p>';
				}
			} )
			.catch( function () { preview.innerHTML = '<p class="lucy-small">Preview failed.</p>'; } );
	}
	function later() { clearTimeout( timer ); timer = setTimeout( draw, 500 ); }

	var picker = $( '#lucy-pick-image' );
	if ( picker && window.wp && window.wp.media ) {
		picker.addEventListener( 'click', function () {
			if ( ! frame ) {
				frame = window.wp.media( { title: 'Choose a background picture', library: { type: 'image' }, button: { text: 'Use this picture' }, multiple: false } );
				frame.on( 'select', function () {
					var chosen = frame.state().get( 'selection' ).first().toJSON();
					imageField.value = chosen.id;
					draw();
				} );
			}
			frame.open();
		} );
	}
	var learn = $( '#lucy-learn-image' );
	if ( learn ) {
		learn.addEventListener( 'click', function () {
			var out = $( '#lucy-learn-result' );
			if ( ! imageField.value ) { out.textContent = 'Choose a picture first.'; return; }
			learn.setAttribute( 'aria-disabled', 'true' );
			out.textContent = 'Lucy is reading the picture…';
			var body = new FormData();
			body.append( 'action', 'lucy_learn_template' );
			body.append( 'nonce', ( window.LucyAdmin && window.LucyAdmin.nonce ) || '' );
			body.append( 'image_id', imageField.value );
			fetch( ( window.LucyAdmin && window.LucyAdmin.ajaxUrl ) || window.ajaxurl, { method: 'POST', body: body, credentials: 'same-origin' } )
				.then( function ( r ) { return r.json(); } )
				.then( function ( r ) {
					learn.removeAttribute( 'aria-disabled' );
					if ( ! r || ! r.success ) {
						out.textContent = ( r && r.data && r.data.message ) || 'Lucy could not read that picture.';
						return;
					}
					var got = r.data.settings;
					Object.keys( got ).forEach( function ( key ) {
						var node = $( '#lucy-tpl-' + key );
						if ( ! node ) { return; }
						if ( node.type === 'checkbox' ) { node.checked = !! got[ key ]; }
						else { node.value = got[ key ]; }
					} );
					out.textContent = 'Found the title: ' + got.lines + ' line' + ( got.lines > 1 ? 's' : '' ) + ', ' +
						got.align + ' aligned at the ' + got.valign + ', about ' + got.font_size + 'px, colour ' + got.colour + '. ' +
						( got.cover
							? 'Lucy will cover those words and write each blog title in the same place. Nudge anything that looks off, then save.'
							: 'Lucy has copied the position and size, but it cannot rub the old words out cleanly – they sit across too much detail. Upload the same design without text on it, or move the headline somewhere clear.' );
					draw();
				} )
				.catch( function () { learn.removeAttribute( 'aria-disabled' ); out.textContent = 'Lucy could not read that picture.'; } );
		} );
	}

	form.addEventListener( 'input', later );
	form.addEventListener( 'change', later );
	var refresh = $( '#lucy-tpl-refresh' );
	if ( refresh ) { refresh.addEventListener( 'click', draw ); }
	var sample = $( '#lucy-tpl-sample' );
	if ( sample ) { sample.addEventListener( 'input', later ); }
	draw();
}() );

/* Brand logo picker on the Growth profile screen */
( function () {
	'use strict';
	var pick = document.getElementById( 'lucy-pick-logo' );
	if ( ! pick || ! window.wp || ! window.wp.media ) { return; }
	var field = document.getElementById( 'lucy-brand-logo-id' );
	var preview = document.getElementById( 'lucy-brand-logo-preview' );
	var frame = null;
	pick.addEventListener( 'click', function () {
		if ( ! frame ) {
			frame = window.wp.media( { title: 'Choose your logo', library: { type: 'image' }, button: { text: 'Use this logo' }, multiple: false } );
			frame.on( 'select', function () {
				var chosen = frame.state().get( 'selection' ).first().toJSON();
				field.value = chosen.id;
				preview.innerHTML = '<img alt="" src="' + ( chosen.sizes && chosen.sizes.medium ? chosen.sizes.medium.url : chosen.url ) + '">';
			} );
		}
		frame.open();
	} );
	var clear = document.getElementById( 'lucy-clear-logo' );
	if ( clear ) {
		clear.addEventListener( 'click', function () {
			field.value = '0';
			preview.innerHTML = '<span class="lucy-small">No logo yet</span>';
		} );
	}
}() );
