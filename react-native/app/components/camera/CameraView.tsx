import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView as ExpoCameraView } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera/build/Camera.types';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { ThemedText } from '../ui';
import { Camera, Navigation, AppStateFns, WebViewSigning } from '../../../lib';

interface CameraViewProps {
  isFocused: boolean;
  hasAtLeastOneProfile: boolean;
}

export function CameraView({
  isFocused,
  hasAtLeastOneProfile,
}: CameraViewProps) {
  const [enableTorch, setEnableTorch] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);
  const [webViewPublicKey, setWebViewPublicKey] = useState<string | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();

  useEffect(() => {
    // Generate fresh ephemeral ECDSA P-256 key pair for WebView internal messages signing
    generateWebViewKeyPair();

    // Clear timeout when component unmounts
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const generateWebViewKeyPair = async () => {
    try {
      const newPublicKey = await WebViewSigning.generateEphemeralKeyPair();
      setWebViewPublicKey(newPublicKey);
    } catch (error) {
      console.error('Error generating ECDSA P-256 key pair:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Reset App',
      'Are you sure you want to delete all data and start over?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset App',
          style: 'destructive',
          onPress: async () => {
            try {
              await AppStateFns.resetAllData();
              await AppStateFns.initAppState();
              // Reset to welcome screen after clearing all data
              navigation.dispatch(
                CommonActions.reset({
                index: 0,
                routes: [{ name: Navigation.WELCOME_SCREEN }],
              }));
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleFlash = () => {
    setEnableTorch(current => !current);
  };

  const getFlashIcon = () => {
    return enableTorch ? 'flash' : 'flash-off';
  };

  const handleSettingsPress = () => {
    navigation.navigate(Navigation.MODAL_STACK, {
      screen: Navigation.SETTINGS_SCREEN
    });
  };

  const fakeQRCodeForDevMode = useCallback(async () => {
    if (!__DEV__) { return; }
    if (!webViewPublicKey) { return; } // Wait for key to load

    const appState = await AppStateFns.getAppState();
    const did = appState.currentDid;
    const url = "https://google.com";

    if (!did) {
      navigation.navigate(Navigation.MODAL_STACK, {
        screen: Navigation.PROFILE_CREATE_OR_EDIT_SCREEN,
        params: {
          pendingUrl: url,
          pendingWebViewPublicKey: webViewPublicKey,
        }
      });
    } else {
      navigation.navigate(Navigation.MODAL_STACK, {
        screen: Navigation.WEBVIEW_SCREEN,
        params: {
          url: url,
          did,
          webViewPublicKey
        }
      });
    }
  }, [webViewPublicKey, navigation]);

  const handleBarCodeScanned = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (isScanning || !data || data === lastScannedData) return;
    if (!webViewPublicKey) { return; } // Wait for key to load

    setIsScanning(true);
    setLastScannedData(data);

    const scannedResult = Camera.handleScannedData(data);

    // Only handle URL type QR codes
    if (scannedResult.type !== 'url') {
      // Reset scanning state after interval
      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
        setLastScannedData(null);
      }, Camera.CAMERA_SETTINGS.scanInterval);
      return;
    }

    // Check if user has a profile (currentDid)
    const appState = await AppStateFns.getAppState();
    const did = appState.currentDid;
    const url = scannedResult.value;

    if (!did) {
      // No profile, navigate to profile creation with pending URL
      navigation.navigate(Navigation.MODAL_STACK, {
        screen: Navigation.PROFILE_CREATE_OR_EDIT_SCREEN,
        params: {
          pendingUrl: url
        }
      });
    } else {
      // Profile exists, navigate directly to WebView
      navigation.navigate(Navigation.MODAL_STACK, {
        screen: Navigation.WEBVIEW_SCREEN,
        params: {
          url,
          did,
          webViewPublicKey
        }
      });
    }

    // Reset scanning state after navigation
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      setLastScannedData(null);
    }, Camera.CAMERA_SETTINGS.scanInterval);
  }, [isScanning, lastScannedData, webViewPublicKey, navigation]);

  return (
    <View style={styles.container}>
      {isFocused && (
        <ExpoCameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={enableTorch}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.topControls}>
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.cameraControl}
                  onPress={fakeQRCodeForDevMode}
                  activeOpacity={0.7}
                >
                  <Ionicons name="qr-code-outline" size={28} color="white" />
                  <ThemedText style={styles.devModeText}>DEV</ThemedText>
                </TouchableOpacity>
              )}
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.cameraControl}
                  onPress={handleSignOut}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={28} color="white" />
                  <ThemedText style={styles.devModeText}>DEV</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cameraControl}
                onPress={toggleFlash}
                activeOpacity={0.7}
              >
                <Ionicons name={getFlashIcon()} size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraControl}
                onPress={handleSettingsPress}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            {!hasAtLeastOneProfile && (
              <View style={styles.scanningTextContainer}>
                <ThemedText style={styles.scanningText}>Scan a QR code to get started</ThemedText>
              </View>
            )}

            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="white" />
                <ThemedText style={styles.scanningText}>Processing...</ThemedText>
              </View>
            )}
          </SafeAreaView>
        </ExpoCameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraOverlay: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  cameraControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    height: '30%',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  scanningText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  scanningTextContainer: {
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devModeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

