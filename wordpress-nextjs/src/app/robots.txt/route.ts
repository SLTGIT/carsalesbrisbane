import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { normalizePublicSiteBase } from "@/lib/site-url";

function originFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!raw) return null;
  return normalizePublicSiteBase(raw);
}

async function resolveSiteOrigin(): Promise<string> {
  const fromEnv = originFromEnv();
  if (fromEnv) return fromEnv;
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto =
    hdrs.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto === "http" || proto === "https" ? proto : "https"}://${host}`;
}

function buildRobotsBody(sitemapUrl: string): string {
  /*
    One group for every crawler that is welcome, with the same rules.

    The file used to give Googlebot, Bingbot and the AI search crawlers their
    own "Allow: /" groups. A crawler that matches a named group ignores the
    "*" group entirely, so those crawlers were never told to stay out of /api/
    or the unbounded /search?… filter combinations the "*" group excludes —
    the exact crawl trap the rule was written for. Grouping the user-agents
    applies the same rules to all of them.

    Search and answer crawlers are welcome: Google (incl. AI Overviews), Bing
    (incl. Copilot), OpenAI search, Perplexity, Anthropic's search and
    user-request fetchers, DuckDuckGo's assistant and Apple. The training-only
    crawlers below stay blocked, as the business chose.
  */
  return `User-agent: *
User-agent: Googlebot
User-agent: Bingbot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: DuckAssistBot
User-agent: Applebot
Allow: /
Disallow: /api/
Disallow: /search?*

# Do not use this website for AI model training or dataset scraping.
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: TikTokSpider
Disallow: /

Sitemap: ${sitemapUrl}
`;
}

export async function GET() {
  const origin = await resolveSiteOrigin();
  const sitemapUrl =
    process.env.NEXT_PUBLIC_ROBOTS_SITEMAP_URL?.trim() || `${origin}/sitemap.xml`;
  const body = buildRobotsBody(sitemapUrl);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
