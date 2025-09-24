import {
  SocialPlatform,
  normalizeHandle,
  validateHandle,
  getFullURL,
  createSocialLink,
  sanitizeInput,
  getPlatformPlaceholder,
} from '../../lib/social-links';

describe('Social Links Utilities', () => {
  describe('normalizeHandle', () => {
    describe('Instagram', () => {
      it('should normalize various input formats', () => {
        expect(normalizeHandle(SocialPlatform.INSTAGRAM, '@username')).toBe('username');
        expect(normalizeHandle(SocialPlatform.INSTAGRAM, 'username')).toBe('username');
        expect(normalizeHandle(SocialPlatform.INSTAGRAM, 'https://instagram.com/username')).toBe('username');
        expect(normalizeHandle(SocialPlatform.INSTAGRAM, 'instagram.com/username')).toBe('username');
        expect(normalizeHandle(SocialPlatform.INSTAGRAM, '@username?utm_source=test')).toBe('username');
      });
    });

    describe('Twitter/X', () => {
      it('should normalize various input formats', () => {
        expect(normalizeHandle(SocialPlatform.X, '@john_doe')).toBe('john_doe');
        expect(normalizeHandle(SocialPlatform.X, 'john_doe')).toBe('john_doe');
        expect(normalizeHandle(SocialPlatform.X, 'https://twitter.com/john_doe')).toBe('john_doe');
        expect(normalizeHandle(SocialPlatform.X, 'https://x.com/john_doe')).toBe('john_doe');
        expect(normalizeHandle(SocialPlatform.X, 'x.com/john_doe')).toBe('john_doe');
      });
    });

    describe('Bluesky', () => {
      it('should normalize various input formats', () => {
        expect(normalizeHandle(SocialPlatform.BLUESKY, '@alice.bsky.social')).toBe('alice.bsky.social');
        expect(normalizeHandle(SocialPlatform.BLUESKY, 'alice.bsky.social')).toBe('alice.bsky.social');
        expect(normalizeHandle(SocialPlatform.BLUESKY, 'alice')).toBe('alice.bsky.social');
        expect(normalizeHandle(SocialPlatform.BLUESKY, 'https://bsky.app/profile/alice.bsky.social')).toBe('alice.bsky.social');
      });
    });

    describe('LinkedIn', () => {
      it('should normalize various input formats', () => {
        expect(normalizeHandle(SocialPlatform.LINKEDIN, 'john-doe')).toBe('john-doe');
        expect(normalizeHandle(SocialPlatform.LINKEDIN, 'linkedin.com/in/john-doe')).toBe('john-doe');
        expect(normalizeHandle(SocialPlatform.LINKEDIN, 'https://linkedin.com/in/john-doe')).toBe('john-doe');
        expect(normalizeHandle(SocialPlatform.LINKEDIN, 'in/john-doe')).toBe('john-doe');
      });
    });

    describe('GitHub', () => {
      it('should normalize various input formats', () => {
        expect(normalizeHandle(SocialPlatform.GITHUB, 'octocat')).toBe('octocat');
        expect(normalizeHandle(SocialPlatform.GITHUB, 'github.com/octocat')).toBe('octocat');
        expect(normalizeHandle(SocialPlatform.GITHUB, 'https://github.com/octocat')).toBe('octocat');
      });
    });

    describe('Mastodon', () => {
      it('should normalize various input formats', () => {
        expect(normalizeHandle(SocialPlatform.MASTODON, '@user@mastodon.social')).toBe('@user@mastodon.social');
        expect(normalizeHandle(SocialPlatform.MASTODON, 'user@mastodon.social')).toBe('@user@mastodon.social');
      });
    });

    describe('Website', () => {
      it('should add https:// prefix if missing or upgrade http to https', () => {
        expect(normalizeHandle(SocialPlatform.WEBSITE, 'example.com')).toBe('https://example.com');
        // Force HTTPS for security
        expect(normalizeHandle(SocialPlatform.WEBSITE, 'http://example.com')).toBe('https://example.com');
        expect(normalizeHandle(SocialPlatform.WEBSITE, 'https://example.com')).toBe('https://example.com');
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous protocols', () => {
      expect(sanitizeInput('javascript:alert("XSS")')).toBe('alert("XSS")');
      // HTML tags are also removed by sanitizeInput
      expect(sanitizeInput('data:text/html,<script>alert("XSS")</script>')).toBe('text/html,alert("XSS")');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>malicious</script>')).toBe('malicious');
      expect(sanitizeInput('username<img src=x onerror=alert(1)>')).toBe('username');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  username  ')).toBe('username');
      expect(sanitizeInput('user   name')).toBe('user name');
    });
  });

  describe('validateHandle', () => {
    describe('Instagram validation', () => {
      it('should validate correct handles', () => {
        expect(validateHandle(SocialPlatform.INSTAGRAM, 'username')).toBe(true);
        expect(validateHandle(SocialPlatform.INSTAGRAM, 'user.name')).toBe(true);
        expect(validateHandle(SocialPlatform.INSTAGRAM, 'user_name')).toBe(true);
        expect(validateHandle(SocialPlatform.INSTAGRAM, 'user123')).toBe(true);
      });

      it('should reject invalid handles', () => {
        expect(validateHandle(SocialPlatform.INSTAGRAM, 'user name')).toBe(false);
        expect(validateHandle(SocialPlatform.INSTAGRAM, 'user@name')).toBe(false);
        expect(validateHandle(SocialPlatform.INSTAGRAM, 'a'.repeat(31))).toBe(false); // Too long
      });
    });

    describe('Twitter validation', () => {
      it('should validate correct handles', () => {
        expect(validateHandle(SocialPlatform.X, 'username')).toBe(true);
        expect(validateHandle(SocialPlatform.X, 'user_name')).toBe(true);
        expect(validateHandle(SocialPlatform.X, 'User123')).toBe(true);
      });

      it('should reject invalid handles', () => {
        expect(validateHandle(SocialPlatform.X, 'user.name')).toBe(false);
        expect(validateHandle(SocialPlatform.X, 'user-name')).toBe(false);
        expect(validateHandle(SocialPlatform.X, 'a'.repeat(16))).toBe(false); // Too long
      });
    });

    describe('Email validation', () => {
      it('should validate correct emails', () => {
        expect(validateHandle(SocialPlatform.EMAIL, 'user@example.com')).toBe(true);
        expect(validateHandle(SocialPlatform.EMAIL, 'john.doe+filter@company.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(validateHandle(SocialPlatform.EMAIL, 'not-an-email')).toBe(false);
        expect(validateHandle(SocialPlatform.EMAIL, '@example.com')).toBe(false);
        expect(validateHandle(SocialPlatform.EMAIL, 'user@')).toBe(false);
      });
    });
  });

  describe('getFullURL', () => {
    it('should generate correct URLs for each platform', () => {
      expect(getFullURL(SocialPlatform.INSTAGRAM, 'username')).toBe('https://instagram.com/username');
      expect(getFullURL(SocialPlatform.X, 'john_doe')).toBe('https://x.com/john_doe');
      expect(getFullURL(SocialPlatform.BLUESKY, 'alice.bsky.social')).toBe('https://bsky.app/profile/alice.bsky.social');
      expect(getFullURL(SocialPlatform.LINKEDIN, 'john-doe')).toBe('https://linkedin.com/in/john-doe');
      expect(getFullURL(SocialPlatform.GITHUB, 'octocat')).toBe('https://github.com/octocat');
      expect(getFullURL(SocialPlatform.YOUTUBE, 'channelname')).toBe('https://youtube.com/@channelname');
      expect(getFullURL(SocialPlatform.EMAIL, 'user@example.com')).toBe('mailto:user@example.com');
      expect(getFullURL(SocialPlatform.MASTODON, '@user@mastodon.social')).toBe('https://mastodon.social/@user');
      expect(getFullURL(SocialPlatform.WEBSITE, 'https://example.com')).toBe('https://example.com');
    });
  });

  describe('createSocialLink', () => {
    it('should create valid social links', () => {
      const instagramUsername = createSocialLink(SocialPlatform.INSTAGRAM, '@myusername');
      expect(instagramUsername).toEqual({
        platform: SocialPlatform.INSTAGRAM,
        handle: 'myusername',
      });

      const instagramURL = getFullURL(SocialPlatform.INSTAGRAM, 'myusername');
      expect(instagramURL).toEqual('https://instagram.com/myusername');

      const twitterUsername = createSocialLink(SocialPlatform.X, 'https://x.com/jack');
      expect(twitterUsername).toEqual({
        platform: SocialPlatform.X,
        handle: 'jack',
      });

      const twitterURL = getFullURL(SocialPlatform.X, 'jack');
      expect(twitterURL).toEqual('https://x.com/jack');
    });

    it('should return null for invalid inputs', () => {
      expect(createSocialLink(SocialPlatform.INSTAGRAM, 'user name')).toBeNull();
      expect(createSocialLink(SocialPlatform.X, 'a'.repeat(20))).toBeNull();
      expect(createSocialLink(SocialPlatform.EMAIL, 'not-an-email')).toBeNull();
    });
  });

  describe('getPlatformPlaceholder', () => {
    it('should return helpful placeholders', () => {
      expect(getPlatformPlaceholder(SocialPlatform.INSTAGRAM)).toBe('@username');
      expect(getPlatformPlaceholder(SocialPlatform.BLUESKY)).toBe('@username.bsky.social');
      expect(getPlatformPlaceholder(SocialPlatform.LINKEDIN)).toBe('username');
      expect(getPlatformPlaceholder(SocialPlatform.EMAIL)).toBe('email@example.com');
      expect(getPlatformPlaceholder(SocialPlatform.WEBSITE)).toBe('https://example.com');
    });
  });
});