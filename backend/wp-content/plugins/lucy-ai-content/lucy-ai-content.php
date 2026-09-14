<?php
/**
 * Plugin Name:       Lucy – AI Content Studio
 * Description:       AI growth marketing assistant for dealerships. A Lucy button on every block writes or improves that section using your Growth profile (business, market, keywords, locations) plus the page context. Includes visual page templates, a website audit and a long-form writer. Lucy never publishes.
 * Version:           3.3.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            Lucy Content Studio
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       lucy-ai-content
 *
 * HOW THIS PLUGIN IS ORGANISED (read this first if you are new to the code)
 * -------------------------------------------------------------------------
 * includes/class-lucy-settings.php   All settings, their default values and how they are cleaned before saving.
 * includes/class-lucy-context.php    Website context (Growth profile) → AI brief; setup steps and activation.
 * includes/class-lucy-templates.php  Page types and visual templates (block patterns with Lucy section metadata).
 * includes/class-lucy-assist.php     The in-editor Lucy button: REST endpoint that writes/improves one block or section.
 * includes/class-lucy-audit.php      Website audit: weak, missing, outdated or poorly targeted content.
 * includes/class-lucy-access.php     Who can do what: Super Admin, Admin Developer, Website editor.
 * includes/class-lucy-openai.php     The only file that talks to OpenAI.
 * includes/class-lucy-demo.php       Demo mode: sample content, no OpenAI calls, no key needed (for safe testing).
 * includes/class-lucy-generator.php  Builds the prompt, validates the answer, creates the image and the WordPress draft.
 * includes/class-lucy-usage.php      Monthly usage counters and generation history.
 * includes/class-lucy-admin.php      Admin menus, pages, form saving and AJAX endpoints.
 * includes/class-lucy-frontend.php   Small public-site feature: FAQ schema for Lucy posts.
 * views/                             The HTML of each admin page.
 * assets/                            Admin CSS/JS, the block-editor integration (lucy-editor.js) and template images.
 */

defined( 'ABSPATH' ) || exit; // Stop if someone opens this file directly.

define( 'LUCY_VERSION', '3.3.0' );
define( 'LUCY_FILE', __FILE__ );
define( 'LUCY_DIR', plugin_dir_path( __FILE__ ) );
define( 'LUCY_URL', plugin_dir_url( __FILE__ ) );

require_once LUCY_DIR . 'includes/class-lucy-settings.php';
require_once LUCY_DIR . 'includes/class-lucy-context.php';
require_once LUCY_DIR . 'includes/class-lucy-reference.php';
require_once LUCY_DIR . 'includes/class-lucy-images.php';
require_once LUCY_DIR . 'includes/class-lucy-access.php';
require_once LUCY_DIR . 'includes/class-lucy-openai.php';
require_once LUCY_DIR . 'includes/class-lucy-demo.php';
require_once LUCY_DIR . 'includes/class-lucy-usage.php';
require_once LUCY_DIR . 'includes/class-lucy-generator.php';
require_once LUCY_DIR . 'includes/class-lucy-write.php';
require_once LUCY_DIR . 'includes/class-lucy-audit.php';
require_once LUCY_DIR . 'includes/class-lucy-admin.php';
require_once LUCY_DIR . 'includes/class-lucy-frontend.php';

// When the plugin is activated, the person who activates it becomes Lucy's first Super Admin.
register_activation_hook( __FILE__, array( 'Lucy_Access', 'on_activate' ) );

add_action(
	'plugins_loaded',
	function () {
		Lucy_Admin::init();
		Lucy_Write::init();
		Lucy_Images::init();
		Lucy_Frontend::init();
	}
);
