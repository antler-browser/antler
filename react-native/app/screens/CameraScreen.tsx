import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useNavigation, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import WebView from 'react-native-webview';
import { CameraPermissions } from '../components/camera/CameraPermissions';
import { CameraView } from '../components/camera/CameraView';
import { ProfileCarousel } from '../components/profile';
import { UserProfile, UserProfileFns, Camera, Navigation } from '../../lib';
import * as Haptics from 'expo-haptics';

export function CameraScreen() {
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();
  const route = useRoute<RouteProp<Navigation.RootStackParamList, typeof Navigation.CAMERA_SCREEN>>();
  const pendingUrl = route.params?.pendingUrl;
  const isFocused = useIsFocused();

  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const hasAtLeastOneProfile = useMemo(() => allProfiles.length > 0, [allProfiles]);

  const { permission, requestCameraAccess } = Camera.useCameraPermission();

  // WebView pre-warming state
  const [shouldPreWarmWebView, setShouldPreWarmWebView] = useState(true);

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

  // AppState listener to clean up WebView when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Clean up pre-warmed WebView to save memory
        setShouldPreWarmWebView(false);
      } else if (nextAppState === 'active' && isFocused && permission?.granted) {
        // Re-warm when app returns to foreground (if on CameraScreen)
        setShouldPreWarmWebView(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isFocused, permission]);

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
        pendingUrl={pendingUrl}
      />
      <ProfileCarousel
        profiles={allProfiles}
        currentIndex={currentProfileIndex}
        onProfileChange={handleProfileChange}
        onAddProfile={handleAddProfile}
        onViewProfile={handleViewProfile}
      />

      {/* Hidden WebView to speed up loading of WebView on next screen */}
      {isFocused && shouldPreWarmWebView && (
        <View style={styles.hiddenWebView}>
          <WebView
            source={{ html: '<html><body></body></html>' }}
            javaScriptEnabled={true}
          />
        </View>
      )}
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
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
});
