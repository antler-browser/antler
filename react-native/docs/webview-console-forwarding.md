# WebView Console Forwarding

## Overview

By default, Antler does **not** forward `console.log()`, `console.warn()`, `console.error()`, and `console.info()` messages from the WebView to React Native's console. This feature was disabled to optimize WebView loading performance.

### Why It Was Removed

We don't need it on production for security reasons. Console forwarding adds overhead to WebView initialization and every console call, so we removed it, but you can re-enable it for development.

## How to Re-enable Console Forwarding

If you need console logs forwarded to React Native for development, follow these steps:

### Step 1: Add placeholder to `lib/webview-injected.raw.js`

Find the line with `console.log('[IRL Browser] WebView API injected');` (around line 207) and add the placeholder **before** it:

```javascript
  };

  __CONSOLE_INTERCEPT_CODE__

  console.log('[IRL Browser] WebView API injected');
```

### Step 2: Update `lib/webview-injected.ts`

Add the `isDev` parameter back to the function signature:

```typescript
export function getInjectedJavaScript(
  webViewPublicKey: string,
  browserInfo: BrowserInfo,
): string {
```

Then add the console intercept replacement logic:

```typescript
  // Replace placeholders in the pre-minified template
  let injectedCode = minifiedMainTemplate
    .replace('__WEBVIEW_PUBLIC_KEY__', webViewPublicKey)
    .replace('__BROWSER_INFO__', JSON.stringify(browserInfo))
    .replace('__CONSOLE_INTERCEPT_CODE__,', minifiedConsoleIntercept);

  return injectedCode;
}
```

### Step 3: Rebuild Minified Files

Run the minification script to regenerate the minified JavaScript:

```bash
yarn minify-webview
```

### Step 4: Restart Your App

Stop and restart your development server:

```bash
# Stop the current dev server (Ctrl+C)
yarn dev
```

### Step 5: Verify It's Working

In your mini app, test console forwarding:

```javascript
console.log('Hello from mini app!');
console.warn('Warning message');
console.error('Error message');
```

You should now see these messages prefixed with `[WebView console message]` in your React Native console.