import React, { useState, useEffect } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import { CameraPermissions } from '../components/camera/CameraPermissions';
import { CameraView } from '../components/camera/CameraView';
import { LocalStorage, Camera, Navigation } from '../../lib';

export function CameraScreen() {
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();
  const isFocused = useIsFocused();

  const [userProfile, setUserProfile] = useState<LocalStorage.UserProfile | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const { permission, requestCameraAccess } = Camera.useCameraPermission();

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadUserProfile();
    }
  }, [isFocused]);

  useEffect(() => {
    // Auto-request permission for first-time users (when canAskAgain is true)
    if (permission && !permission.granted && !permissionError && permission.canAskAgain) {
      handleRequestPermission();
    }
  }, [permission]);

  const handleRequestPermission = async () => {
    setPermissionError(null);
    const granted = await requestCameraAccess();
    if (!granted) {
      setPermissionError('Camera permission was not granted. Please try again.');
    }
  };

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


  const handleProfilePress = () => {
    if (userProfile?.id) {
      navigation.navigate(Navigation.PROFILE_SCREEN, { did: userProfile.id });
    }
  };

  // Check Camera permissions
  if (!permission) {
    return <View style={styles.emptyContainer} />;
  }

  // Show native Camera alert:
  if (!permission.granted && permission.canAskAgain && !permissionError) {
    return <View style={styles.emptyContainer} />;
  }

  // Show custom Camera does not have permission screen:
  if (!permission.granted) {
    return (
      <CameraPermissions
        permission={permission}
        permissionError={permissionError}
        onRequestPermission={handleRequestPermission}
      />
    );
  }

  // Show Camera view:
  return (
    <CameraView
      userProfile={userProfile}
      onProfilePress={handleProfilePress}
      isFocused={isFocused}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
});