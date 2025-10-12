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

export function getPlatforSVGIcon(platform: SocialPlatform): string | undefined {
    switch (platform) {
    case SocialPlatform.GITHUB:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12.031 0C5.420 0 0.062 5.358 0.062 11.969C0.062 17.256 3.491 21.743 8.248 23.327C8.846 23.435 9.062 23.066 9.062 22.750C9.062 22.465 9.053 21.712 9.049 20.714C5.719 21.437 5.016 19.109 5.016 19.109C4.474 17.726 3.688 17.358 3.688 17.358C2.602 16.615 3.770 16.632 3.770 16.632C4.973 16.716 5.603 17.866 5.603 17.866C6.671 19.694 8.406 19.166 9.085 18.860C9.194 18.086 9.506 17.558 9.847 17.260C7.190 16.958 4.397 15.931 4.397 11.344C4.397 10.039 4.864 8.969 5.626 8.134C5.504 7.830 5.090 6.612 5.744 4.966C5.744 4.966 6.749 4.643 9.035 6.191C9.992 5.926 11.014 5.792 12.030 5.788C13.049 5.792 14.071 5.926 15.025 6.191C17.312 4.642 18.316 4.966 18.316 4.966C18.970 6.612 18.559 7.830 18.434 8.134C19.202 8.969 19.663 10.038 19.663 11.344C19.663 15.943 16.867 16.954 14.201 17.250C14.627 17.620 15.011 18.349 15.011 19.465C15.011 21.066 14.996 22.357 14.996 22.750C14.996 23.070 15.210 23.442 15.821 23.324C20.575 21.738 24 17.255 24 11.969C24 5.358 18.642 0 12.031 0Z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.BLUESKY:
      return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
              <path fill="currentColor" d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565C.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479c.815 2.736 3.713 3.66 6.383 3.364q.204-.03.415-.056q-.207.033-.415.056c-3.912.58-7.387 2.005-2.83 7.078c5.013 5.19 6.87-1.113 7.823-4.308c.953 3.195 2.05 9.271 7.733 4.308c4.267-4.308 1.172-6.498-2.74-7.078a9 9 0 0 1-.415-.056q.21.026.415.056c2.67.297 5.568-.628 6.383-3.364c.246-.828.624-5.79.624-6.478c0-.69-.139-1.861-.902-2.206c-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8"/>
            </svg>`;
    case SocialPlatform.X:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.INSTAGRAM:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.LINKEDIN:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.727 3.273C21.305 3.273 21.861 3.504 22.269 3.912C22.677 4.320 22.909 4.876 22.909 5.455V20.727C22.909 21.305 22.677 21.861 22.269 22.269C21.861 22.677 21.305 22.909 20.727 22.909H5.455C4.876 22.909 4.320 22.677 3.912 22.269C3.504 21.861 3.273 21.305 3.273 20.727V5.455C3.273 4.876 3.504 4.320 3.912 3.912C4.320 3.504 4.876 3.273 5.455 3.273H20.727ZM20.182 20.182V14.400C20.182 13.456 19.816 12.552 19.168 11.904C18.520 11.256 17.616 10.891 16.673 10.891C15.698 10.891 14.618 11.502 14.093 12.444V11.051H11.051V20.182H14.093V14.807C14.093 13.964 14.767 13.278 15.610 13.278C16.016 13.278 16.404 13.439 16.691 13.726C16.978 14.013 17.138 14.401 17.138 14.807V20.182H20.182ZM7.505 9.345C8.018 9.345 8.511 9.141 8.874 8.778C9.237 8.415 9.440 7.922 9.440 7.409C9.440 6.495 8.682 5.662 7.505 5.662C6.989 5.662 6.493 5.868 6.129 6.232C5.765 6.596 5.662 7.089 5.662 7.409C5.662 8.323 6.420 9.345 7.505 9.345ZM9.022 20.182V11.051H6V20.182H9.022Z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.EMAIL:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3H21C21.2652 3 21.5196 3.10536 21.7071 3.29289C21.8946 3.48043 22 3.73478 22 4V20C22 20.2652 21.8946 20.5196 21.7071 20.7071C21.5196 20.8946 21.2652 21 21 21H3C2.73478 21 2.48043 20.8946 2.29289 20.7071C2.10536 20.5196 2 20.2652 2 20V4C2 3.73478 2.10536 3.48043 2.29289 3.29289C2.48043 3.10536 2.73478 3 3 3ZM12.06 11.683L5.648 6.238L4.353 7.762L12.073 14.317L19.654 7.757L18.346 6.244L12.061 11.683H12.06Z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.YOUTUBE:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.TIKTOK:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.TWITCH:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.SPOTIFY:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.SOUNDCLOUD:
      return `<svg viewBox="0 4 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.2 22.68h-10.12c-0.28 0-0.56-0.16-0.72-0.4-0.080-0.12-0.12-0.32-0.12-0.48v-10.76c0-0.28 0.16-0.56 0.4-0.72 1.040-0.64 2.28-1 3.52-1 2.92 0 5.48 1.88 6.36 4.64 0.24-0.040 0.48-0.080 0.72-0.080 2.4 0 4.4 1.96 4.4 4.4s-2.040 4.4-4.44 4.4zM13.92 20.96h9.28c1.48 0 2.68-1.2 2.68-2.68s-1.2-2.68-2.68-2.68c-0.36 0-0.72 0.080-1.040 0.2-0.24 0.080-0.52 0.080-0.72-0.040-0.24-0.12-0.4-0.36-0.44-0.6-0.4-2.4-2.48-4.12-4.88-4.12-0.76 0-1.52 0.16-2.2 0.52v9.4zM10.84 21.8v-8.68c0-0.48-0.4-0.84-0.84-0.84s-0.84 0.4-0.84 0.84v8.72c0 0.48 0.4 0.84 0.84 0.84s0.84-0.4 0.84-0.88zM7.8 21.8v-9c0-0.48-0.4-0.84-0.84-0.84s-0.84 0.4-0.84 0.84v9.040c0 0.48 0.4 0.84 0.84 0.84s0.84-0.4 0.84-0.88zM4.76 21.8v-6.48c0-0.48-0.4-0.84-0.84-0.84s-0.84 0.4-0.84 0.84v6.52c0 0.48 0.4 0.84 0.84 0.84s0.84-0.4 0.84-0.88zM1.72 21.32v-5.32c0-0.48-0.4-0.84-0.84-0.84s-0.88 0.36-0.88 0.84v5.32c0 0.48 0.4 0.84 0.84 0.84s0.88-0.36 0.88-0.84z" fill="currentColor"/>
              </svg>`;
    case SocialPlatform.FACEBOOK:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.SNAPCHAT:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.06-1.273.149-.195.029-.39.059-.54.059-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.REDDIT:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.TUMBLR:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.631-.02 1.486-.205 1.936-.419l1.156 3.425c-.436.636-2.4 1.374-4.156 1.404h-.178l.011.002z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.MASTODON:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.DISCORD:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.TELEGRAM:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.PATREON:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524zM.003 23.537h4.22V.524H.003v23.013z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.KO_FI:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.PINTEREST:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.BANDCAMP:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z" fill="currentColor"/>
            </svg>`;
    case SocialPlatform.WEBSITE:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.125">
              <path d="M14.974,20.895A9.323,9.323,0,1,1,21.323,12.056a13.965,13.965,0,0,1-.274,2.25" stroke="currentColor" fill="none"/>
              <path d="M14.198,19.163A17.625,17.625,0,0,1,12,21.263" stroke="currentColor" fill="none"/>
              <path d="M12,2.625A12.803,12.803,0,0,1,16.339,11.25a12.776,12.776,0,0,1,.034,1.819" stroke="currentColor" fill="none"/>
              <path d="M12,2.625A12.784,12.784,0,0,0,7.616,12.173c0,6.075,2.73,7.875,4.373,9.090" stroke="currentColor" fill="none"/>
              <line x1="3.889" y1="7.463" x2="20.156" y2="7.463" stroke="currentColor"/>
              <line x1="12" y1="2.621" x2="12" y2="21.263" stroke="currentColor"/>
              <line x1="4.144" y1="17.055" x2="13.890" y2="17.055" stroke="currentColor"/>
              <line x1="2.678" y1="12.173" x2="21.323" y2="11.944" stroke="currentColor"/>
              <path d="M20.089,21.375,21.75,19.71l-3-3,1.706-1.091a.143.143,0,0,0-.045-.263L14.678,14.014a.146.146,0,0,0-.173.173L15.75,20.029a.146.146,0,0,0,.266.049L17.089,18.375Z" stroke="currentColor" fill="currentColor"/>
            </svg>`;
    default:
      return undefined;
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