import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PermissionResponse } from 'expo-camera';

import { Screen, ThemedView, ThemedText } from '../ui';
import { Colors } from '../../../lib';

interface CameraPermissionsProps {
  permission: PermissionResponse;
  permissionError: string | null;
  onRequestPermission: () => Promise<void>;
}

export function CameraPermissions({
  permission,
  permissionError,
  onRequestPermission,
}: CameraPermissionsProps) {
  const navigation = useNavigation();

  if (!permission.granted) {
    return (
      <Screen style={styles.background}>
        <ThemedView style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#FF8FA9" />
          <ThemedText type="title" style={[styles.permissionTitle, { color: '#FFFFFF' }]}>
            Enable Camera Access
          </ThemedText>
          <ThemedText style={[styles.permissionText, { color: '#FFFFFF' }]}>
            Camera access is required to scan QR codes.
          </ThemedText>

          {permissionError && (
            <ThemedView style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF8FA3" />
              <ThemedText style={[styles.errorText, { color: '#FF8FA3' }]}>
                {permissionError}
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.buttonContainer}>
            {permission.canAskAgain ? (
              <TouchableOpacity
                style={[styles.permissionButton, { backgroundColor: '#FF8FA9' }]}
                onPress={onRequestPermission}>
                <ThemedText style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>
                  {permissionError ? 'Try Again' : 'Grant Permission'}
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.permissionButton, { backgroundColor: '#FF8FA9' }]}
                onPress={() => Linking.openSettings()}>
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                <ThemedText style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>Open Settings</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ThemedView>
      </Screen>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
  },
  permissionText: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.8,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
    justifyContent: 'center',
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  buttonContainer: {
    backgroundColor: 'black',
    alignItems: 'center',
    marginTop: 32,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 143, 169, 0.15)',
    borderRadius: 12,
    gap: 10,
    maxWidth: '90%',
  },
  errorText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    opacity: 0.7,
  },
  skipButton: {
    marginTop: 15,
    padding: 10,
  },
  skipButtonText: {
    fontSize: 14,
    opacity: 0.6,
  },
});

