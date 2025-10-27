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
import { getInjectedJavaScript, BrowserInfo } from '../../lib/webview-injected';

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
          injectedJavaScript={getInjectedJavaScript(webViewPublicKey, browserInfo)}
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
