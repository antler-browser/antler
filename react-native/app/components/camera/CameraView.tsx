import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView as ExpoCameraView, CameraType, FlashMode } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera/build/Camera.types';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';

import { ProfileCarousel } from './ProfileCarousel';
import { ThemedText } from '../ui';
import { Camera, LocalStorage, Navigation } from '../../../lib';

interface CameraViewProps {
  allProfiles: LocalStorage.UserProfile[];
  activeProfileIndex: number;
  onProfilePress: () => void;
  onProfileSelect: (index: number) => void;
  onAddProfile: () => void;
  isFocused: boolean;
}

export function CameraView({
  allProfiles,
  activeProfileIndex,
  onProfilePress,
  onProfileSelect,
  onAddProfile,
  isFocused,
}: CameraViewProps) {
  const [facing, setFacing] = useState<CameraType>(Camera.CAMERA_SETTINGS.defaultFacing);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();
  
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
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
              await LocalStorage.clearAll();
              // Force app to reload by resetting to camera screen
              // The app will check onboarding status on reload
              navigation.dispatch(
                CommonActions.reset({
                index: 0,
                routes: [{ name: Navigation.ONBOARDING_SCREEN }],
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
    setFlash(current => {
      switch (current) {
        case 'off':
          return 'on';
        default:
          return 'off';
      }
    });
  };

  const getFlashIcon = () => {
    switch (flash) {
      case 'off':
        return 'flash-off';
      default:
        return 'flash';
    }
  };

  const fakeQRCodeForDevMode = async () => {
    if (!__DEV__) { return; }

    const appState = await LocalStorage.getAppState();
    const hasProfile = appState.currentDid;

    if (!hasProfile) {
      navigation.navigate(Navigation.PROFILE_CREATION_SCREEN, {
        pendingUrl: "https://www.google.com"
      });
    } else {
      navigation.navigate(Navigation.WEBVIEW_SCREEN, {
        url: "https://www.google.com"
      });
    }
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (isScanning || !data || data === lastScannedData) return;

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
    const appState = await LocalStorage.getAppState();
    const hasProfile = appState.currentDid;

    if (!hasProfile) {
      // No profile, navigate to profile creation with pending URL
      navigation.navigate(Navigation.PROFILE_CREATION_SCREEN, {
        pendingUrl: scannedResult.value
      });
    } else {
      // Profile exists, navigate directly to WebView
      navigation.navigate(Navigation.WEBVIEW_SCREEN, {
        url: scannedResult.value
      });
    }

    // Reset scanning state after navigation
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      setLastScannedData(null);
    }, Camera.CAMERA_SETTINGS.scanInterval);
  };

  return (
    <View style={styles.container}>
      {isFocused && (
        <ExpoCameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          flash={flash}
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
                onPress={toggleCameraFacing}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse" size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="white" />
                <ThemedText style={styles.scanningText}>Processing...</ThemedText>
              </View>
            )}
          </SafeAreaView>
          <ProfileCarousel
            profiles={allProfiles}
            activeProfileIndex={activeProfileIndex}
            onProfileSelect={onProfileSelect}
            onAddProfile={onAddProfile}
          />
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
  devModeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
