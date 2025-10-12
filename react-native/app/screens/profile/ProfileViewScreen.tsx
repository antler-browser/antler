import React, { useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { useNavigation, useRoute, CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  Screen,
  ThemedView,
  ThemedText,
  ThemedButton,
  HeaderCloseButton
} from '../../components/ui';
import { ProfileAvatar } from '../../components/profile';
import { Colors, Navigation, User } from '../../../lib';
import { useProfile } from '../../hooks';

type NavigationProp = NativeStackNavigationProp<Navigation.RootStackParamList>;
type RouteProps = RouteProp<Navigation.RootStackParamList, typeof Navigation.PROFILE_SCREEN>;

export function ProfileViewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { did } = route.params;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { profile, isLoading, error, refetch } = useProfile(did);

  // Refetch profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [did])
  );

  if (!profile) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedView />
      </Screen>
    );
  }

  const handleEditProfile = () => {
    if (!profile) return;

    // Navigate to profile editing
    navigation.navigate(Navigation.MODAL_STACK, {
      screen: Navigation.PROFILE_CREATE_OR_EDIT_SCREEN,
      params: {
        mode: 'edit',
        did: did,
      },
    });
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete this profile?',
      'Are you sure you want to delete this profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (did) {
                await User.deleteUser(did);

                // Navigate back to camera and reload
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: Navigation.CAMERA_SCREEN }],
                  })
                );
              }
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };

  const renderSocialLink = (platform: string, handle: string) => {
    const iconNames: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      twitter: 'logo-twitter',
      instagram: 'logo-instagram',
      linkedin: 'logo-linkedin',
      bluesky: 'cloud-outline',
    };

    return (
      <ThemedView key={platform} style={styles.socialItem}>
        <Ionicons
          name={iconNames[platform] || 'link-outline'}
          size={20}
          color={colors.text}
          style={styles.socialIcon}
        />
        <ThemedText style={styles.socialHandle}>{handle}</ThemedText>
      </ThemedView>
    );
  };

  if (isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedView style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      </Screen>
    );
  }

  if (error) {
    Alert.alert('Error', 'Failed to load profile');
  }

  if (!profile && !isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedView style={styles.errorContainer}>
          <ThemedText>Profile not found</ThemedText>
          <ThemedButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="primary"
          />
        </ThemedView>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.header}>
        <HeaderCloseButton />
        <TouchableOpacity onPress={handleEditProfile} style={styles.editButton}>
          <ThemedText style={[styles.editButtonText, { color: colors.tint }]}>
            Edit
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.content}>
          {/* Avatar Section */}
          <ThemedView style={styles.avatarSection}>
            <ProfileAvatar
              avatar={profile.avatar}
              name={profile.name}
              size={120}
              style={styles.avatarMargin}
            />
            <ThemedText type="title" style={styles.name}>{profile.name}</ThemedText>
          </ThemedView>

          {/* Social Links Section */}
          {profile.socials && profile.socials.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Social Profiles</ThemedText>
              <ThemedView style={[styles.socialsContainer, { backgroundColor: colors.card }]}>
                {profile.socials.map((social) =>
                  renderSocialLink(social.platform, social.handle)
                )}
              </ThemedView>
            </ThemedView>
          )}

          {/* Actions Section */}
          <ThemedView style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteProfile}
            >
              <ThemedText style={[styles.deleteButtonText, { color: colors.notification }]}>
                Delete Profile
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarMargin: {
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 12,
    paddingLeft: 4,
  },
  didContainer: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  didText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Courier',
    marginRight: 12,
    opacity: 0.8,
  },
  socialsContainer: {
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialIcon: {
    marginRight: 12,
    width: 24,
  },
  socialHandle: {
    fontSize: 16,
  },
  actionsSection: {
    marginTop: 40,
    gap: 16,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
