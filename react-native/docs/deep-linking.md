# Deep Linking & Smart App Banners

Guide for implementing deep links and Smart App Banners with Antler.

## Deep Link Format

Anyone building a mini app can use this format to open up Antler with their mini app loaded:

```
https://antlerbrowser.com/open/[ENCODED_URL]
```

**Example:**
```
https://antlerbrowser.com/open/https%3A%2F%2Fexample.com%2Fmini-app
```

Opens `https://example.com/mini-app` in the Antler IRL Browser.

---

## Smart App Banners for Mini Apps

### What are Smart App Banners?

Native iOS Safari banners that let users open your web app directly in Antler.

### Implementation

Add this meta tag to your mini app's `<head>`:

#### Static (Fixed URL)
```html
<meta name="apple-itunes-app"
      content="app-id=6753969350, app-argument=https://antlerbrowser.com/open/https%3A%2F%2Fexample.com%2Fmini-app">
```

#### Dynamic (Use Current Page URL) - Recommended
```html
<script>
  const currentUrl = encodeURIComponent(window.location.href);
  const meta = document.createElement('meta');
  meta.name = 'apple-itunes-app';
  meta.content = `app-id=6753969350, app-argument=https://antlerbrowser.com/open/${currentUrl}`;
  document.head.appendChild(meta);
</script>
```

### User Flow

1. User visits your mini app in Safari
2. Smart App Banner appears: "Open in Antler"
3. User taps "Open"
4. Antler app opens with your mini app loaded
5. User has full `window.irlBrowser` API access

---

## How It Works (Internal)

1. User clicks deep link: `https://antlerbrowser.com/open/[ENCODED_URL]`
2. OS verifies domain (AASA/Asset Links files)
3. OS opens Antler app
4. React Navigation routes to `CameraScreen` with `pendingUrl`
5. `CameraView` generates ephemeral ECDSA key
6. App checks if user has profile:
   - **No profile** → Navigate to profile creation
   - **Has profile** → Navigate to WebView
7. WebView loads mini app with `window.irlBrowser` API

**Code locations**:
- Navigation config: `/app/screens/root.tsx:60-68`
- Camera handling: `/app/screens/CameraScreen.tsx:14,141`
- Deep link processing: `/app/components/camera/CameraView.tsx:57-88`
- App config: `app.config.js` (iOS: 15-17, Android: 42-54)

---

## Resources

- **iOS Universal Links**: https://developer.apple.com/ios/universal-links/
- **Smart App Banners**: https://developer.apple.com/documentation/webkit/promoting_apps_with_smart_app_banners
- **Android App Links**: https://developer.android.com/training/app-links
- **IRL Browser Standard**: `/docs/irl-browser-standard.md`
