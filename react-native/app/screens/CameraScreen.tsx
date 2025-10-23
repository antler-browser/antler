import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { CameraPermissions } from '../components/camera/CameraPermissions';
import { CameraView } from '../components/camera/CameraView';
import { ProfileCarousel } from '../components/profile';
import { UserProfile, UserProfileFns, Camera, Navigation } from '../../lib';
import * as Haptics from 'expo-haptics';

export function CameraScreen() {
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();
  const isFocused = useIsFocused();

  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const hasAtLeastOneProfile = useMemo(() => allProfiles.length > 0, [allProfiles]);

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
      const profiles = await UserProfileFns.getAllProfiles();
      setAllProfiles(profiles as UserProfile[]);

      // Find the index of the current profile
      const currentUser = await UserProfileFns.getCurrentProfile();
      if (currentUser && profiles.length > 0) {
        const currentIndex = profiles.findIndex((p) => p.did === currentUser.did);
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

      // Update current user
      const selectedProfile = allProfiles[index];
      if (selectedProfile) {
        await UserProfileFns.setCurrentProfile(selectedProfile.did);
        // Small haptic feedback on profile selection
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [allProfiles, currentProfileIndex]);

  const handleAddProfile = () => {
    navigation.navigate(Navigation.MODAL_STACK, {
      screen: Navigation.PROFILE_CREATE_OR_EDIT_SCREEN,
    });
  };

  const handleViewProfile = useCallback((profile: UserProfile) => {
    navigation.navigate(Navigation.PROFILE_SCREEN, {
      did: profile.did,
    });
  }, [navigation]);

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
      <CameraView 
        isFocused={isFocused} 
        hasAtLeastOneProfile={hasAtLeastOneProfile}
      />
      <ProfileCarousel
        profiles={allProfiles}
        currentIndex={currentProfileIndex}
        onProfileChange={handleProfileChange}
        onAddProfile={handleAddProfile}
        onViewProfile={handleViewProfile}
      
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
