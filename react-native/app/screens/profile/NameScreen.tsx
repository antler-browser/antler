import React, { useState, useEffect } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, ThemedView, ThemedText, ThemedButton, ThemedTextInput, ProgressIndicator, HeaderBackButton, HeaderCloseButton } from '../../components/ui';
import { Colors, Navigation } from '../../../lib';
import { useProfile } from '../../hooks';

type NavigationProp = NativeStackNavigationProp<Navigation.ProfileCreateOrEditStackParamList, 'Name'>;
type RouteProps = RouteProp<Navigation.ProfileCreateOrEditStackParamList, 'Name'>;

export function NameScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const colors = Colors['light'];

  const mode = route.params?.mode || 'create';
  const did = route.params?.did;
  const pendingUrl = route.params?.pendingUrl;
  const pendingWebViewPublicKey = route.params?.pendingWebViewPublicKey;

  // Use useProfile hook to get profile data when in edit mode
  const { profile, isLoading } = did
    ? useProfile(did)
    : { profile: null, isLoading: false };

  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Initialize name from profile when in edit mode
  useEffect(() => {
    if (mode === 'edit' && profile) {
      setName(profile.name);
    }
  }, [mode, profile]);

  const handleNext = () => {
    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      setError('Please enter a name with at least 2 characters');
      return;
    }

    navigation.navigate('Socials', {
      mode,
      name: trimmedName,
      did,
      pendingUrl,
      pendingWebViewPublicKey,
    });
  };

  const handleTextChange = (text: string) => {
    setName(text);
    if (error) {
      setError('');
    }
  };

  if (mode === 'edit' && !profile) {
    return (
      <Screen edges={['top']}>
        <ThemedView />
      </Screen>
    );
  }


  return (
    <Screen edges={['top']}>
      <ThemedView style={styles.headerButtons}>
        <ProgressIndicator currentStep={1} totalSteps={3} />
        <HeaderCloseButton />
      </ThemedView>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              What's your name?
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              When you scan QR codes, you'll instantly sign in without having to create a new account.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.middle}>
            <ThemedView>
              <ThemedTextInput
                placeholder="Name"
                keyboardType="default"
                value={name}
                onChangeText={handleTextChange}
                autoFocus
                maxLength={50}
                error={!!error}
                textContentType="name"
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
              />
              {error ? (
                <ThemedText style={[styles.errorText, { color: colors.notification }]}>
                  {error}
                </ThemedText>
              ) : null}
            </ThemedView>
          </ThemedView>
        </ThemedView>
        </ScrollView>

        <ThemedView style={styles.footer}>
          <ThemedButton
            title='Next'
            onPress={handleNext}
            variant="primary"
          />
        </ThemedView>
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
    paddingBottom: 20,
  },
  content: {
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
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  footer: {
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
  },
});
