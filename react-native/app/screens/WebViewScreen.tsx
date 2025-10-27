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
import { Navigation, SendData } from '../../lib';

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
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(route.params?.url || '');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

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

  const reload = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
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

        case 'irl:api:getProfileDetails':
          // Generate and send profile JWT when web app requests it
          try {
            const profileJWT = await SendData.getProfileDetailsJWT(did);
            webViewRef.current?.postMessage(JSON.stringify({
              type: 'irl:api:getProfileDetails:response',
              jwt: profileJWT
            }));
          } catch (error) {
            console.error('Error generating profile JWT:', error);
            webViewRef.current?.postMessage(JSON.stringify({
              type: 'irl:api:getProfileDetails:error',
              error: 'Failed to generate profile JWT'
            }));
          }
          break;

        case 'irl:api:requestPermission':
          // For now, respond with permission denied
          // TODO: Implement permission request UI
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'irl:api:requestPermission:response',
            result: false
          }));
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message from WebView:', error);
    }
  };

  // Create injected JavaScript that sets up window.irlBrowser API
  const getInjectedJavaScript = () => {
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
        // Helper for async communication with native
        function callNativeApp(type, data, timeout) {
          return new Promise(function(resolve, reject) {
            var handled = false;
            var timeoutId;

            function handleResponse(event) {
              if (!event.data) return;

              // Parse JSON if event.data is a string from React Native
              var data = event.data;
              if (typeof data === 'string') {
                try {
                  data = JSON.parse(data);
                } catch (e) {
                  return; // Ignore invalid JSON
                }
              }

              if (data.type === type + ':response') {
                if (!handled) {
                  handled = true;
                  clearTimeout(timeoutId);
                  window.removeEventListener('message', handleResponse);
                  resolve(data.jwt || data.result);
                }
              } else if (data.type === type + ':error') {
                if (!handled) {
                  handled = true;
                  clearTimeout(timeoutId);
                  window.removeEventListener('message', handleResponse);
                  reject(new Error(data.error || 'Request failed'));
                }
              }
            }

            window.addEventListener('message', handleResponse);

            // Build message object without spread operator for compatibility
            var message = { type: type };
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

        console.log('[IRL Browser] API injected');
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
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          injectedJavaScript={getInjectedJavaScript()}
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
