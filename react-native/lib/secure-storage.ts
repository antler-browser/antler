import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SECURE_KEYS = {
  DID_PRIVATE_KEY_PREFIX: 'antler_',
} as const;

function getDIDPrivateKeyKey(did: string): string {
  // Sanitize the DID to be compatible with SecureStore requirements (Replace colons with underscores, SecureStore only allows alphanumeric, '.', '-', '_')
  const sanitizedDID = did.replace(/:/g, '_');
  return `${SECURE_KEYS.DID_PRIVATE_KEY_PREFIX}${sanitizedDID}`;
}

export async function saveDIDPrivateKey(did: string, privateKey: string): Promise<void> {
  try {
    const key = getDIDPrivateKeyKey(did);

    if (Platform.OS === 'ios') {
      // iOS: Use SecureStore with biometric protection and backup support
      await SecureStore.setItemAsync(key, privateKey, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        requireAuthentication: true,
      });
    } else {
      // Android: Use AsyncStorage for automatic backup via Android Auto Backup
      // Keys are encrypted by Android's OS-level encryption and Google's backup encryption
      await AsyncStorage.setItem(key, privateKey);
    }
  } catch (error) {
    throw new Error(`Error saving DID private key: ${(error as Error).message}`);
  }
}

export async function getDIDPrivateKey(did: string): Promise<string | null> {
  try {
    const key = getDIDPrivateKeyKey(did);

    if (Platform.OS === 'ios') {
      return await SecureStore.getItemAsync(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    throw new Error(`Error retrieving DID private key: ${(error as Error).message}`);
  }
}

export async function deleteDIDPrivateKey(did: string): Promise<void> {
  try {
    const key = getDIDPrivateKeyKey(did);

    if (Platform.OS === 'ios') {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    throw new Error(`Error deleting DID private key: ${(error as Error).message}`);
  }
}