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
import { Navigation, SendData, WebViewSigning, ScanHistoryFns } from '../../lib';
import { getInjectedJavaScript, BrowserInfo } from '../../lib/webview/webview-injected';
import { fetchManifest } from '../../lib/webview/manifest';

type WebViewScreenRouteProp = RouteProp<Navigation.ModalStackParamList, typeof Navigation.WEBVIEW_SCREEN>;

const browserInfo: BrowserInfo = {
  name: 'Antler',
  version: Constants.expoConfig?.version || '1.0.0',
  platform: Platform.OS,
  supportedPermissions: ['profile']
};

export function WebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<WebViewScreenRouteProp>();
  const did = route.params.did;
  const url = route.params.url;
  const webViewPublicKey = route.params.webViewPublicKey;
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(url || '');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Log component mount timing and clean up ephemeral key pair when WebView unmounts
  useEffect(() => {
    if (__DEV__) {
      console.log('[WebView Diagnostics] Component mounted, initializing WebView...', Date.now());
    }

    return () => {
      // Clean up the ephemeral key pair for this session
      WebViewSigning.cleanupKeyPair(webViewPublicKey);
      if (__DEV__) {
        console.log('[WebView] Cleaned up ephemeral key pair on unmount');
      }
    };
  }, [webViewPublicKey]);

  // Fetch manifest and save scan if valid manifest found
  useEffect(() => {
    const fetchManifestAndSaveScan = async () => {
      try {
        const manifest = await fetchManifest(currentUrl);

        if (manifest) {
          // Save scan with manifest data (only mini apps with manifests are tracked)
          await ScanHistoryFns.saveScan(currentUrl, did, manifest);

          if (__DEV__) {
            console.log('[WebView] Saved scan to history with manifest:', manifest.name);
          }
        } else {
          if (__DEV__) {
            console.log('[WebView] No manifest found - scan not tracked (regular QR code)');
          }
        }
      } catch (error) {
        console.error('[WebView] Error fetching manifest:', error);
        // Silent fail - don't disrupt user experience or save scan
      }
    };

    if (!loading && currentUrl) {
      fetchManifestAndSaveScan();
    }
  }, [loading, currentUrl, did]);

  // Send disconnect event before closing
  const handleDisconnect = async () => {
    try {
      const disconnectJWT = await SendData.sendDataToWebView(
        SendData.WebViewDataType.PROFILE_DISCONNECTED,
        did,
        url
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

        case 'localFirstAuth:api:close':
          // Send disconnect event and close WebView
          await handleDisconnect();
          navigation.goBack();
          break;

        case 'localFirstAuth:api:getProfileDetails': {
          // Generate and send profile JWT when web app requests it
          const profileJWT = await SendData.getProfileDetailsJWT(did, url);

          // Build response with requestId and timestamp
          const response = {
            type: 'localFirstAuth:api:getProfileDetails:response',
            requestId: requestId,
            jwt: profileJWT,
            timestamp: Date.now()
          };

          // Sign the response to prevent XSS forgery
          const signature = WebViewSigning.signMessage(response, webViewPublicKey);

          const messageToSend = JSON.stringify({
            ...response,
            signature: signature
          });
          webViewRef.current?.postMessage(messageToSend);
          break;
        }

        case 'localFirstAuth:api:getAvatar': {
          // Get avatar JWT when web app requests it (returns null if no avatar)
          const avatarJWT = await SendData.getAvatarJWT(did, url);

          // Build response with requestId and timestamp
          // If avatarJWT is null, use 'result', otherwise use 'jwt' (consistent with getProfileDetails)
          const response = avatarJWT
            ? {
                type: 'localFirstAuth:api:getAvatar:response',
                requestId: requestId,
                jwt: avatarJWT,
                timestamp: Date.now()
              }
            : {
                type: 'localFirstAuth:api:getAvatar:response',
                requestId: requestId,
                result: null,
                timestamp: Date.now()
              };

          // Sign the response to prevent XSS forgery
          const signature = WebViewSigning.signMessage(response, webViewPublicKey);

          webViewRef.current?.postMessage(JSON.stringify({
            ...response,
            signature: signature
          }));
          break;
        }

        case 'localFirstAuth:api:requestPermission': {
          // For now, respond with permission denied
          // TODO: Implement permission request UI
          const response = {
            type: 'localFirstAuth:api:requestPermission:response',
            requestId: requestId,
            result: false,
            timestamp: Date.now()
          };

          // Sign the response to prevent XSS forgery
          const signature = WebViewSigning.signMessage(response, webViewPublicKey);

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
          injectedJavaScriptBeforeContentLoaded={getInjectedJavaScript(webViewPublicKey, browserInfo)}
          style={styles.webView}
          startInLoadingState={true}
          javaScriptEnabled={true}
          cacheEnabled={false}
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
