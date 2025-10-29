/**
 * Mini App Manifest Utilities
 * Fetches and validates mini app manifests according to IRL Browser Standard
 */

// Maximum allowed sizes for manifest fields (UGC protection)
const MAX_LENGTHS = {
  name: 100,
  description: 500,
  location: 200,
  icon: 500,
  type: 50,
};

// Timeout for fetch requests (5 seconds)
const FETCH_TIMEOUT_MS = 5000;

// Maximum manifest size (100KB)
const MAX_MANIFEST_SIZE = 100 * 1024;

/**
 * Manifest data structure according to IRL Browser Standard
 */
export interface Manifest {
  name: string;
  description?: string;
  location?: string;
  icon?: string;
  type?: string;
  permissions?: string[];
}

/**
 * Sanitized manifest data for storage
 */
export interface SanitizedManifest {
  name: string;
  description: string | null;
  location: string | null;
  icon: string | null;
  type: string | null;
}

/**
 * Strip HTML tags from a string to prevent XSS
 */
function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Truncate string to maximum length
 */
function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }
  return input.substring(0, maxLength);
}

/**
 * Validate that a string is a valid HTTPS URL
 */
function isValidHttpsUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize a string field by stripping HTML and truncating
 */
function sanitizeField(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  return truncate(stripHtmlTags(value.trim()), maxLength);
}

/**
 * Sanitize an icon URL field (must be valid HTTPS after resolution)
 * Supports relative URLs (e.g., ./icon.png, /icon.png) which are resolved against baseUrl
 */
function sanitizeIconUrl(value: unknown, maxLength: number, baseUrl?: string): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  let iconUrl = value.trim();

  // If the URL is relative and we have a base URL, resolve it
  if (baseUrl && !iconUrl.startsWith('http://') && !iconUrl.startsWith('https://')) {
    try {
      const resolved = new URL(iconUrl, baseUrl);
      iconUrl = resolved.toString();
    } catch (error) {
      console.warn('[Manifest] Failed to resolve relative icon URL:', iconUrl, error);
      return null;
    }
  }

  // After resolution, validate it's HTTPS
  if (!isValidHttpsUrl(iconUrl)) {
    console.warn('[Manifest] Invalid icon URL: not HTTPS', iconUrl);
    return null;
  }

  return truncate(iconUrl, maxLength);
}

/**
 * Validate and sanitize manifest data
 * Returns null if manifest is invalid or missing required fields
 * @param json - The manifest JSON to validate
 * @param baseUrl - Optional base URL for resolving relative icon URLs
 */
export function validateManifest(json: unknown, baseUrl?: string): SanitizedManifest | null {
  // Check if json is an object
  if (!json || typeof json !== 'object') {
    console.warn('[Manifest] Invalid manifest: not an object');
    return null;
  }

  const manifest = json as Record<string, unknown>;

  // Validate and sanitize required name field
  const name = sanitizeField(manifest.name, MAX_LENGTHS.name);
  if (!name) {
    console.warn('[Manifest] Invalid manifest: missing or empty name field');
    return null;
  }

  // Sanitize optional fields
  return {
    name,
    description: sanitizeField(manifest.description, MAX_LENGTHS.description),
    location: sanitizeField(manifest.location, MAX_LENGTHS.location),
    icon: sanitizeIconUrl(manifest.icon, MAX_LENGTHS.icon, baseUrl),
    type: sanitizeField(manifest.type, MAX_LENGTHS.type),
  };
}

/**
 * Fetch manifest from a mini app URL
 * 1. Fetches the HTML page
 * 2. Parses for <link rel="irl-manifest"> tag
 * 3. Fetches the manifest JSON
 * 4. Validates and sanitizes the manifest
 *
 * Returns null if manifest cannot be fetched or is invalid
 */
export async function fetchManifest(url: string): Promise<SanitizedManifest | null> {
  try {
    // Validate the input URL
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      console.warn('[Manifest] Invalid URL protocol', parsedUrl.protocol);
      return null;
    }

    // Fetch the HTML page with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let htmlResponse: Response;
    try {
      htmlResponse = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Antler/1.0 (IRL Browser)',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!htmlResponse.ok) {
      console.warn('[Manifest] Failed to fetch HTML', htmlResponse.status);
      return null;
    }

    // Check content length
    const contentLength = htmlResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_MANIFEST_SIZE) {
      console.warn('[Manifest] HTML too large', contentLength);
      return null;
    }

    const html = await htmlResponse.text();

    // Parse HTML for <link rel="irl-manifest" href="...">
    // Using a simple regex since we don't need full HTML parsing
    const manifestLinkMatch = html.match(/<link[^>]*rel=["']irl-manifest["'][^>]*>/i);
    if (!manifestLinkMatch) {
      console.warn('[Manifest] No manifest link found in HTML');
      return null;
    }

    // Extract href from the link tag
    const hrefMatch = manifestLinkMatch[0].match(/href=["']([^"']+)["']/i);
    if (!hrefMatch || !hrefMatch[1]) {
      console.warn('[Manifest] No href in manifest link');
      return null;
    }

    // Resolve relative URLs
    const manifestUrl = new URL(hrefMatch[1], url).toString();

    // Fetch the manifest JSON with timeout
    const manifestController = new AbortController();
    const manifestTimeoutId = setTimeout(() => manifestController.abort(), FETCH_TIMEOUT_MS);

    let manifestResponse: Response;
    try {
      manifestResponse = await fetch(manifestUrl, {
        signal: manifestController.signal,
        headers: {
          'User-Agent': 'Antler/1.0 (IRL Browser)',
        },
      });
    } finally {
      clearTimeout(manifestTimeoutId);
    }

    if (!manifestResponse.ok) {
      console.warn('[Manifest] Failed to fetch manifest JSON', manifestResponse.status);
      return null;
    }

    // Check content length
    const manifestContentLength = manifestResponse.headers.get('content-length');
    if (manifestContentLength && parseInt(manifestContentLength, 10) > MAX_MANIFEST_SIZE) {
      console.warn('[Manifest] Manifest JSON too large', manifestContentLength);
      return null;
    }

    const manifestJson = await manifestResponse.json();

    // Validate and sanitize the manifest (pass page URL for resolving relative icon URLs)
    return validateManifest(manifestJson, url);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[Manifest] Fetch timeout');
      } else {
        console.warn('[Manifest] Error fetching manifest:', error.message);
      }
    }
    return null;
  }
}
