import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Screen,
  ThemedView,
  ThemedText,
  HeaderCloseButton
} from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Navigation } from '../../lib';

type NavigationProp = NativeStackNavigationProp<Navigation.RootStackParamList>;

const PRIVACY_POLICY_URL = 'https://antlerbrowser.com/privacy-policy';
const TERMS_OF_SERVICE_URL = 'https://antlerbrowser.com/terms-of-service';
const SUPPORT_EMAIL = 'danny@antlerbrowser.com';
const APP_STORE_ID = '6753969350';
const ANDROID_PACKAGE_NAME = 'com.antlerbrowser';

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY_URL).catch(err => {
      console.error('Failed to open Privacy Policy:', err);
    });
  };

  const handleTermsOfService = () => {
    Linking.openURL(TERMS_OF_SERVICE_URL).catch(err => {
      console.error('Failed to open Terms of Service:', err);
    });
  };

  const handleRateApp = () => {
    const storeUrl = Platform.select({
      ios: `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`,
      android: `market://details?id=${ANDROID_PACKAGE_NAME}`,
    });

    if (storeUrl) {
      Linking.openURL(storeUrl).catch(err => {
        console.error('Failed to open app store:', err);
        // Fallback to web URL
        const webUrl = Platform.select({
          ios: `https://apps.apple.com/app/id${APP_STORE_ID}`,
          android: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`,
        });
        if (webUrl) {
          Linking.openURL(webUrl);
        }
      });
    }
  };

  const handleEmailSupport = () => {
    const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=Antler Support`;
    Linking.openURL(emailUrl);
  };

  const renderSettingsItem = (
    icon: string,
    title: string,
    onPress: () => void,
    showChevron: boolean = true
  ) => {
    return (
      <TouchableOpacity
        style={[styles.settingsItem]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.settingsItemLeft}>
          <Ionicons name={icon as any} size={22} color={colors.text} style={{ opacity: 0.8 }} />
          <ThemedText style={styles.settingsItemTitle}>{title}</ThemedText>
        </ThemedView>
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text}
            style={{ opacity: 0.4 }}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.headerButtons}>
        <HeaderCloseButton />
      </ThemedView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>Settings</ThemedText>

          {/* <ThemedView style={styles.section}> */}
            {renderSettingsItem('mail-outline', 'Email Support', handleEmailSupport)}
            {renderSettingsItem('star-outline', 'Rate App (5 stars 🙏)', handleRateApp)}
            {renderSettingsItem('document-text-outline', 'Privacy Policy', handlePrivacyPolicy)}
            {renderSettingsItem('shield-checkmark-outline', 'Terms of Service', handleTermsOfService)}
          {/* </ThemedView> */}
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    gap: 12,
    marginTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 12,
    paddingLeft: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 4,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
});
