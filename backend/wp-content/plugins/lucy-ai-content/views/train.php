<?php
/**
 * Train Lucy – the role instruction and house rules the writer follows on every article.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_s     = Lucy_Settings::content();
$lucy_langs = Lucy_Settings::languages();
$lucy_lang  = isset( $lucy_langs[ $lucy_s['language'] ] ) ? $lucy_langs[ $lucy_s['language'] ] : $lucy_s['language'];

/* Warn when a rule written by hand asks for a different spelling system than the Language setting. */
$lucy_spell_hint = '';
$lucy_haystack   = strtolower( $lucy_s['writing_style'] . ' ' . $lucy_s['role_instruction'] . ' ' . $lucy_s['house_rules'] . ' ' . $lucy_s['instructions'] );
$lucy_variants   = array(
	'en-AU' => array( 'australian', 'aussie spelling' ),
	'en-GB' => array( 'british', 'uk spelling', 'u.k. spelling' ),
	'en-US' => array( 'american', 'us spelling', 'u.s. spelling' ),
	'en-IN' => array( 'indian english' ),
);
foreach ( $lucy_variants as $lucy_code => $lucy_words ) {
	if ( $lucy_code === $lucy_s['language'] ) {
		continue;
	}
	foreach ( $lucy_words as $lucy_word ) {
		if ( false !== strpos( $lucy_haystack, $lucy_word ) ) {
			/* translators: 1: wording found in the rules, 2: the Language setting. */
			$lucy_spell_hint = sprintf( __( 'Your rules mention “%1$s” spelling, but Language is set to %2$s. Lucy follows the Language setting, so change it on Growth profile → Audience & voice if that is wrong.', 'lucy-ai-content' ), $lucy_word, $lucy_lang );
			break 2;
		}
	}
}
?>
<div class="lucy-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'Train Lucy', 'lucy-ai-content' ); ?></div>
		<h1><?php esc_html_e( 'Tell Lucy who she is and how to write', 'lucy-ai-content' ); ?></h1>
		<p><?php esc_html_e( 'This is Lucy’s job description. It sits at the top of every article she writes, above every other preference. Change it here and the next article follows it – nothing to re-code.', 'lucy-ai-content' ); ?></p>
	</div>
	<button type="submit" form="lucy-train-form" class="lucy-btn"><?php esc_html_e( 'Save training', 'lucy-ai-content' ); ?></button>
</div>

<?php if ( $lucy_spell_hint ) : ?>
	<div class="notice notice-warning"><p><?php echo esc_html( $lucy_spell_hint ); ?></p></div>
<?php endif; ?>

