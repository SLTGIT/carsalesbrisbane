=== Lucy – AI Growth Marketing Assistant ===
Tags: ai, content, seo, openai, automotive
Requires at least: 6.6
Requires PHP: 7.4
Stable tag: 3.3.0
License: GPLv2 or later

One button in your post editor: Write with Lucy. Give it a title, a reference link and your keywords, and Lucy writes the whole article – text, SEO fields, FAQs and a featured image from your own image template. Built for car dealers.

== Description ==

* **Write with Lucy** – a button in the WordPress post editor and on the Lucy screen. One popup: title, reference link, target keywords, an instruction and an image template. Lucy writes the complete article and puts it into the post you are editing.
* **Growth profile** – the business, what it sells, keywords, cities and postcodes, audience, voice, facts, offers, competitors and SEO / local / AI-search goals. Set once; every article starts from it.
* **Reference links** – paste a URL and Lucy reads that page, follows its angle and structure, and writes something original. Instructions written on that page are ignored, and private or internal addresses are refused.
* **Image templates** – three dealer-hero layouts built from your brand kit (logo + colours): logo badge, headline in caps with your city or keyword highlighted, rule and strapline, over a photo Lucy makes or one you upload. A vector vehicle (SUV, ute, EV, van, spanner, price tag) is drawn instead when there is no photo. Or upload your own background and font. If your picture already has a title on it, Lucy learns the layout from it, covers those words and writes each new title in the same place. Every picture comes as a 1200 × 630 featured image plus a square 600 × 600 thumbnail, with alt text. Images are managed separately from the writing.
* **SEO fields** – meta title, meta description and focus keyword go straight into Yoast SEO or Rank Math. FAQs are saved for FAQ structured data.
* **Website audit** – scores every published page and lists what is weak, thin, outdated or poorly targeted, plus the pages you are missing (departments, cities, brands). Each one opens the writer with the title and keyword filled in.
* **Super Admin** – OpenAI key (encrypted), models, on/off switch, who can use Lucy, monthly limits, demo mode, security check.
* Lucy never publishes. Everything stays a draft until a person presses Publish.

== Installation ==

1. Plugins → Add New → Upload Plugin → choose lucy-ai-content.zip → Install → Activate.
2. The person who activates Lucy becomes its first Super Admin.
3. Lucy → Super Admin → paste an OpenAI API key → Test connection → Save (or tick Demo mode to try it without a key).
4. Lucy → Setup → complete the Growth profile steps → Activate Lucy.
5. Optional: Lucy → Image templates → add your blog header background and font.
6. Open any post → **Write with Lucy**.

== Developer notes ==

* wp-config.php constants: LUCY_OPENAI_API_KEY, LUCY_SUPER_ADMINS ("1,5"), LUCY_ENCRYPTION_KEY, LUCY_OPENAI_BASE_URL (testing).
* REST: POST /lucy/v1/write (article), /lucy/v1/apply (SEO fields, FAQs, featured image on an existing post), /lucy/v1/image (featured image from a template). Logged-in users who can edit the post; nonce required. The key never reaches the browser.
* Image templates are stored in the option lucy_image_templates; fonts live in assets/fonts (SIL Open Font License, see assets/fonts/LICENSE.txt), and any .ttf/.otf in the Media Library ticked “Use as a Lucy font”.
* Filters: lucy_text_payload, lucy_image_payload, lucy_image_fonts, lucy_insert_post_args, lucy_openai_base_url.
* Action: lucy_draft_saved ( $post_id, $draft ).
* If you change the WordPress AUTH_KEY salt, re-enter the OpenAI key (it is encrypted with it) or set LUCY_ENCRYPTION_KEY.

== Changelog ==

= 3.3.0 =
* New "Train Lucy" screen: set her role ("You are the content writer for…"), the house rules she must always follow, the things she must never do, and an example article whose style she should copy.
* "Exactly what Lucy is told": the full instruction Lucy receives is now shown on screen, so nothing about how she writes is hidden in the code.
* Much stricter writing quality: complete sentences, correct punctuation, sentence-case headings, paragraphs of 2–4 sentences, a heading every 150–250 words, never two headings in a row, proper number and money formatting, and a ban on AI filler phrases.
* One spelling system per site: the Language setting now overrides any conflicting hand-written rule, and a new site takes its spelling from the WordPress locale instead of defaulting to US English.

= 3.2.0 =
* Three dealer-hero layouts that look like a designed blog header: logo in a white badge, big headline in caps with your city or main keyword highlighted, a rule and a strapline, over a real photo.
* Lucy can make the photo: an editorial shot of the vehicle the article is about, with the left side kept clear for the headline and no text in the picture.
* Reading a reference header now finds the whole headline block, not one line, and says plainly when the old words sit across too much detail to rub out cleanly.

= 3.1.0 =
* Brand kit: your logo and colours in the Growth profile, used by every image template.
* Three ready-made layouts that draw the vehicle matching the article (SUV, ute, EV, van) plus a spanner for servicing and a price tag for finance.
* Image templates can learn the layout from a picture that already has a title on it: Lucy covers those words and writes each new title in the same place, colour and size.
* Every picture now comes with a square 600 × 600 thumbnail as well, redrawn so the title fits.
* Any upload size or shape is fitted to 1200 × 630 instead of being refused, and long titles shrink to fit instead of being cut off.
* The popup now takes your own pasted content (rewritten around your keywords for search engines and AI assistants), plus length and number of FAQs, and shows which business, brands and keywords Lucy is using.

= 3.0.0 =
* New: Write with Lucy – one button, one popup, a whole article written into your post. Works from the post editor and from the Lucy screen.
* New: reference links – Lucy reads a page you point it at and follows its angle.
* New: image templates – your background, your font, your layout; Lucy writes the title onto it and sets it as the featured image.
* Removed: page templates and the block-by-block Lucy button. WordPress handles page building; Lucy writes the article.
* Article length, FAQs, SEO fields, the website audit, demo mode and all Super Admin controls are unchanged.

= 2.1.0 =
* Featured image from the editor sidebar; writing quality fixes (typed topics are corrected, not repeated).

= 2.0.0 =
* Growth profile, setup and activation, page templates, in-editor Lucy button, website audit, structured data.

= 1.0.0 =
* First release: blog drafts, SEO fields, FAQs, featured image, Super Admin controls.
