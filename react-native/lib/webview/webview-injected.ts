/**
 * WebView Injected JavaScript
 *
 * This module contains the JavaScript code that gets injected into the WebView
 * to provide the window.irlBrowser API for mini apps. It implements secure
 * communication between the WebView and React Native using ECDSA P-256 signatures
 * to prevent XSS forgery attacks.
 *
 * The JavaScript code is pre-minified at build time using esbuild for maximum performance.
 * Run `yarn minify-webview` to regenerate the minified files after editing the raw templates.
 */

import { minifiedMainTemplate } from './webview-injected.min';
import { minifiedConsoleIntercept } from './webview-console-intercept.min';

export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  supportedPermissions: string[];
}

/**
 * Generates the JavaScript code to be injected into the WebView.
 * This code sets up the window.irlBrowser API and handles secure communication
 * with the React Native app using ECDSA P-256 signature verification.
 *
 * The returned code is pre-minified for optimal performance (zero runtime overhead).
 *
 * @param webViewPublicKey - Base64-encoded ECDSA P-256 public key for verifying native signatures
 * @param browserInfo - Information about the browser (name, version, platform, permissions)
 * @returns Minified JavaScript code as a string to be injected into the WebView
 */
export function getInjectedJavaScript(
  webViewPublicKey: string,
  browserInfo: BrowserInfo
): string {
  // Replace placeholders in the pre-minified template
  let injectedCode = minifiedMainTemplate
    .replace('__WEBVIEW_PUBLIC_KEY__', webViewPublicKey)
    .replace('__BROWSER_INFO__', JSON.stringify(browserInfo));

  return injectedCode;
}
