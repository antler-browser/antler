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

  const [allProfiles, setAllProfiles] = useState<LocalStorage.UserProfile[]>([]);
  const [activeProfileIndex, setActiveProfileIndex] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const { permission, requestCameraAccess } = Camera.useCameraPermission();

  useEffect(() => {
    loadAllProfiles();
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadAllProfiles();
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

  const loadAllProfiles = async () => {
    try {
      const profiles = await LocalStorage.getAllUserProfiles();
      setAllProfiles(profiles);

      // Find the index of the current profile
      const currentUser = await LocalStorage.getCurrentUser();
      if (currentUser && profiles.length > 0) {
        const currentIndex = profiles.findIndex(p => p.id === currentUser.id);
        if (currentIndex >= 0) {
          setActiveProfileIndex(currentIndex);
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };


  const handleProfilePress = () => {
    if (allProfiles[activeProfileIndex]?.id) {
      navigation.navigate(Navigation.PROFILE_SCREEN, { did: allProfiles[activeProfileIndex].id });
    }
  };

  const handleProfileSelect = async (index: number) => {
    if (index >= 0 && index < allProfiles.length) {
      setActiveProfileIndex(index);
      const selectedProfile = allProfiles[index];
      if (selectedProfile) {
        await LocalStorage.setCurrentUser(selectedProfile.id);
      }
    }
  };

  const handleAddProfile = () => {
    navigation.navigate(Navigation.MODAL_STACK, {
      screen: Navigation.PROFILE_CREATION_SCREEN,
    });
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
      allProfiles={allProfiles}
      activeProfileIndex={activeProfileIndex}
      onProfilePress={handleProfilePress}
      onProfileSelect={handleProfileSelect}
      onAddProfile={handleAddProfile}
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