import React, { useState, useEffect } from 'react';
import { StyleSheet, Image, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Screen, ThemedView, ThemedText, ThemedButton, ProgressIndicator, HeaderBackButton } from '../../components/ui';
import { Colors, Navigation, User, LocalStorage } from '../../../lib';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../../hooks';

type NavigationProp = NativeStackNavigationProp<Navigation.ProfileCreationStackParamList, 'Avatar'>;
type RouteProps = RouteProp<Navigation.ProfileCreationStackParamList, 'Avatar'>;

export function AvatarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const colors = Colors['light'];

  const mode = route.params.mode;
  const did = route.params.did;

  // Use useProfile hook to get profile data when in edit mode
  const { profile, isLoading } = did 
    ? useProfile(did) 
    : { profile: null, isLoading: false };

  const [avatar, setAvatar] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing avatar if in edit mode
  useEffect(() => {
    if (mode === 'edit' && profile && profile.avatar) {
      setAvatar(profile.avatar);
    }
  }, [mode, profile]);

  const pickImage = async (source: 'camera' | 'library') => {
    setIsPickingImage(true);
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take a photo');
          setIsPickingImage(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library permission is required');
          setIsPickingImage(false);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const base64Image = `data:image/jpeg;base64,${asset.base64}`;
          setAvatar(base64Image);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Avatar',
      'Choose how you want to add your avatar',
      [
        { text: 'Take Photo', onPress: () => pickImage('camera') },
        { text: 'Choose from Library', onPress: () => pickImage('library') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const generateDIDAndComplete = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (mode === 'edit') {
        // Update existing profile
        if (!did) {
          throw new Error('Profile ID is required for edit mode');
        }

        const existingProfile = await LocalStorage.getUserProfile(did);
        if (!existingProfile) {
          throw new Error('Profile not found');
        }

        const updatedProfile: LocalStorage.UserProfile = {
          ...existingProfile,
          name: route.params.name,
          socials: route.params.socials,
          avatar: avatar || undefined,
        };

        await LocalStorage.saveUserProfile(updatedProfile);

        // Navigate back to profile view screen
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              { name: Navigation.CAMERA_SCREEN },
              { name: Navigation.PROFILE_SCREEN, params: { did } }
            ],
          })
        );
      } else {
        // Create new profile
        const profile = await User.createUserWithDID(route.params.name);

        const updatedProfile: LocalStorage.UserProfile = {
          ...profile,
          socials: route.params.socials,
          avatar: avatar || undefined,
        };

        await LocalStorage.saveUserProfile(updatedProfile);

        // Navigate back to camera screen and reset the stack
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: Navigation.CAMERA_SCREEN }],
          })
        );
      }
    } catch (err) {
      console.error('Error completing profile:', err);
      setError(mode === 'edit' ? 'Failed to update profile. Please try again.' : 'Failed to create your identity. Please try again.');
      Alert.alert(
        'Error',
        mode === 'edit' ? 'Failed to update profile. Please try again.' : 'Failed to complete setup. Please try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    generateDIDAndComplete();
  };

  const handleSkip = () => {
    generateDIDAndComplete();
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
  };

  if (mode === 'edit' && !profile) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedView />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.headerButtons}>
        <HeaderBackButton />
        {mode === 'create' && <ProgressIndicator currentStep={3} totalSteps={3} />}
      </ThemedView>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {mode === 'edit' ? 'Edit your avatar' : 'Add your avatar'}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Personalize your profile with a photo (optional)
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.middle}>
          <TouchableOpacity
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            onPress={!avatar ? showImageOptions : undefined}
            disabled={isPickingImage || isGenerating}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <ThemedView style={styles.placeholderContainer}>
                <ThemedText style={styles.avatarPlaceholder}>
                  {isPickingImage ? '...' : '👤'}
                </ThemedText>
                <ThemedText style={styles.addPhotoText}>
                  Tap to add photo
                </ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>

          {avatar && !isGenerating && (
            <ThemedView style={styles.avatarActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card }]}
                onPress={showImageOptions}
              >
                <ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>
                  Change Photo
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card }]}
                onPress={handleRemoveAvatar}
              >
                <ThemedText style={[styles.actionButtonText, { color: colors.notification }]}>
                  Remove
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          {isGenerating && (
            <ThemedView style={styles.generatingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <ThemedText style={styles.generatingText}>
                {mode === 'edit' ? 'Updating your profile...' : 'Creating your identity...'}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.footer}>
          {!isGenerating && (
            <>
              <ThemedButton
                title={mode === 'edit' ? 'Save Changes' : (avatar ? 'Complete Setup' : 'Skip & Complete')}
                onPress={avatar ? handleComplete : handleSkip}
                variant="primary"
                disabled={isPickingImage}
              />
              {!avatar && (
                <ThemedButton
                  title="Add Photo"
                  onPress={showImageOptions}
                  variant="secondary"
                  disabled={isPickingImage}
                />
              )}
            </>
          )}
        </ThemedView>
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerButtons: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  avatarContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPlaceholder: {
    fontSize: 80,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.6,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  generatingContainer: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  generatingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  footer: {
    gap: 12,
  },
});