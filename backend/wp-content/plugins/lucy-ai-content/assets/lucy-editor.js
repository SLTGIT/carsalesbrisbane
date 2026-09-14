/**
 * “Write with Lucy” inside the post editor.
 *
 * One button, one popup: title, reference link, keywords, instruction and an image template.
 * Lucy writes the whole article, then puts it into the editor you are already in.
 * No build step – plain wp.element.
 */
( function ( wp ) {
	'use strict';
	if ( ! wp || ! wp.element || ! wp.plugins || ! wp.data ) { return; }

	var el = wp.element.createElement;
	var useState = wp.element.useState;
	var C = wp.components;
	var select = wp.data.select;
	var dispatch = wp.data.dispatch;
	var apiFetch = wp.apiFetch;
	var CFG = window.LucyEditor || {};
	var PanelSlot = ( wp.editor && wp.editor.PluginDocumentSettingPanel ) || ( wp.editPost && wp.editPost.PluginDocumentSettingPanel ) || null;
	var icon = el( 'svg', { width: 20, height: 20, viewBox: '0 0 20 20', 'aria-hidden': true },
		el( 'path', { fill: 'currentColor', d: 'M10 1l2.2 5.8L18 9l-5.8 2.2L10 17l-2.2-5.8L2 9l5.8-2.2z' } ) );

	function editor() { return select( 'core/editor' ); }
	function postId() { var e = editor(); return e ? e.getCurrentPostId() : 0; }
	function postTitle() { var e = editor(); return e ? ( e.getEditedPostAttribute( 'title' ) || '' ) : ''; }

	/* ------------------------------------------------------------------
	 * The popup
	 * ------------------------------------------------------------------ */
	function WriteModal( props ) {
		var f = useState( {
			title: postTitle(),
			keywords: CFG.defaultKeywords || '',
			reference_url: '',
			reference_text: '',
			instruction: '',
			words: CFG.words || 1200,
			faqs: CFG.faqs === undefined ? 4 : CFG.faqs,
			image_template: CFG.defaultTemplate || ''
		} );
		var form = f[ 0 ], setForm = f[ 1 ];
		var s = useState( { busy: false, error: '', draft: null, note: '', saving: false } );
		var st = s[ 0 ], setSt = s[ 1 ];
		var set = function ( key ) {
			return function ( value ) { var next = {}; next[ key ] = value; setForm( Object.assign( {}, form, next ) ); };
		};

		function generate() {
			if ( st.busy ) { return; }
			if ( ! form.title.trim() ) { setSt( Object.assign( {}, st, { error: 'Give Lucy a title or topic to write about.' } ) ); return; }
			setSt( { busy: true, error: '', draft: null, note: '', saving: false } );
			apiFetch( {
				path: '/lucy/v1/write',
				method: 'POST',
				data: Object.assign( {}, form, { post_id: postId() } )
			} ).then( function ( draft ) {
				setSt( { busy: false, error: '', draft: draft, note: draft.reference ? 'Lucy read your reference page: “' + ( draft.reference.title || draft.reference.url ) + '”.' : '', saving: false } );
			} ).catch( function ( err ) {
				setSt( { busy: false, error: ( err && err.message ) || 'Lucy could not finish that. Try again.', draft: null, note: '', saving: false } );
			} );
		}

		/** Puts the finished article into the editor. */
		function insert() {
			var draft = st.draft;
			if ( ! draft ) { return; }
			setSt( Object.assign( {}, st, { saving: true } ) );
			var blocks = wp.blocks.rawHandler( { HTML: draft.content || draft.article_html || '' } );
			dispatch( 'core/block-editor' ).resetBlocks( blocks );
			dispatch( 'core/editor' ).editPost( { title: draft.title, excerpt: draft.excerpt } );
			if ( draft.image && draft.image.id ) {
				dispatch( 'core/editor' ).editPost( { featured_media: draft.image.id } );
			}
			var id = postId();
			if ( ! id ) {
				setSt( Object.assign( {}, st, { saving: false } ) );
				props.onClose();
				notice( 'Article inserted. Save the post once and Lucy will add the SEO fields.' );
				return;
			}
			apiFetch( {
				path: '/lucy/v1/apply',
				method: 'POST',
				data: { post_id: id, draft: draft, image_id: draft.image ? draft.image.id : 0 }
			} ).then( function () {
				setSt( Object.assign( {}, st, { saving: false } ) );
				props.onClose();
				notice( 'Article inserted, with the SEO fields, FAQs' + ( draft.image ? ' and featured image' : '' ) + '.' );
			} ).catch( function ( err ) {
				setSt( Object.assign( {}, st, { saving: false } ) );
				props.onClose();
				notice( 'Article inserted. The SEO fields could not be saved: ' + ( ( err && err.message ) || 'unknown error' ) );
			} );
		}

		var templates = ( CFG.imageTemplates || [] ).map( function ( t ) { return { label: 'Template: ' + t.name, value: t.id }; } );
		var imageOptions = [ { label: 'No featured image', value: '' } ].concat( templates );

		return el( C.Modal, { title: 'Write with Lucy', onRequestClose: props.onClose, className: 'lucy-write-modal', shouldCloseOnClickOutside: false },
			! CFG.active
				? el( C.Notice, { status: 'warning', isDismissible: false },
					CFG.notActiveMessage,
					CFG.canConfigure && CFG.setupUrl ? el( 'div', null, el( 'a', { href: CFG.setupUrl }, 'Finish setup →' ) ) : null )
				: null,
			CFG.demo ? el( C.Notice, { status: 'info', isDismissible: false }, 'Demo mode is on: Lucy writes sample text and never contacts OpenAI.' ) : null,
			el( 'div', { className: 'lucy-using' },
				el( 'p', { className: 'lucy-using-t' }, 'Lucy is writing as' ),
				el( 'p', null, el( 'b', null, CFG.business || 'this business' ), CFG.brands ? ' · ' + CFG.brands : '', CFG.city ? ' · ' + CFG.city : '' ),
				CFG.profileKeywords ? el( 'p', { className: 'lucy-write-hint' }, 'Keywords it already knows: ' + CFG.profileKeywords ) : null,
				CFG.settingsUrl ? el( 'p', { className: 'lucy-write-hint' }, el( 'a', { href: CFG.settingsUrl, target: '_blank', rel: 'noopener' }, 'Change the business name, brands or keywords →' ) ) : null,
				CFG.trainUrl ? el( 'p', { className: 'lucy-write-hint' }, el( 'a', { href: CFG.trainUrl, target: '_blank', rel: 'noopener' }, 'Train Lucy: her role, house rules and writing style →' ) ) : null
			),

			el( C.TextControl, { label: 'Title or topic', value: form.title, onChange: set( 'title' ), placeholder: 'e.g. How to buy a used ute under $70,000', __nextHasNoMarginBottom: true } ),
			el( C.TextControl, { label: 'Reference link (optional)', value: form.reference_url, onChange: set( 'reference_url' ), placeholder: 'https://example.com/an-article-you-like', help: 'Lucy reads this page and follows its angle, writing something original.', __nextHasNoMarginBottom: true } ),
			el( C.TextareaControl, { label: 'Or paste your own content (optional)', value: form.reference_text, onChange: set( 'reference_text' ), rows: 4, placeholder: 'Paste text you already have…', help: 'Lucy rewrites it around your keywords, structured so search engines and AI assistants can quote it. Your facts are kept.', __nextHasNoMarginBottom: true } ),
			el( C.TextControl, { label: 'Target keywords', value: form.keywords, onChange: set( 'keywords' ), placeholder: CFG.keywordHint || 'Comma separated, main keyword first', __nextHasNoMarginBottom: true } ),
			el( C.TextareaControl, { label: 'Anything else Lucy should do?', value: form.instruction, onChange: set( 'instruction' ), rows: 2, placeholder: 'e.g. mention our free first service, and keep it practical', __nextHasNoMarginBottom: true } ),
			el( 'div', { className: 'lucy-write-row' },
				el( C.TextControl, { label: 'Length (words)', type: 'number', value: form.words, onChange: function ( v ) { set( 'words' )( parseInt( v, 10 ) || 0 ); }, __nextHasNoMarginBottom: true } ),
				el( C.TextControl, { label: 'How many FAQs?', type: 'number', value: form.faqs, onChange: function ( v ) { set( 'faqs' )( v === '' ? 0 : ( parseInt( v, 10 ) || 0 ) ); }, help: 'Added at the end of the article.', __nextHasNoMarginBottom: true } )
			),
			el( C.SelectControl, { label: 'Featured image', value: form.image_template, options: imageOptions, onChange: set( 'image_template' ), __nextHasNoMarginBottom: true } ),
			! templates.length ? el( 'p', { className: 'lucy-write-hint' }, el( 'a', { href: CFG.imagesUrl, target: '_blank', rel: 'noopener' }, 'Add an image template →' ), ' Upload your own background and font once, and Lucy writes each title onto it.' ) : null,

			st.error ? el( C.Notice, { status: 'error', isDismissible: false }, st.error ) : null,

			el( 'div', { className: 'lucy-write-actions' },
				el( C.Button, { variant: 'primary', onClick: generate, 'aria-disabled': st.busy, className: st.busy ? 'is-busy' : '' },
					st.busy ? 'Lucy is writing…' : ( st.draft ? 'Write it again' : '✦ Generate with Lucy' ) ),
				el( C.Button, { variant: 'tertiary', onClick: props.onClose }, 'Cancel' )
			),
			st.busy ? el( 'p', { className: 'lucy-write-hint' }, 'Usually 30–90 seconds for a full article.' ) : null,

			st.draft ? el( 'div', { className: 'lucy-write-preview' },
				st.note ? el( 'p', { className: 'lucy-write-hint' }, st.note ) : null,
				el( 'h3', null, st.draft.title ),
				el( 'p', { className: 'lucy-write-hint' }, ( st.draft.word_count || '' ) + ' words · ' + ( st.draft.faqs ? st.draft.faqs.length : 0 ) + ' FAQs · ' + ( st.draft.image ? 'featured image ready' : 'no featured image' ) ),
				el( 'div', { className: 'lucy-serp' },
					el( 'div', { className: 'lucy-serp-t' }, st.draft.meta_title ),
					el( 'div', { className: 'lucy-serp-d' }, st.draft.meta_description )
				),
				st.draft.image ? el( 'img', { className: 'lucy-write-thumb', src: st.draft.image.url, alt: '' } ) : null,
				st.draft.image_error ? el( C.Notice, { status: 'warning', isDismissible: false }, 'The picture could not be made: ' + st.draft.image_error ) : null,
				st.draft.blocked && st.draft.blocked.length ? el( C.Notice, { status: 'warning', isDismissible: false }, 'Blocked word used: ' + st.draft.blocked.join( ', ' ) + '. Fix it after inserting.' ) : null,
				el( 'div', { className: 'lucy-write-article', dangerouslySetInnerHTML: { __html: st.draft.content || st.draft.article_html || '' } } ),
				st.draft.faqs && st.draft.faqs.length
					? el( 'div', { className: 'lucy-write-faqs' },
						el( 'p', { className: 'lucy-ed-label' }, st.draft.faqs.length + ' FAQs (added to the end of the article and saved as FAQ structured data)' ),
						st.draft.faqs.map( function ( q, i ) {
							return el( 'p', { key: i }, el( 'b', null, q.question ), ' ', q.answer );
						} ) )
					: null,
				st.draft.review_notes && st.draft.review_notes.length
					? el( 'div', { className: 'lucy-write-check' }, el( 'b', null, 'Check before publishing: ' ), st.draft.review_notes.join( ' ' ) )
					: null,
				el( 'div', { className: 'lucy-write-actions' },
					el( C.Button, { variant: 'primary', onClick: insert, 'aria-disabled': st.saving, className: st.saving ? 'is-busy' : '' },
						st.saving ? 'Putting it in the editor…' : 'Insert into this post' )
				)
			) : null
		);
	}

	function notice( text ) {
		var n = dispatch( 'core/notices' );
		if ( n ) { n.createSuccessNotice( text, { type: 'snackbar' } ); }
	}

	/* ------------------------------------------------------------------
	 * The button: in the Lucy sidebar panel and in the document panel
	 * ------------------------------------------------------------------ */
	function LucyPanel() {
		var o = useState( false ); var open = o[ 0 ], setOpen = o[ 1 ];
		var i = useState( { busy: false, error: '' } ); var img = i[ 0 ], setImg = i[ 1 ];
		var t = useState( CFG.defaultTemplate || '' ); var tpl = t[ 0 ], setTpl = t[ 1 ];
		if ( ! PanelSlot ) { return null; }
		var templates = ( CFG.imageTemplates || [] ).map( function ( x ) { return { label: x.name, value: x.id }; } );

		function makeImage() {
			if ( img.busy ) { return; }
			if ( ! tpl ) { setImg( { busy: false, error: 'Choose an image template first.' } ); return; }
			var id = postId();
			if ( ! id ) { setImg( { busy: false, error: 'Save the post once first, then Lucy can set the featured image.' } ); return; }
			setImg( { busy: true, error: '' } );
			apiFetch( { path: '/lucy/v1/image', method: 'POST', data: { post_id: id, title: postTitle(), image_template: tpl } } )
				.then( function ( res ) {
					setImg( { busy: false, error: '' } );
					if ( res && res.image && res.image.id ) {
						dispatch( 'core/editor' ).editPost( { featured_media: res.image.id } );
						notice( 'Featured image created from your template.' );
					}
				} )
				.catch( function ( err ) { setImg( { busy: false, error: ( err && err.message ) || 'Could not make the picture.' } ); } );
		}

		return el( wp.element.Fragment, null,
			el( PanelSlot, { name: 'lucy-write', title: 'Lucy', icon: icon, className: 'lucy-ed-sidebar' },
				el( 'p', { className: 'lucy-ed-muted' }, CFG.active
					? 'Lucy writes the whole article from your Growth profile' + ( CFG.business ? ' for ' + CFG.business : '' ) + '.'
					: ( CFG.notActiveMessage || 'Lucy is not set up yet.' ) ),
				el( C.Button, { variant: 'primary', onClick: function () { setOpen( true ); } }, '✦ Write with Lucy' ),
				templates.length ? el( 'div', { className: 'lucy-ed-featured' },
					el( 'p', { className: 'lucy-ed-label' }, 'Featured image from a template' ),
					el( C.SelectControl, { value: tpl, options: [ { label: '— Choose a template —', value: '' } ].concat( templates ), onChange: setTpl, __nextHasNoMarginBottom: true } ),
					el( C.Button, { variant: 'secondary', onClick: makeImage, 'aria-disabled': img.busy, className: img.busy ? 'is-busy' : '' },
						img.busy ? 'Making the picture…' : 'Create featured image' ),
					img.error ? el( C.Notice, { status: 'error', isDismissible: false }, img.error ) : null
				) : el( 'p', { className: 'lucy-ed-muted' }, el( 'a', { href: CFG.imagesUrl, target: '_blank', rel: 'noopener' }, 'Set up an image template →' ) )
			),
			open ? el( WriteModal, { onClose: function () { setOpen( false ); } } ) : null
		);
	}

	if ( wp.plugins && PanelSlot ) {
		wp.plugins.registerPlugin( 'lucy-write-panel', { render: LucyPanel, icon: icon } );
	}

	// Exposed for the automated tests only.
	window.LucyEditorInternals = { WriteModal: WriteModal, config: CFG };
}( window.wp ) );
