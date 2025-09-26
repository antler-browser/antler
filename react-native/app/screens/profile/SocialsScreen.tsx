import React, { useState, useEffect } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, ThemedView, ThemedText, ThemedButton, ThemedTextInput, ProgressIndicator, HeaderBackButton } from '../../components/ui';
import { Colors, Navigation, SocialLinks } from '../../../lib';
import { useProfile } from '../../hooks';

type NavigationProp = NativeStackNavigationProp<Navigation.ProfileCreationStackParamList, 'Socials'>;
type RouteProps = RouteProp<Navigation.ProfileCreationStackParamList, 'Socials'>;

interface SocialInput {
  value: string;
  error: string | null;
  platform: SocialLinks.SocialPlatform;
}

export function SocialsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const colors = Colors['light'];

  const mode = route.params.mode;
  const did = route.params.did;
  const pendingUrl = route.params.pendingUrl;

  // Use useProfile hook to get profile data when in edit mode
  const { profile, isLoading } = did
    ? useProfile(did)
    : { profile: null, isLoading: false };

  // Primary platforms shown by default
  const primaryPlatforms = [
    SocialLinks.SocialPlatform.INSTAGRAM,
    SocialLinks.SocialPlatform.X,
    SocialLinks.SocialPlatform.BLUESKY,
    SocialLinks.SocialPlatform.LINKEDIN,
  ];

  // Additional platforms shown when expanded
  const additionalPlatforms = [
    SocialLinks.SocialPlatform.YOUTUBE,
    SocialLinks.SocialPlatform.SPOTIFY,
    SocialLinks.SocialPlatform.TIKTOK,
    SocialLinks.SocialPlatform.SNAPCHAT,
    SocialLinks.SocialPlatform.GITHUB,
    SocialLinks.SocialPlatform.FACEBOOK,
    SocialLinks.SocialPlatform.REDDIT,
    SocialLinks.SocialPlatform.DISCORD,
    SocialLinks.SocialPlatform.TWITCH,
    SocialLinks.SocialPlatform.TELEGRAM,
    SocialLinks.SocialPlatform.PINTEREST,
    SocialLinks.SocialPlatform.TUMBLR,
    SocialLinks.SocialPlatform.SOUNDCLOUD,
    SocialLinks.SocialPlatform.BANDCAMP,
    SocialLinks.SocialPlatform.PATREON,
    SocialLinks.SocialPlatform.KO_FI,
    SocialLinks.SocialPlatform.MASTODON,
    SocialLinks.SocialPlatform.WEBSITE,
    SocialLinks.SocialPlatform.EMAIL,
  ];

  // Initialize all social inputs
  const allPlatforms = [...primaryPlatforms, ...additionalPlatforms];
  const [socialInputs, setSocialInputs] = useState<SocialInput[]>(
    allPlatforms.map(platform => ({ value: '', error: null, platform }))
  );

  const [isInitialized, setIsInitialized] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Load existing profile data if in edit mode
  useEffect(() => {
    if (mode === 'edit' && profile && profile.socials && !isInitialized) {
      const updatedInputs = [...socialInputs];
      let hasAdditionalPlatformData = false;

      profile.socials.forEach(social => {
        const inputIndex = updatedInputs.findIndex(input => input.platform === social.platform);
        if (inputIndex !== -1) {
          updatedInputs[inputIndex].value = social.handle;

          // Check if this is an additional platform with data
          if (additionalPlatforms.includes(social.platform)) {
            hasAdditionalPlatformData = true;
          }
        }
      });

      setSocialInputs(updatedInputs);
      // Auto-expand if user has data in additional platforms
      if (hasAdditionalPlatformData) {
        setShowMoreOptions(true);
      }
      setIsInitialized(true);
    }
  }, [mode, profile, isInitialized, additionalPlatforms]);

  const handleInputChange = (platform: SocialLinks.SocialPlatform, value: string) => {
    setSocialInputs(prev => prev.map(input => {
      if (input.platform !== platform) return input;
      return { ...input, value, error: input.error ? null : input.error };
    }));
  };

  const handleInputBlur = (platform: SocialLinks.SocialPlatform) => {
    setSocialInputs(prev => prev.map(input => {
      if (input.platform !== platform) return input;
      
      if (input.value.trim()) {
        // Normalize the input
        const normalized = SocialLinks.normalizeHandle(platform, input.value);
        const value = normalized ?? '';

        // Validate the normalized input
        const error = !SocialLinks.validateHandle(platform, value)
          ? 'Invalid format for this platform'
          : null;

        return { ...input, value, error };
      }
      
      return input;
    }));
  };

  const handleNext = () => {
    const socials: SocialLinks.SocialLink[] = [];
    let hasErrors = false;

    // Validate and collect social links
    socialInputs.forEach(input => {
      if (input.value.trim()) {
        const socialLink = SocialLinks.createSocialLink(input.platform, input.value);
        if (socialLink) {
          socials.push(socialLink);
        } else {
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      // Re-validate all inputs to show errors
      const updatedInputs = socialInputs.map(input => {
        if (input.value.trim()) {
          const normalized = SocialLinks.normalizeHandle(input.platform, input.value);
          const isValid = SocialLinks.validateHandle(input.platform, normalized ?? '');
          return {
            ...input,
            value: normalized ?? '',
            error: isValid ? null : 'Invalid format for this platform'
          };
        }
        return input;
      });
      setSocialInputs(updatedInputs);
      return;
    }

    navigation.navigate('Avatar', {
      mode,
      name: route.params.name,
      socials: socials.length > 0 ? socials : undefined,
      did,
      pendingUrl,
    });
  };

  // Helper function to render social inputs
  const renderSocialInputs = (filteredInputs: SocialInput[]) => {
    const previewNotNeededSet = new Set([
      SocialLinks.SocialPlatform.EMAIL,
      SocialLinks.SocialPlatform.WEBSITE,
    ]);

    return filteredInputs.map((input) => (
      <ThemedView key={input.platform} style={styles.inputGroup}>
        <ThemedText style={styles.label}>
          {SocialLinks.getPlatformDisplayName(input.platform)}
        </ThemedText>
        <ThemedView>
          <ThemedTextInput
            placeholder={SocialLinks.getPlatformPlaceholder(input.platform)}
            value={input.value}
            onChangeText={(text) => handleInputChange(input.platform, text)}
            onBlur={() => handleInputBlur(input.platform)}
            autoCapitalize="none"
            autoCorrect={false}
            style={input.error ? styles.inputError : undefined}
          />
          {input.error && (
            <ThemedText style={styles.errorText}>
              {input.error}
            </ThemedText>
          )}
          {input.value && !input.error && !previewNotNeededSet.has(input.platform) && (
            <ThemedText style={styles.previewText}>
              {SocialLinks.getFullURL(input.platform, input.value)}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    ));
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
        <ProgressIndicator currentStep={2} totalSteps={3} />
      </ThemedView>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView style={styles.content}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Add your socials
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Connect your social profiles (optional)
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.middle}>
              {/* Primary social inputs */}
              {renderSocialInputs(
                socialInputs.filter(input => primaryPlatforms.includes(input.platform))
              )}

              {/* More options button - only shown when not expanded */}
              {!showMoreOptions && (
                <ThemedView>
                  <TouchableOpacity onPress={() => setShowMoreOptions(true)}>
                    <ThemedText style={styles.moreOptionsText}>
                      + More options
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              )}

              {/* Additional social inputs when expanded */}
              {showMoreOptions && (
                <>
                  {renderSocialInputs(
                    socialInputs.filter(input => additionalPlatforms.includes(input.platform))
                  )}

                  {/* Less options button at the bottom */}
                  <ThemedView>
                    <TouchableOpacity onPress={() => setShowMoreOptions(false)}>
                      <ThemedText style={styles.moreOptionsText}>
                        - Less options
                      </ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                </>
              )}
            </ThemedView>

            <ThemedView style={styles.footer}>
              <ThemedButton
                title='Next'
                onPress={handleNext}
                variant="primary"
              />
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    gap: 12,
    marginTop: 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    paddingVertical: 40,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    paddingLeft: 4,
    opacity: 0.8,
  },
  inputError: {
    borderColor: '#ff3b30',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
    paddingLeft: 4,
  },
  previewText: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 4,
    paddingLeft: 4,
  },
  footer: {
    gap: 12,
    paddingBottom: 30,
  },
  moreOptionsText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});
