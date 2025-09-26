import * as SecureStore from 'expo-secure-store';

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
    await SecureStore.setItemAsync(key, privateKey);
  } catch (error) {
    throw new Error(`Error saving DID private key: ${(error as Error).message}`);
  }
}

export async function getDIDPrivateKey(did: string): Promise<string | null> {
  try {
    const key = getDIDPrivateKeyKey(did);
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    throw new Error(`Error retrieving DID private key: ${(error as Error).message}`);
  }
}

export async function deleteDIDPrivateKey(did: string): Promise<void> {
  try {
    const key = getDIDPrivateKeyKey(did);
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    throw new Error(`Error deleting DID private key: ${(error as Error).message}`);
  }
}