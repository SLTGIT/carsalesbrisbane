import type { getCustomSettings } from "@/lib/wordpress/api/settings";

export type SocialLink = { label: string; href: string; icon: string };

/**
 * Social profiles configured in WordPress, in display order. Only links with a
 * URL are returned. Shared by the header strip (desktop) and the footer, which
 * is where they live on phones — the header hides them there to stay on one
 * row.
 */
export function socialLinksFromSettings(
  settings: Awaited<ReturnType<typeof getCustomSettings>>,
): SocialLink[] {
  return [
    { label: "Facebook", href: settings?.facebook_url, icon: "bi-facebook" },
    { label: "Instagram", href: settings?.instagram_url, icon: "bi-instagram" },
    { label: "YouTube", href: settings?.youtube_url, icon: "bi-youtube" },
    { label: "TikTok", href: settings?.tiktok_url, icon: "bi-tiktok" },
    { label: "X", href: settings?.x_url, icon: "bi-twitter-x" },
    { label: "LinkedIn", href: settings?.linkedin_url, icon: "bi-linkedin" },
  ].filter((link): link is SocialLink => Boolean(link.href));
}
