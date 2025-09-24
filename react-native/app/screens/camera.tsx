import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '../components/ui/Screen';
import { ThemedView } from '../components/ui/ThemedView';
import { ThemedText } from '../components/ui/ThemedText';
import { CameraView, CameraType } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera/build/Camera.types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';

import { ProfileOverlay } from '../components/camera/ProfileOverlay';
import { LocalStorage, Colors, Camera, Navigation } from '../../lib';

export function CameraScreen() {
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();
  const isFocused = useIsFocused();
  const colors = Colors['light'];

  const [facing, setFacing] = useState<CameraType>(Camera.CAMERA_SETTINGS.defaultFacing);
  const [isScanning, setIsScanning] = useState(false);
  const [userProfile, setUserProfile] = useState<LocalStorage.UserProfile | null>(null);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { hasPermission, requestCameraAccess } = Camera.useCameraPermission();

  useEffect(() => {
    loadUserProfile();
    checkProfileStatus();
    if (!hasPermission) {
      requestCameraAccess();
    }
  }, []);

  useEffect(() => {
    // Check profile status when returning to the camera screen
    if (isFocused) {
      checkProfileStatus();
      loadUserProfile();
    }
  }, [isFocused]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await LocalStorage.getCurrentUser();
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkProfileStatus = async () => {
    try {
      const profileCreated = await LocalStorage.hasCompletedProfileCreation();
      setHasProfile(profileCreated);
    } catch (error) {
      console.error('Error checking profile status:', error);
    }
  };

  const handleCreateProfile = () => {
    navigation.navigate(Navigation.PROFILE_CREATION_SCREEN);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (isScanning || !data || data === lastScannedData) return;

    setIsScanning(true);
    setLastScannedData(data);

    const scannedResult = Camera.handleScannedData(data);

    let alertTitle = 'QR Code Scanned';
    let alertMessage = '';

    switch (scannedResult.type) {
      case 'url':
        alertTitle = 'URL Detected';
        alertMessage = `Open ${scannedResult.value}?`;
        break;
      case 'did':
        alertTitle = 'DID Detected';
        alertMessage = `Decentralized ID: ${scannedResult.value}`;
        break;
      default:
        alertMessage = scannedResult.value;
    }

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {
          text: 'OK',
          onPress: () => {
            scanTimeoutRef.current = setTimeout(() => {
              setIsScanning(false);
              setLastScannedData(null);
            }, Camera.CAMERA_SETTINGS.scanInterval);
          }
        }
      ]
    );
  };

  const handleProfilePress = () => {
    if (userProfile?.id) {
      navigation.navigate(Navigation.PROFILE_SCREEN, { did: userProfile.id });
    }
  };

  const handleSettingsPress = () => {
    navigation.navigate(Navigation.SETTINGS_SCREEN);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await LocalStorage.clearAll();
              navigation.reset({
                index: 0,
                routes: [{ name: Navigation.ONBOARDING_SCREEN }],
              });
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!hasPermission) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedView style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.text} />
          <ThemedText type="title" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText style={styles.permissionText}>
            Please grant camera permission to scan QR codes and use camera features.
          </ThemedText>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.tint }]}
            onPress={requestCameraAccess}
          >
            <ThemedText style={styles.permissionButtonText}>Grant Permission</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.topControls}>
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

          {__DEV__ && (
            <ProfileOverlay
              userProfile={userProfile}
              onProfilePress={handleProfilePress}
              onSettingsPress={handleSettingsPress}
              onSignOutPress={handleSignOut}
            />
          )}

          {/* Show create profile prompt if no profile exists */}
          {hasProfile === false && (
            <View style={styles.createProfilePrompt}>
              <View style={styles.createProfileContent}>
                <ThemedText style={styles.createProfileTitle}>Create Your Profile</ThemedText>
                <ThemedText style={styles.createProfileText}>
                  Set up your profile to share with others
                </ThemedText>
                <TouchableOpacity
                  style={styles.createProfileButton}
                  onPress={handleCreateProfile}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.createProfileButtonText}>Get Started</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
  },
  permissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraOverlay: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
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
  createProfilePrompt: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  createProfileContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  createProfileTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  createProfileText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  createProfileButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createProfileButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});