import React, { useState, useEffect } from 'react';
import { StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import { Screen, ThemedView, ThemedText, ThemedButton, ProgressIndicator, HeaderBackButton } from '../../components/ui';
import { Colors, Navigation, UserProfileFns, DID, SecureStorage } from '../../../lib';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../../hooks';

type NavigationProp = NativeStackNavigationProp<Navigation.ProfileCreateOrEditStackParamList, 'Avatar'>;
type RouteProps = RouteProp<Navigation.ProfileCreateOrEditStackParamList, 'Avatar'>;

export function AvatarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const colors = Colors['light'];

  const mode = route.params.mode;
  const did = route.params.did;
  const name = route.params.name;
  const socials = route.params.socials;
  const pendingUrl = route.params.pendingUrl;
  const pendingWebViewPublicKey = route.params.pendingWebViewPublicKey;

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
      const { status } = source === 'camera' 
        ? await ImagePicker.requestCameraPermissionsAsync() 
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        throw new Error(source === 'camera' 
          ? 'Camera permission is required to take a photo' 
          : 'Photo library permission is required'
        );
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        base64: true,
      };

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options) 
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          const base64Image = `data:${mimeType};base64,${asset.base64}`;
          setAvatar(base64Image);
        } else {
          throw new Error('Failed to pick image. Please try again.');
        }
      }
    } catch (error) {
      setError(error instanceof Error 
        ? error.message : 
        'Failed to pick image. Please try again.');  
      console.error('Error picking image:', error);
    } finally {
      setIsPickingImage(false);
    }
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

        // Update the profile
        await UserProfileFns.updateProfileByDID(did, {
          name,
          socialLinks: socials,
          avatar,
        });

        // Simply dismiss the entire modal stack after profile edit
        navigation.getParent()?.getParent()?.goBack();
      } else {

        // Create new DID and profile
        // 1. Generate DID
        const didResult = await DID.generateDID();

        // 2. Save private key to SecureStorage
        await SecureStorage.saveDIDPrivateKey(didResult.did, didResult.privateKey);

        // 3. Create profile in database
        await UserProfileFns.createProfileByDid(didResult.did, name, socials ?? [], avatar ?? null);

        // 4. Set as current profile
        await UserProfileFns.setCurrentProfile(didResult.did);

        // If there's a pending URL, navigate to WebView within the same modal stack
        if (pendingUrl) {
          // Reset the modal stack to show WebView instead of profile creation
          navigation.getParent()?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: Navigation.WEBVIEW_SCREEN,
                  params: { url: pendingUrl, webViewPublicKey: pendingWebViewPublicKey, did: didResult.did }
                }
              ]
            })
          );
        } else {
          // Simply dismiss the entire modal stack after profile creation
          navigation.getParent()?.getParent()?.goBack();
        }
      }
    } catch (err) {
      console.error('Error completing profile:', err);
      setError(mode === 'edit' 
        ? 'Failed to update profile. Please try again.' 
        : 'Failed to create your identity. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    generateDIDAndComplete();
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Avatar',
      'Choose how you want to add your avatar',
      [
        { text: 'Take Photo', onPress: () => pickImage('camera') },
        { text: 'Choose from Library', onPress: () => pickImage('library') },
        ...(!avatar ? [{ text: 'Skip for now', onPress: () => generateDIDAndComplete() }] : [{ text: 'Remove Photo', onPress: () => handleRemoveAvatar() }]),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
        <ProgressIndicator currentStep={3} totalSteps={3} />
      </ThemedView>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Add your avatar
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
            onPress={showImageOptions}
            disabled={isPickingImage || isGenerating}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <ThemedView style={styles.placeholderContainer}>
                <ThemedText style={styles.avatarPlaceholder}>
                  👤
                </ThemedText>
                <ThemedText style={styles.addPhotoText}>
                  Tap this button
                </ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>

          {avatar && !isGenerating && (
            <ThemedView style={styles.avatarActions}>
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
        </ThemedView>

        <ThemedView style={styles.footer}>
          {avatar ? (
            <ThemedButton
              title='Done!'
              onPress={handleComplete}
              variant="primary"
              disabled={isPickingImage}
            />
          ) : (
            <ThemedView style={styles.emptySpace} />
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
    marginTop: 10,
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
  emptySpace: {
    height: 100,
  },
});
