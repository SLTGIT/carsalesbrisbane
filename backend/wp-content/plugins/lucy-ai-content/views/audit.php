<?php
/**
 * Website audit (AI Growth Plan steps 1–2).
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_a = Lucy_Audit::last();
?>
<div class="lucy-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'AI Growth Plan · website audit', 'lucy-ai-content' ); ?></div>
		<h1><?php esc_html_e( 'How strong is this website’s content?', 'lucy-ai-content' ); ?></h1>
		<p><?php esc_html_e( 'Lucy checks every published page and post against your Growth profile: weak, missing, outdated or poorly targeted content.', 'lucy-ai-content' ); ?></p>
	</div>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="lucy_run_audit">
		<?php wp_nonce_field( 'lucy_run_audit' ); ?>
		<button type="submit" class="lucy-btn"><?php echo $lucy_a ? esc_html__( 'Run audit again', 'lucy-ai-content' ) : esc_html__( 'Run website audit', 'lucy-ai-content' ); ?></button>
	</form>
</div>

<?php if ( ! $lucy_a ) : ?>
	<section class="lucy-card lucy-empty">
		<h2><?php esc_html_e( 'No audit yet', 'lucy-ai-content' ); ?></h2>
		<p><?php esc_html_e( 'The audit takes a few seconds and costs nothing – it does not use OpenAI. Fill in the Growth profile first for the most useful results.', 'lucy-ai-content' ); ?></p>
	</section>
	<?php return; ?>
<?php endif; ?>

<?php $lucy_cls = $lucy_a['score'] >= 75 ? 'good' : ( $lucy_a['score'] >= 50 ? 'ok' : 'bad' ); ?>
<div class="lucy-stats">
	<div class="lucy-stat"><span class="lucy-small"><?php esc_html_e( 'Content score', 'lucy-ai-content' ); ?></span><strong class="lucy-score <?php echo esc_attr( $lucy_cls ); ?>"><?php echo esc_html( $lucy_a['score'] ); ?><span class="lucy-small"> / 100</span></strong></div>
	<div class="lucy-stat"><span class="lucy-small"><?php esc_html_e( 'Pages checked', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_a['counts']['pages'] ) ); ?></strong></div>
	<div class="lucy-stat"><span class="lucy-small"><?php esc_html_e( 'Issues found', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_a['counts']['issues'] ) ); ?></strong></div>
	<div class="lucy-stat"><span class="lucy-small"><?php esc_html_e( 'Missing pages', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_a['counts']['gaps'] ) ); ?></strong></div>
</div>
<p class="lucy-small" style="margin:-10px 0 20px"><?php /* translators: %s: time ago */ echo esc_html( sprintf( __( 'Last run %s ago.', 'lucy-ai-content' ), human_time_diff( (int) $lucy_a['time'] ) ) ); ?></p>

<?php if ( $lucy_a['gaps'] ) : ?>
<section class="lucy-card">
	<div class="lucy-cardhead"><h2 style="margin:0"><?php esc_html_e( 'Missing content – opportunities', 'lucy-ai-content' ); ?></h2><span class="lucy-small"><?php esc_html_e( 'Based on what you sell, your cities and brands', 'lucy-ai-content' ); ?></span></div>
	<?php foreach ( $lucy_a['gaps'] as $lucy_gap ) : ?>
		<div class="lucy-gap">
			<div>
				<span class="lucy-issue <?php echo esc_attr( $lucy_gap['priority'] ); ?>"><?php echo esc_html( ucfirst( $lucy_gap['priority'] ) ); ?></span>
				<strong><?php echo esc_html( $lucy_gap['title'] ); ?></strong>
				<div class="lucy-small"><?php echo esc_html( $lucy_gap['why'] ); ?><?php echo $lucy_gap['keyword'] ? ' · ' . esc_html__( 'Keyword:', 'lucy-ai-content' ) . ' ' . esc_html( $lucy_gap['keyword'] ) : ''; ?></div>
			</div>
			<?php if ( Lucy_Access::can_generate() ) : ?>
				<a class="lucy-btn small" href="<?php echo esc_url( Lucy_Audit::create_url( $lucy_gap ) ); ?>">✦ <?php esc_html_e( 'Create with Lucy', 'lucy-ai-content' ); ?></a>
			<?php endif; ?>
		</div>
	<?php endforeach; ?>
</section>
<?php endif; ?>

<section class="lucy-card">
	<div class="lucy-cardhead"><h2 style="margin:0"><?php esc_html_e( 'Existing pages – weakest first', 'lucy-ai-content' ); ?></h2></div>
	<?php if ( ! $lucy_a['pages'] ) : ?>
		<p><?php esc_html_e( 'No published pages or posts yet.', 'lucy-ai-content' ); ?></p>
	<?php else : ?>
	<div class="lucy-tablewrap"><table class="lucy-table">
		<thead><tr><th><?php esc_html_e( 'Page', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'Score', 'lucy-ai-content' ); ?></th><th><?php esc_html_e( 'What to fix', 'lucy-ai-content' ); ?></th><th></th></tr></thead>
		<tbody>
		<?php foreach ( array_slice( $lucy_a['pages'], 0, 200 ) as $lucy_p ) : ?>
			<?php $lucy_c = $lucy_p['score'] >= 75 ? '' : ( $lucy_p['score'] >= 50 ? 'warn' : 'err' ); ?>
			<tr>
				<td><strong><?php echo esc_html( $lucy_p['title'] ); ?></strong><div class="lucy-small"><?php echo esc_html( ucfirst( $lucy_p['type'] ) ); ?> · <?php /* translators: %d: words */ echo esc_html( sprintf( __( '%d words', 'lucy-ai-content' ), $lucy_p['words'] ) ); ?></div></td>
				<td><span class="lucy-badge <?php echo esc_attr( $lucy_c ); ?>"><?php echo esc_html( $lucy_p['score'] ); ?></span></td>
				<td><?php if ( ! $lucy_p['issues'] ) : ?><span class="lucy-small">✓ <?php esc_html_e( 'Looks good', 'lucy-ai-content' ); ?></span><?php endif; ?>
					<?php foreach ( $lucy_p['issues'] as $lucy_is ) : ?><span class="lucy-issue <?php echo esc_attr( $lucy_is[0] ); ?>"><?php echo esc_html( $lucy_is[1] ); ?></span><?php endforeach; ?></td>
				<td style="text-align:right;white-space:nowrap"><?php if ( current_user_can( 'edit_post', $lucy_p['id'] ) ) : ?><a class="lucy-link" href="<?php echo esc_url( get_edit_post_link( $lucy_p['id'] ) ); ?>"><?php esc_html_e( 'Improve with Lucy →', 'lucy-ai-content' ); ?></a><?php endif; ?></td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table></div>
	<?php endif; ?>
</section>
<div class="lucy-note"><?php esc_html_e( 'Next in the AI Growth Plan: market research (competitors, how customers search, keyword opportunities) and the social media studio – both built on this profile.', 'lucy-ai-content' ); ?></div>
