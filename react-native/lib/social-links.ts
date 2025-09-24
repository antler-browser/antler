export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  X = 'x',
  BLUESKY = 'bluesky',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  GITHUB = 'github',
  TWITCH = 'twitch',
  SNAPCHAT = 'snapchat',
  REDDIT = 'reddit',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  PINTEREST = 'pinterest',
  TUMBLR = 'tumblr',
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
  BANDCAMP = 'bandcamp',
  PATREON = 'patreon',
  KO_FI = 'ko_fi',
  WEBSITE = 'website',
  EMAIL = 'email',
  MASTODON = 'mastodon',
}

export interface SocialLink {
  platform: SocialPlatform;
  handle: string;
}

const HTTPS = 'https://';

const PLATFORM_BASES: Record<SocialPlatform, string> = {
  [SocialPlatform.INSTAGRAM]: 'instagram.com/',
  [SocialPlatform.YOUTUBE]: 'youtube.com/@',
  [SocialPlatform.TIKTOK]: 'tiktok.com/@',
  [SocialPlatform.X]: 'x.com/',
  [SocialPlatform.BLUESKY]: 'bsky.app/profile/',
  [SocialPlatform.FACEBOOK]: 'facebook.com/',
  [SocialPlatform.LINKEDIN]: 'linkedin.com/in/',
  [SocialPlatform.GITHUB]: 'github.com/',
  [SocialPlatform.TWITCH]: 'twitch.tv/',
  [SocialPlatform.SNAPCHAT]: 'snapchat.com/add/',
  [SocialPlatform.REDDIT]: 'reddit.com/u/',
  [SocialPlatform.DISCORD]: 'discord.gg/',
  [SocialPlatform.TELEGRAM]: 't.me/',
  [SocialPlatform.PINTEREST]: 'pinterest.com/',
  [SocialPlatform.TUMBLR]: 'tumblr.com/',
  [SocialPlatform.SPOTIFY]: 'open.spotify.com/user/',
  [SocialPlatform.SOUNDCLOUD]: 'soundcloud.com/',
  [SocialPlatform.BANDCAMP]: 'bandcamp.com/',
  [SocialPlatform.PATREON]: 'patreon.com/',
  [SocialPlatform.KO_FI]: 'ko-fi.com/',
  [SocialPlatform.WEBSITE]: '',
  [SocialPlatform.EMAIL]: '',
  [SocialPlatform.MASTODON]: '',
};

