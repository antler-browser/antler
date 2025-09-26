import React from 'react';
import { StyleSheet, Dimensions, Image } from 'react-native';
import { useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Screen, ThemedButton, ThemedView, ThemedText } from '../../components/ui';
import { Colors, LocalStorage, Navigation } from '../../../lib';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;

// Simple device-based mascot sizing
const mascotSize = Math.max(
  150, // Minimum size for small devices
  Math.min(
    Math.min(width * 0.6, height * 0.4), // Use device dimensions directly
    300 // Maximum size for large devices
  )
);

export function WelcomeScreen() {
  const navigation = useNavigation<Navigation.RootStackNavigationProp>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleContinue = async () => {
    // Mark welcome as completed
    await LocalStorage.setWelcomeCompleted();

    // Navigate to camera screen with replace to respect animation
    navigation.replace(Navigation.CAMERA_SCREEN);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Welcome to Antler!
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Antler is a super-powered QR code scanner that connects you with people around you.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.middle}>
          <ThemedView style={[styles.illustration, { backgroundColor: colors.card }]}>
            <Image 
              source={require('../../../assets/images/antler-mascot.png')} 
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedButton
            title="Yay!"
            onPress={handleContinue}
            variant="primary"
          />
        </ThemedView>
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : isLargeScreen ? 32 : 24,
    paddingTop: Math.max(height * 0.04, 20),
    paddingBottom: Math.max(height * 0.04, 20),
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingBottom: Math.max(height * 0.01, 8),
    flex: 0.6, // Further reduce header space
  },
  title: {
    textAlign: 'center',
    marginBottom: isSmallScreen ? 8 : 22,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: isSmallScreen ? 8 : 16,
    lineHeight: isSmallScreen ? 20 : 22,
  },
  middle: {
    marginTop: isSmallScreen ? 0 : -40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: mascotSize + 32, // More generous padding around mascot
    height: mascotSize + 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotImage: {
    width: mascotSize,
    height: mascotSize,
  },
  footer: {
    flex: 0.6, // Limit footer space
    justifyContent: 'flex-end',
    gap: isSmallScreen ? 16 : 24,
    paddingTop: Math.max(height * 0.02, isSmallScreen ? 16 : 20),
  },
});