<div class="lucy-twocol">
	<div>
		<form class="lucy-card" id="lucy-train-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="lucy_save_settings">
			<input type="hidden" name="lucy_tab" value="train">
			<?php wp_nonce_field( 'lucy_save_settings' ); ?>

			<h2><?php esc_html_e( '1. Lucy’s role', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'Write it the way you would brief a new content writer on their first day. Plain sentences, one instruction per line.', 'lucy-ai-content' ); ?></p>
			<div class="lucy-formgrid">
				<?php
				Lucy_Admin::field(
					'textarea',
					'role_instruction',
					__( 'You are…', 'lucy-ai-content' ),
					$lucy_s['role_instruction'],
					array(
						'full'      => true,
						'rows'      => 8,
						'counter'   => Lucy_Settings::ROLE_MAX,
						'maxlength' => Lucy_Settings::ROLE_MAX,
						'placeholder' => __( "You are the content writer for a used car dealership in Brisbane.\nYou write for families comparing cars, not for other marketers.\nExplain things the way a good salesperson would on the lot: clear, specific, never pushy.\nEvery article must be publishable without a rewrite.", 'lucy-ai-content' ),
						'hint'      => __( 'Up to 4,000 characters. Lucy follows this above every other writing preference. It can never override the accuracy rules (no invented prices, stats, reviews or sources).', 'lucy-ai-content' ),
					)
				);
				?>
			</div>

			<h2><?php esc_html_e( '2. House rules', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'The things you would otherwise fix by hand on every draft. One rule per line.', 'lucy-ai-content' ); ?></p>
			<div class="lucy-formgrid">
				<?php
				Lucy_Admin::field(
					'textarea',
					'house_rules',
					__( 'Always do this', 'lucy-ai-content' ),
					$lucy_s['house_rules'],
					array(
						'full'      => true,
						'rows'      => 7,
						'counter'   => Lucy_Settings::RULES_MAX,
						'maxlength' => Lucy_Settings::RULES_MAX,
						'placeholder' => __( "Answer the question in the first two sentences.\nName the suburb or city at least twice.\nEnd every buying guide with a checklist the reader can take with them.\nMention finance only once, and never as the main point.", 'lucy-ai-content' ),
					)
				);
				Lucy_Admin::field(
					'textarea',
					'avoid_rules',
					__( 'Never do this', 'lucy-ai-content' ),
					$lucy_s['avoid_rules'],
					array(
						'full'      => true,
						'rows'      => 7,
						'counter'   => Lucy_Settings::RULES_MAX,
						'maxlength' => Lucy_Settings::RULES_MAX,
						'placeholder' => __( "Never promise finance approval.\nNever quote a price or a kilometre figure for a specific car.\nNever write more than two lists in one article.\nNever use exclamation marks.", 'lucy-ai-content' ),
						'hint'      => __( 'Single words and phrases belong in Growth profile → Audience & voice → “Words and phrases to never use”. Lucy checks every draft against that list and rewrites if one slips through.', 'lucy-ai-content' ),
					)
				);
				?>
			</div>

			<h2><?php esc_html_e( '3. Show Lucy what good looks like', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'Paste one article you are happy with – yours or anyone’s. Lucy copies its rhythm, sentence length and heading style, never its words or its facts.', 'lucy-ai-content' ); ?></p>
			<div class="lucy-formgrid">
				<?php
				Lucy_Admin::field(
					'textarea',
					'example_article',
					__( 'Example article to imitate', 'lucy-ai-content' ),
					$lucy_s['example_article'],
					array(
						'full'      => true,
						'rows'      => 12,
						'counter'   => Lucy_Settings::EXAMPLE_MAX,
						'maxlength' => Lucy_Settings::EXAMPLE_MAX,
						'hint'      => __( 'Optional. Leave it empty until you have an article you would be happy to publish again.', 'lucy-ai-content' ),
					)
				);
				?>
			</div>

			<div class="lucy-actions" style="margin-top:16px">
				<button type="submit" class="lucy-btn"><?php esc_html_e( 'Save training', 'lucy-ai-content' ); ?></button>
			</div>
		</form>

		<section class="lucy-card">
			<h2><?php esc_html_e( 'Exactly what Lucy is told', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'This is the full instruction Lucy receives before she writes a word. Everything in it comes from these pages – nothing is hidden in the code.', 'lucy-ai-content' ); ?></p>
			<details>
				<summary><?php esc_html_e( 'Show Lucy’s instructions', 'lucy-ai-content' ); ?></summary>
				<textarea rows="18" readonly style="margin-top:12px;font-family:monospace;font-size:12px"><?php echo esc_textarea( Lucy_Generator::build_instructions( $lucy_s ) ); ?></textarea>
			</details>
		</section>
	</div>

	<aside>
		<section class="lucy-card">
			<h3><?php esc_html_e( 'Already set for you', 'lucy-ai-content' ); ?></h3>
			<p><?php esc_html_e( 'Lucy always enforces these, whatever you write above:', 'lucy-ai-content' ); ?></p>
			<ul class="lucy-list">
				<li><?php esc_html_e( 'Complete sentences, correct punctuation, sentence-case headings.', 'lucy-ai-content' ); ?></li>
				<li><?php esc_html_e( 'Paragraphs of 2–4 sentences, a heading every 150–250 words, never two headings in a row.', 'lucy-ai-content' ); ?></li>
				<li><?php esc_html_e( 'One spelling system throughout, taken from the Language setting.', 'lucy-ai-content' ); ?></li>
				<li><?php esc_html_e( 'No invented prices, statistics, reviews, awards or sources.', 'lucy-ai-content' ); ?></li>
				<li><?php esc_html_e( 'No AI filler: “delve”, “when it comes to”, “in today’s fast-paced world” and friends are banned.', 'lucy-ai-content' ); ?></li>
			</ul>
		</section>
		<section class="lucy-card">
			<h3><?php esc_html_e( 'Current voice settings', 'lucy-ai-content' ); ?></h3>
			<ul class="lucy-list">
				<li><strong><?php esc_html_e( 'Language:', 'lucy-ai-content' ); ?></strong> <?php echo esc_html( $lucy_lang ); ?></li>
				<li><strong><?php esc_html_e( 'Tone:', 'lucy-ai-content' ); ?></strong> <?php echo esc_html( $lucy_s['tone'] ? $lucy_s['tone'] : __( 'not set', 'lucy-ai-content' ) ); ?></li>
				<li><strong><?php esc_html_e( 'Length:', 'lucy-ai-content' ); ?></strong> <?php echo esc_html( sprintf( /* translators: %d: word count */ __( 'about %d words', 'lucy-ai-content' ), (int) $lucy_s['word_count'] ) ); ?></li>
				<li><strong><?php esc_html_e( 'FAQs:', 'lucy-ai-content' ); ?></strong> <?php echo esc_html( (int) $lucy_s['faq_count'] ); ?></li>
			</ul>
			<p><a class="lucy-btn secondary" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_SETTINGS, array( 'tab' => 'voice' ) ) ); ?>"><?php esc_html_e( 'Edit voice settings', 'lucy-ai-content' ); ?></a></p>
		</section>
		<section class="lucy-card">
			<h3><?php esc_html_e( 'How to train her well', 'lucy-ai-content' ); ?></h3>
			<p><?php esc_html_e( 'Generate an article, read it, and every time you fix something by hand, add that fix here as one line. After three or four articles Lucy stops making those mistakes.', 'lucy-ai-content' ); ?></p>
		</section>
	</aside>
</div>
