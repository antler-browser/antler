import React, { useState, useEffect } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, ThemedView, ThemedText, ThemedButton, ThemedTextInput, ProgressIndicator, HeaderBackButton } from '../../components/ui';
import { Colors, Navigation } from '../../../lib';
import { useProfile } from '../../hooks';

type NavigationProp = NativeStackNavigationProp<Navigation.ProfileCreationStackParamList, 'Name'>;
type RouteProps = RouteProp<Navigation.ProfileCreationStackParamList, 'Name'>;

export function NameScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const colors = Colors['light'];

  const mode = route.params?.mode || 'create';
  const did = route.params?.did;

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
      <Screen edges={['top', 'bottom']}>
        <ThemedView />
      </Screen>
    );
  }


  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.headerButtons}>
        <HeaderBackButton />
        <ProgressIndicator currentStep={1} totalSteps={3} />
      </ThemedView>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              What's your name?
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Your name will be passed on with the QR code
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

          <ThemedView style={styles.footer}>
            <ThemedButton
              title='Next'
              onPress={handleNext}
              variant="primary"
            />
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    gap: 12,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
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
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  footer: {
    gap: 12,
  },
});