<?php
/**
 * History screen: recent generations. Editors see their own; administrators and Super Admins see all.
 *
 * @package Lucy
 */

defined( 'ABSPATH' ) || exit;

$lucy_rows   = Lucy_Usage::history_for_current_user();
$lucy_month  = Lucy_Usage::month();
$lucy_all    = Lucy_Access::can_view_all_history();
$lucy_status = array(
	'generated' => array( '', __( 'Not saved yet', 'lucy-ai-content' ), 'warn' ),
	'saved'     => array( '', __( 'Saved as draft', 'lucy-ai-content' ), '' ),
	'discarded' => array( '', __( 'Discarded', 'lucy-ai-content' ), 'off' ),
	'failed'    => array( '', __( 'Failed', 'lucy-ai-content' ), 'err' ),
);
?>
<div class="lucy-heading">
	<div>
		<div class="eyebrow"><?php esc_html_e( 'Usage & history', 'lucy-ai-content' ); ?></div>
		<h1><?php esc_html_e( 'Everything Lucy has written', 'lucy-ai-content' ); ?></h1>
		<p><?php echo $lucy_all ? esc_html__( 'All generations on this website.', 'lucy-ai-content' ) : esc_html__( 'Your generations on this website.', 'lucy-ai-content' ); ?></p>
	</div>
	<?php if ( Lucy_Access::can_generate() ) : ?>
		<a class="lucy-btn" href="<?php echo esc_url( Lucy_Admin::url( Lucy_Admin::PAGE_GENERATE ) ); ?>">✧ <?php esc_html_e( 'Generate with Lucy', 'lucy-ai-content' ); ?></a>
	<?php endif; ?>
</div>

<?php if ( $lucy_all ) : ?>
<div class="lucy-stats">
	<div class="lucy-stat"><span class="icon">▤</span><span class="lucy-small"><?php esc_html_e( 'Articles this month', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_month['articles'] ) ); ?></strong></div>
	<div class="lucy-stat"><span class="icon">✓</span><span class="lucy-small"><?php esc_html_e( 'Saved as drafts', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_month['saved'] ) ); ?></strong></div>
	<div class="lucy-stat"><span class="icon">▧</span><span class="lucy-small"><?php esc_html_e( 'Images this month', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_month['images'] ) ); ?></strong></div>
	<div class="lucy-stat"><span class="icon">◈</span><span class="lucy-small"><?php esc_html_e( 'Tokens this month', 'lucy-ai-content' ); ?></span><strong><?php echo esc_html( number_format_i18n( $lucy_month['input_tokens'] + $lucy_month['output_tokens'] ) ); ?></strong></div>
</div>
<?php endif; ?>

<section class="lucy-card">
	<div class="lucy-cardhead">
		<h2 style="margin:0"><?php esc_html_e( 'Generation history', 'lucy-ai-content' ); ?> <span class="lucy-small"><?php echo esc_html( number_format_i18n( count( $lucy_rows ) ) ); ?></span></h2>
		<?php if ( Lucy_Access::is_super_admin() && $lucy_rows ) : ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="lucy_clear_history">
				<?php wp_nonce_field( 'lucy_clear_history' ); ?>
				<button type="submit" class="lucy-link" style="color:#c63f55"><?php esc_html_e( 'Clear history', 'lucy-ai-content' ); ?></button>
			</form>
		<?php endif; ?>
	</div>
	<?php if ( ! $lucy_rows ) : ?>
		<div class="lucy-empty">
			<h2><?php esc_html_e( 'Your next story starts with a topic', 'lucy-ai-content' ); ?></h2>
			<p><?php esc_html_e( 'Drafts you generate will appear here.', 'lucy-ai-content' ); ?></p>
		</div>
	<?php else : ?>
		<div class="lucy-tablewrap"><table class="lucy-table">
			<thead><tr>
				<th><?php esc_html_e( 'Content', 'lucy-ai-content' ); ?></th>
				<?php if ( $lucy_all ) : ?><th><?php esc_html_e( 'By', 'lucy-ai-content' ); ?></th><?php endif; ?>
				<th><?php esc_html_e( 'Created', 'lucy-ai-content' ); ?></th>
				<th><?php esc_html_e( 'Model', 'lucy-ai-content' ); ?></th>
				<th><?php esc_html_e( 'Tokens', 'lucy-ai-content' ); ?></th>
				<th><?php esc_html_e( 'Result', 'lucy-ai-content' ); ?></th>
			</tr></thead>
			<tbody>
			<?php foreach ( $lucy_rows as $lucy_row ) : ?>
				<?php
				$lucy_st   = isset( $lucy_status[ $lucy_row['status'] ] ) ? $lucy_status[ $lucy_row['status'] ] : array( '', $lucy_row['status'], 'off' );
				$lucy_user = get_userdata( (int) $lucy_row['user_id'] );
				?>
				<tr>
					<td>
						<strong><?php echo esc_html( $lucy_row['topic'] ); ?></strong>
						<div class="lucy-small"><?php echo 'rewrite' === $lucy_row['mode'] ? esc_html__( 'Rewrite', 'lucy-ai-content' ) : esc_html__( 'New article', 'lucy-ai-content' ); ?><?php echo ! empty( $lucy_row['image'] ) ? ' · ' . esc_html__( 'with image', 'lucy-ai-content' ) : ''; ?></div>
						<?php if ( ! empty( $lucy_row['error'] ) ) : ?>
							<div class="lucy-small" style="color:#c63f55;margin-top:4px"><?php echo esc_html( $lucy_row['error'] ); ?></div>
						<?php endif; ?>
					</td>
					<?php if ( $lucy_all ) : ?><td><?php echo esc_html( $lucy_user ? $lucy_user->display_name : '—' ); ?></td><?php endif; ?>
					<td><?php echo esc_html( wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), (int) $lucy_row['time'] ) ); ?></td>
					<td><code><?php echo esc_html( $lucy_row['model'] ); ?></code></td>
					<td><?php echo esc_html( number_format_i18n( (int) $lucy_row['input_tokens'] + (int) $lucy_row['output_tokens'] ) ); ?></td>
					<td>
						<span class="lucy-badge <?php echo esc_attr( $lucy_st[2] ); ?>"><?php echo esc_html( $lucy_st[1] ); ?></span>
						<?php if ( ! empty( $lucy_row['post_id'] ) && get_post( (int) $lucy_row['post_id'] ) && current_user_can( 'edit_post', (int) $lucy_row['post_id'] ) ) : ?>
							<div style="margin-top:6px"><a class="lucy-link" href="<?php echo esc_url( get_edit_post_link( (int) $lucy_row['post_id'] ) ); ?>"><?php esc_html_e( 'Open draft →', 'lucy-ai-content' ); ?></a></div>
						<?php endif; ?>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table></div>
	<?php endif; ?>
</section>