const PLATFORM_PATTERNS: Partial<Record<SocialPlatform, RegExp>> = {
  [SocialPlatform.INSTAGRAM]: /^[a-zA-Z0-9._]{1,30}$/,
  [SocialPlatform.X]: /^[a-zA-Z0-9_]{1,15}$/,
  [SocialPlatform.BLUESKY]: /^[a-zA-Z0-9.-]+(\.[a-zA-Z0-9.-]+)?$/,
  [SocialPlatform.LINKEDIN]: /^[a-zA-Z0-9-]{3,100}$/,
  [SocialPlatform.GITHUB]: /^[a-zA-Z0-9-]{1,39}$/,
  [SocialPlatform.TIKTOK]: /^[a-zA-Z0-9._]{2,24}$/,
  [SocialPlatform.REDDIT]: /^[a-zA-Z0-9_-]{3,20}$/,
  [SocialPlatform.EMAIL]: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  [SocialPlatform.MASTODON]: /^@?[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+$/,
};

export function getPlatformDisplayName(platform: SocialPlatform): string {
  switch (platform) {
    case SocialPlatform.X:
      return 'X (Twitter)';
    case SocialPlatform.KO_FI:
      return 'Ko-fi';
    case SocialPlatform.LINKEDIN:
      return 'LinkedIn';
    case SocialPlatform.GITHUB:
      return 'GitHub';
    case SocialPlatform.TIKTOK:
      return 'TikTok';
    case SocialPlatform.YOUTUBE:
      return 'YouTube';
    case SocialPlatform.SOUNDCLOUD:
      return 'SoundCloud';
    default:
      return platform.charAt(0).toUpperCase() + platform.slice(1).replace(/_/g, ' ');
  }
}

export function getPlatformPlaceholder(platform: SocialPlatform): string {
  switch (platform) {
    case SocialPlatform.INSTAGRAM:
    case SocialPlatform.X:
    case SocialPlatform.TIKTOK:
    case SocialPlatform.YOUTUBE:
      return '@username';
    case SocialPlatform.BLUESKY:
      return '@username.bsky.social';
    case SocialPlatform.LINKEDIN:
    case SocialPlatform.GITHUB:
      return 'username';
    case SocialPlatform.EMAIL:
      return 'email@example.com';
    case SocialPlatform.MASTODON:
      return '@username@mastodon.social';
    case SocialPlatform.WEBSITE:
      return 'https://example.com';
    case SocialPlatform.DISCORD:
      return 'invite-code';
    default:
      return 'username';
  }
}

export function sanitizeInput(input: string): string | null {
  if (!input) return null;

  // Trim the input
  let sanitized = input.trim();

  // Remove javascript: data: and other dangerous protocols
  sanitized = sanitized.replace(/^(javascript|data|vbscript|file|about|blob):/i, '');

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove multiple consecutive spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

export function normalizeHandle(platform: SocialPlatform, input: string): string | null {
  if (!input) return null;

  const sanitized = sanitizeInput(input);
  if (!sanitized) return null;

  let normalized = sanitized;

  // Remove common URL prefixes
  normalized = normalized.replace(/^https?:\/\//i, '');
  normalized = normalized.replace(/^www\./i, '');

  // Platform-specific normalization
  switch (platform) {
    case SocialPlatform.INSTAGRAM:
    case SocialPlatform.X:
    case SocialPlatform.TIKTOK:
    case SocialPlatform.YOUTUBE:
      // Remove @ prefix and platform domains
      normalized = normalized.replace(/^@/, '');
      normalized = normalized.replace(/^(instagram\.com\/|twitter\.com\/|x\.com\/|tiktok\.com\/@?|youtube\.com\/@?)/i, '');
      normalized = normalized.split('/')[0];
      normalized = normalized.split('?')[0];
      break;

    case SocialPlatform.BLUESKY:
      // Handle @username.bsky.social or username.bsky.social
      normalized = normalized.replace(/^@/, '');
      normalized = normalized.replace(/^bsky\.app\/profile\//i, '');
      if (!normalized.includes('.')) {
        normalized = `${normalized}.bsky.social`;
      }
      break;

    case SocialPlatform.LINKEDIN:
      // Extract username from LinkedIn URL or keep as is
      normalized = normalized.replace(/^linkedin\.com\/in\//i, '');
      normalized = normalized.replace(/^in\//i, '');
      normalized = normalized.split('/')[0];
      normalized = normalized.split('?')[0];
      break;

    case SocialPlatform.GITHUB:
      normalized = normalized.replace(/^github\.com\//i, '');
      normalized = normalized.split('/')[0];
      normalized = normalized.split('?')[0];
      break;

    case SocialPlatform.REDDIT:
      normalized = normalized.replace(/^reddit\.com\/u\//i, '');
      normalized = normalized.replace(/^reddit\.com\/user\//i, '');
      normalized = normalized.replace(/^u\//i, '');
      normalized = normalized.replace(/^user\//i, '');
      normalized = normalized.split('/')[0];
      normalized = normalized.split('?')[0];
      break;

    case SocialPlatform.DISCORD:
      normalized = normalized.replace(/^discord\.gg\//i, '');
      normalized = normalized.replace(/^discord\.com\/invite\//i, '');
      normalized = normalized.split('/')[0];
      normalized = normalized.split('?')[0];
      break;

    case SocialPlatform.MASTODON:
      // Ensure proper @username@instance.tld format
      if (!normalized.startsWith('@')) {
        normalized = '@' + normalized;
      }
      break;

    case SocialPlatform.EMAIL:
      // Just return the sanitized email
      normalized = normalized.toLowerCase();
      break;

    case SocialPlatform.WEBSITE:
      // Force HTTPS for security (upgrade http:// to https://)
      if (normalized.startsWith('http://')) {
        normalized = normalized.replace(/^http:\/\//, 'https://');
      } else if (!normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
      }
      break;

    default:
      // For other platforms, just extract the username part
      const base = PLATFORM_BASES[platform];
      if (base) {
        normalized = normalized.replace(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), '');
      }
      normalized = normalized.split('/')[0];
      normalized = normalized.split('?')[0];
  }

  return normalized;
}

export function validateHandle(platform: SocialPlatform, handle: string): boolean {
  if (!handle) return false;

  const pattern = PLATFORM_PATTERNS[platform];
  if (pattern) {
    return pattern.test(handle);
  }

  // For platforms without specific patterns, just ensure it's not empty and doesn't contain spaces
  return handle.length > 0 && handle.length < 100 && !/\s/.test(handle);
}

export function getFullURL(platform: SocialPlatform, handle: string): string | null {
  if (!handle) return null;

  switch (platform) {
    case SocialPlatform.EMAIL:
      return `mailto:${handle}`;

    case SocialPlatform.MASTODON: {
      // Parse @username@instance format
      const parts = handle.replace('@', '').split('@');
      if (parts.length === 2) {
        return `${HTTPS}${parts[1]}/@${parts[0]}`;
      }
      return null;
    }

    case SocialPlatform.WEBSITE:
      // Website handles are already full URLs
      return handle;

    default: {
      const base = PLATFORM_BASES[platform];
      if (base) {
        return `${HTTPS}${base}${handle}`;
      }
      return null;
    }
  }
}

export function createSocialLink(platform: SocialPlatform, input: string): SocialLink | null {
  const normalized = normalizeHandle(platform, input);

  if (!normalized || !validateHandle(platform, normalized)) {
    return null;
  }

  const url = getFullURL(platform, normalized);

  if (!url) {
    return null;
  }

  return {
    platform,
    handle: normalized
  };
}

export function getHandleFromURL(platform: SocialPlatform, url: string): string | null {
  return normalizeHandle(platform, url);
}

// Helper function to check if a URL is safe
export function isSafeURL(url: string): boolean {
  if (!url) return false;

  const lowercaseUrl = url.toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:'];
  for (const protocol of dangerousProtocols) {
    if (lowercaseUrl.startsWith(protocol)) {
      return false;
    }
  }

  // Allow mailto: for email
  if (lowercaseUrl.startsWith('mailto:')) {
    return true;
  }

  // Only allow http and https
  if (!lowercaseUrl.startsWith('http://') && !lowercaseUrl.startsWith('https://')) {
    return false;
  }

  return true;
}