import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { useColorScheme } from 'react-native';
import { Screen, ThemedView, ThemedText, ThemedButton, ProgressIndicator, HeaderBackButton } from '../../components/ui';
import { Colors, Navigation, Camera } from '../../../lib';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';

type NavigationProp = NativeStackNavigationProp<Navigation.RootStackParamList>;

export function CameraPermissionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isRequesting, setIsRequesting] = useState(false);

  const { hasPermission, requestCameraAccess } = Camera.useCameraPermission();

  const handleEnableCamera = async () => {
    if (hasPermission) {
      navigateToCamera();
      return;
    }

    setIsRequesting(true);
    try {
      const granted = await requestCameraAccess();
      if (granted) {
        navigateToCamera();
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to scan QR codes. Please enable it in your device settings to continue.',
          [
            { text: 'Try Again', onPress: handleEnableCamera }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert(
        'Error',
        'Failed to request camera permission. Please try again.',
        [
          { text: 'OK', style: 'cancel' }
        ]
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const navigateToCamera = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Navigation.CAMERA_SCREEN }],
      })
    );
  };


  // React.useEffect(() => {
  //   if (hasPermission) {
  //     navigateToNext();
  //   }
  // }, [hasPermission]);

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedView style={styles.headerButtons}>
        <HeaderBackButton />
      </ThemedView>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Enable Camera Access
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Camera access is required to scan QR codes
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.middle}>
          <ThemedView style={[styles.illustration, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.cameraIcon}>📷</ThemedText>
          </ThemedView>

          <ThemedView style={styles.features}>
            <ThemedView style={styles.feature}>
              <ThemedText style={[styles.featureIcon, { color: colors.tint }]}>✓</ThemedText>
              <ThemedText style={styles.featureText}>
                Scan QR codes instantly
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.feature}>
              <ThemedText style={[styles.featureIcon, { color: colors.tint }]}>✓</ThemedText>
              <ThemedText style={styles.featureText}>
                Quick access to links and profiles
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.feature}>
              <ThemedText style={[styles.featureIcon, { color: colors.tint }]}>✓</ThemedText>
              <ThemedText style={styles.featureText}>
                Secure and private scanning
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedButton
            title="Enable Camera"
            onPress={handleEnableCamera}
            variant="primary"
            loading={isRequesting}
          />
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
    gap: 40,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 60,
  },
  features: {
    gap: 16,
    width: '100%',
    maxWidth: 300,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    opacity: 0.9,
  },
  footer: {
    gap: 12,
  },
});