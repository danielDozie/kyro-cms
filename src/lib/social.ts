import type { BaseAdapter } from "../registry/types.js";

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
}

const PLATFORM_META: Record<string, { label: string }> = {
  facebook: { label: "Facebook" },
  twitter: { label: "Twitter / X" },
  instagram: { label: "Instagram" },
  linkedin: { label: "LinkedIn" },
  youtube: { label: "YouTube" },
  tiktok: { label: "TikTok" },
  pinterest: { label: "Pinterest" },
  discord: { label: "Discord" },
  twitch: { label: "Twitch" },
  github: { label: "GitHub" },
  mastodon: { label: "Mastodon" },
};

const ALL_PLATFORMS = [
  "facebook", "twitter", "instagram", "linkedin", "youtube",
  "tiktok", "pinterest", "discord", "twitch", "github", "mastodon",
];

export function getSocialLinksFromSettings(socialSettings: any): SocialLink[] {
  if (!socialSettings) return [];

  const showAll = socialSettings.showAll === true;
  const links: SocialLink[] = [];

  for (const platform of ALL_PLATFORMS) {
    const url = socialSettings[platform];
    if (!url) continue;

    // skip niche platforms unless showAll is true
    const isNiche = ["tiktok", "pinterest", "discord", "twitch", "github", "mastodon"].includes(platform);
    if (isNiche && !showAll) continue;

    const meta = PLATFORM_META[platform];
    links.push({
      platform,
      url,
      label: meta?.label || platform,
    });
  }

  return links;
}

export async function getSocialLinks(
  db: BaseAdapter,
  options?: { draft?: boolean },
): Promise<SocialLink[]> {
  try {
    const doc = await db.findOne({
      collection: "_globals_social-settings",
      where: {},
      draft: options?.draft ?? false,
    });
    return getSocialLinksFromSettings(doc);
  } catch {
    return [];
  }
}
