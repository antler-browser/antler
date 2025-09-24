import * as SecureStore from 'expo-secure-store';

const SECURE_KEYS = {
  DID_PRIVATE_KEY_PREFIX: '@antler/did_private_',
} as const;

function getDIDPrivateKeyKey(did: string): string {
  return `${SECURE_KEYS.DID_PRIVATE_KEY_PREFIX}${did}`;
}

export async function saveDIDPrivateKey(did: string, privateKey: string): Promise<void> {
  try {
    const key = getDIDPrivateKeyKey(did);
    await SecureStore.setItemAsync(key, privateKey);
  } catch (error) {
    throw new Error('Error saving DID private key:', error as Error);
  }
}

export async function getDIDPrivateKey(did: string): Promise<string | null> {
  try {
    const key = getDIDPrivateKeyKey(did);
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    throw new Error('Error retrieving DID private key:', error as Error);
  }
}

export async function deleteDIDPrivateKey(did: string): Promise<void> {
  try {
    const key = getDIDPrivateKeyKey(did);
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    throw new Error('Error deleting DID private key:', error as Error);
  }
}