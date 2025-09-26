import React, { useState, useEffect, useCallback } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { CameraPermissions } from '../components/camera/CameraPermissions';
import { CameraView } from '../components/camera/CameraView';
import { ProfileCarousel } from '../components/camera/ProfileCarousel';
import { LocalStorage, Camera, Navigation } from '../../lib';
import * as Haptics from 'expo-haptics';

export function CameraScreen() {
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();
  const isFocused = useIsFocused();

  const [allProfiles, setAllProfiles] = useState<LocalStorage.UserProfile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
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
          setCurrentProfileIndex(currentIndex);
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };


  const handleProfileChange = useCallback(async (index: number) => {
    if (index >= 0 && index < allProfiles.length && index !== currentProfileIndex) {
      setCurrentProfileIndex(index);

      // Update LocalStorage
      const selectedProfile = allProfiles[index];
      if (selectedProfile) {
        await LocalStorage.setCurrentUser(selectedProfile.id);
        // Small haptic feedback on profile selection
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [allProfiles, currentProfileIndex]);

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

  return (
    <View style={styles.container}>
      <CameraView isFocused={isFocused} />
      <ProfileCarousel
        profiles={allProfiles}
        currentIndex={currentProfileIndex}
        onProfileChange={handleProfileChange}
        onAddProfile={handleAddProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
});
