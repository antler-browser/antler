import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ThemedText, ThemedView } from '../components/ui';
import { Navigation, SendData, WebViewSigning } from '../../lib';

type WebViewScreenRouteProp = RouteProp<Navigation.ModalStackParamList, typeof Navigation.WEBVIEW_SCREEN>;

// Browser info to inject into WebView
const browserInfo = {
  name: 'Antler',
  version: Constants.expoConfig?.version || '1.0.0',
  platform: Platform.OS,
  supportedPermissions: ['profile']
};

export function WebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<WebViewScreenRouteProp>();
  const did = route.params.did;
  const webViewPublicKey = route.params.webViewPublicKey;
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(route.params?.url || '');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Log component mount timing
  useEffect(() => {
    if (__DEV__) {
      console.log('[WebView Diagnostics] Component mounted, initializing WebView...', Date.now());
    }
  }, []);

  // Send disconnect event before closing
  const handleDisconnect = async () => {
    try {
      const disconnectJWT = await SendData.sendDataToWebView(
        SendData.WebViewDataType.PROFILE_DISCONNECTED,
        did
      );

      webViewRef.current?.postMessage(JSON.stringify({ jwt: disconnectJWT }));
    } catch (error) {
      console.error('Error sending disconnect JWT:', error);
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
  };

  const goBack = async () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    } else {
     // disabled if !canGoBack
    }
  };

  const goForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.substring(0, 30) + (url.length > 30 ? '...' : '');
    }
  };

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      const requestId = message.requestId; // Extract request ID from message

      // Handle different message types
      switch (message.type) {
        case 'console':
          // Forward WebView console logs to React Native console (dev mode only)
          if (__DEV__ && message.args) {
            console.log('[WebView console message]', ...message.args);
          }
          break;

        case 'irl:api:close':
          // Send disconnect event and close WebView
          await handleDisconnect();
          navigation.goBack();
          break;

        case 'irl:api:getProfileDetails': {
          // Generate and send profile JWT when web app requests it
          const profileJWT = await SendData.getProfileDetailsJWT(did);

          // Build response with requestId and timestamp
          const response = {
            type: 'irl:api:getProfileDetails:response',
            requestId: requestId,
            jwt: profileJWT,
            timestamp: Date.now()
          };

          // Sign the response to prevent XSS forgery
          const signature = await WebViewSigning.signMessage(response, webViewPublicKey);

          webViewRef.current?.postMessage(JSON.stringify({
            ...response,
            signature: signature
          }));
          break;
        }

        case 'irl:api:requestPermission': {
          // For now, respond with permission denied
          // TODO: Implement permission request UI
          const response = {
            type: 'irl:api:requestPermission:response',
            requestId: requestId,
            result: false,
            timestamp: Date.now()
          };

          // Sign the response to prevent XSS forgery
          const signature = await WebViewSigning.signMessage(response, webViewPublicKey);

          webViewRef.current?.postMessage(JSON.stringify({
            ...response,
            signature: signature
          }));
          break;
        }

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message from WebView:', error);
    }
  };

  // Handle load start with timing
  const handleLoadStart = () => {
    if (__DEV__) {
      console.log(`[WebView Diagnostics] WebView Load started at ${Date.now()}`);
    }
    setLoading(true);
  };

  // Handle load end with timing summary
  const handleLoadEnd = () => {
    if (__DEV__) {
      console.log(`[WebView Diagnostics] WebView Load finished at ${Date.now()}`);
    }
    setLoading(false);
  };

  // Create injected JavaScript that sets up window.irlBrowser API
  const getInjectedJavaScript = (webViewPublicKey: string) => {    
    const consoleInterceptCode = __DEV__ ? `
        // Intercept console methods and forward to React Native
        ['log', 'warn', 'error', 'info'].forEach(function(method) {
          var original = console[method];
          console[method] = function() {
            // Call original console method
            original.apply(console, arguments);

            // Forward to React Native
            try {
              var args = Array.from(arguments).map(function(arg) {
                if (typeof arg === 'object') {
                  try {
                    return JSON.stringify(arg);
                  } catch (e) {
                    return '[Object]';
                  }
                }
                return String(arg);
              });

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'console',
                method: method,
                args: args
              }));
            } catch (e) {
              // Ignore errors in console forwarding
            }
          };
        });
    ` : '';

    return `
      (function() {
        // SECURITY: Native WebView public key for verifying native signatures (ECDSA P-256)
        var WEBVIEW_PUBLIC_KEY = '${webViewPublicKey}';

        // Helper: Decode base64 to Uint8Array
        function base64ToBytes(base64) {
          var binaryString = atob(base64);
          var bytes = new Uint8Array(binaryString.length);
          for (var i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        }

        // Helper: Canonical JSON serialization (sorted keys)
        // Must match native implementation for signature verification
        // Uses native JSON.stringify with sorted keys for optimal performance
        // NOTE: Optimized for flat objects (current message structures are all flat)
        function canonicalJSON(obj) {
          var sortedKeys = Object.keys(obj).sort();
          return JSON.stringify(obj, sortedKeys);
        }

        // SECURITY: Generate cryptographically random request IDs
        // Requires crypto object (same requirement as signature verification)
        function generateRequestId() {
          // Use crypto.randomUUID if available (Chrome 92+, Safari 15.4+)
          if (crypto.randomUUID) {
            return crypto.randomUUID();
          }

          // Fallback: Generate random hex string using crypto.getRandomValues
          var array = new Uint8Array(16);
          crypto.getRandomValues(array);
          return Array.from(array, function(byte) {
            return ('0' + byte.toString(16)).slice(-2);
          }).join('');
        }

        // SECURITY: Verify ECDSA P-256 signature to prevent XSS forgery
        async function verifySignature(response) {
          // Check if crypto.subtle is available
          if (typeof crypto === 'undefined' || !crypto.subtle) {
            console.error('[IRL Browser] crypto.subtle not available - cannot verify signatures');
            return false;
          }

          // Validate signature exists
          if (!response.signature) {
            console.error('[IRL Browser] Response missing signature - possible forgery attempt');
            return false;
          }

          try {
            // Extract signature and reconstruct the message that was signed
            var signature = response.signature;
            var messageToVerify = {
              type: response.type,
              requestId: response.requestId,
              timestamp: response.timestamp
            };

            // Include jwt or result depending on response type
            if (response.jwt !== undefined) {
              messageToVerify.jwt = response.jwt;
            }
            if (response.result !== undefined) {
              messageToVerify.result = response.result;
            }

            // Convert message to bytes using canonical JSON (sorted keys)
            var messageString = canonicalJSON(messageToVerify);
            var messageBytes = new TextEncoder().encode(messageString);

            // Decode signature from base64
            var signatureBytes = base64ToBytes(signature);

            // Decode public key from base64
            var publicKeyBytes = base64ToBytes(WEBVIEW_PUBLIC_KEY);

            // Import ECDSA P-256 public key
            var publicKey = await crypto.subtle.importKey(
              'raw',
              publicKeyBytes,
              {
                name: 'ECDSA',
                namedCurve: 'P-256'
              },
              false,
              ['verify']
            );

            // Verify signature using ECDSA with SHA-256
            var isValid = await crypto.subtle.verify(
              {
                name: 'ECDSA',
                hash: 'SHA-256'
              },
              publicKey,
              signatureBytes,
              messageBytes
            );

            if (!isValid) {
              console.error('[IRL Browser] Signature verification failed - possible XSS forgery attempt');
            }

            return isValid;
          } catch (error) {
            console.error('[IRL Browser] Error verifying signature:', error);
            return false;
          }
        }

        // Helper for async communication with native
        function callNativeApp(type, data, timeout) {
          return new Promise(function(resolve, reject) {
            var handled = false;
            var timeoutId;

            // Generate unique request ID for this call
            var requestId = generateRequestId();

            async function handleResponse(event) {
              if (!event.data) return;

              // Parse JSON if event.data is a string from React Native
              var responseData = event.data;
              if (typeof responseData === 'string') {
                try {
                  responseData = JSON.parse(responseData);
                } catch (e) {
                  return; // Ignore invalid JSON
                }
              }

              // Validate request ID matches to prevent cross-talk
              if (responseData.requestId !== requestId) {
                return; // Ignore messages with wrong request ID
              }

              // Verify signature to prevent XSS forgery
              if (!(await verifySignature(responseData))) {
                if (!handled) {
                  handled = true;
                  clearTimeout(timeoutId);
                  window.removeEventListener('message', handleResponse);
                  reject(new Error('Invalid signature - possible XSS forgery attempt'));
                }
                return;
              }

              if (responseData.type === type + ':response') {
                if (!handled) {
                  handled = true;
                  clearTimeout(timeoutId);
                  window.removeEventListener('message', handleResponse);
                  resolve(responseData.jwt || responseData.result);
                }
              } else if (responseData.type === type + ':error') {
                if (!handled) {
                  handled = true;
                  clearTimeout(timeoutId);
                  window.removeEventListener('message', handleResponse);
                  reject(new Error(responseData.error || 'Request failed'));
                }
              }
            }

            window.addEventListener('message', handleResponse);

            // Build message object with requestId
            var message = { type: type, requestId: requestId };
            for (var key in data) {
              if (data.hasOwnProperty(key)) {
                message[key] = data[key];
              }
            }
            window.ReactNativeWebView.postMessage(JSON.stringify(message), '*');

            timeoutId = setTimeout(function() {
              if (!handled) {
                handled = true;
                window.removeEventListener('message', handleResponse);
                reject(new Error('Request timed out'));
              }
            }, timeout || 5000);
          });
        }

        // Set up window.irlBrowser API
        window.irlBrowser = {
          // Get profile details as signed JWT (async)
          getProfileDetails: function() {
            return callNativeApp('irl:api:getProfileDetails', {});
          },
          // Return browser info synchronously
          getBrowserDetails: function() {
            return ${JSON.stringify(browserInfo)};
          },
          // Request additional permissions from native
          requestPermission: function(permission) {
            return callNativeApp('irl:api:requestPermission', { permission: permission });
          },
          // Close the WebView
          close: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'irl:api:close' }), '*');
          }
        };

        ${consoleInterceptCode}

        console.log('[IRL Browser] WebView API injected');
      })();
      true; // Required for injectedJavaScript
    `;
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={goBack}
            disabled={!canGoBack}
            style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={canGoBack ? 'black' : '#ccc'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goForward}
            disabled={!canGoForward}
            style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={canGoForward ? 'black' : '#ccc'}
            />
          </TouchableOpacity>
          <View style={styles.urlContainer}>
            <ThemedText style={styles.urlText} numberOfLines={1}>
              {formatUrl(currentUrl)}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={async () => {
              await handleDisconnect();
              navigation.goBack();
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: route.params?.url as string }}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          injectedJavaScript={getInjectedJavaScript(webViewPublicKey)}
          style={styles.webView}
          startInLoadingState={true}
          javaScriptEnabled={true}
          // renderLoading={() => (
          //   <View style={styles.loadingContainer}>
          //     <ActivityIndicator size="large" />
          //   </View>
          // )}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  closeButton: {
    padding: 5,
  },
  urlContainer: {
    flex: 1,
    marginHorizontal: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
  },
  urlText: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    padding: 5,
  },
  navigationBar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 10,
    gap: 20,
  },
  navButton: {
    padding: 5,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
