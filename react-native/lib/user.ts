import * as LocalStorage from './storage';
import * as SecureStorage from './secure-storage';
import * as DID from './did';

export const USER_PROFILE_VERSION = '1.0.0';

/**
 * Create a new user with a generated DID
 */
export async function createUserWithDID(name: string): Promise<LocalStorage.UserProfile> {
  try {
    // Generate the DID (pure cryptographic operation)
    const didResult = await DID.generateDID();

    // Create the user profile
    const userProfile: LocalStorage.UserProfile = {
      id: didResult.did,
      name,
      version: USER_PROFILE_VERSION,
    };

    // Save to storage
    await LocalStorage.saveUserProfile(userProfile);
    await SecureStorage.saveDIDPrivateKey(didResult.did, didResult.privateKey);
    await LocalStorage.setCurrentUser(didResult.did);

    return userProfile;
  } catch (error) {
    throw new Error('Error creating user with DID:', error as Error);
     error;
  }
}

/**
 * Verify if we have the private key for a given DID
 */
export async function verifyDIDOwnership(did: string): Promise<boolean> {
  try {
    const privateKey = await SecureStorage.getDIDPrivateKey(did);
    return privateKey !== null;
  } catch (error) {
    throw new Error('Error verifying DID ownership:', error as Error);
  }
}

/**
 * Export the private key for a DID (use with caution)
 */
export async function exportDIDPrivateKey(did: string): Promise<string | null> {
  try {
    return await SecureStorage.getDIDPrivateKey(did);
  } catch (error) {
    throw new Error('Error exporting DID private key:', error as Error);
  }
}

/**
 * Delete a user and all associated data
 */
export async function deleteUser(did: string): Promise<void> {
  try {
    // Delete private key from secure storage
    await SecureStorage.deleteDIDPrivateKey(did);

    // Delete user profile
    await LocalStorage.deleteUserProfile(did);

    // Update app state
    const appState = await LocalStorage.getAppState();
    if (appState) {
      appState.completedDids = appState.completedDids.filter(id => id !== did);
      if (appState.currentDid === did) {
        appState.currentDid = appState.completedDids[0] || undefined;
      }
      await LocalStorage.saveAppState(appState);
    }
  } catch (error) {
    throw new Error('Error deleting user:', error as Error);
  }
}

/**
 * Get the current active user profile
 */
export async function getCurrentUser(): Promise<LocalStorage.UserProfile | null> {
  try {
    const appState = await LocalStorage.getAppState();
    if (!appState?.currentDid) {
      return null;
    }
    return await LocalStorage.getUserProfile(appState.currentDid);
  } catch (error) {
    throw new Error('Error getting current user:', error as Error);
  }
}

/**
 * Switch to a different user profile
 */
export async function switchUser(did: string): Promise<boolean> {
  try {
    // Verify the user exists
    const userProfile = await LocalStorage.getUserProfile(did);
    if (!userProfile) {
      return false;
    }

    // Verify we have the private key
    const hasKey = await verifyDIDOwnership(did);
    if (!hasKey) {
      return false;
    }

    // Update current user
    await LocalStorage.setCurrentUser(did);
    return true;
  } catch (error) {
    throw new Error('Error switching user:', error as Error);
  }
}

/**
 * Get all user profiles
 */
export async function getAllUsers(): Promise<LocalStorage.UserProfile[]> {
  try {
    const appState = await LocalStorage.getAppState();
    if (!appState?.completedDids) {
      return [];
    }

    const profiles = await Promise.all(
      appState.completedDids.map(did => LocalStorage.getUserProfile(did))
    );

    return profiles.filter(profile => profile !== null) as LocalStorage.UserProfile[];
  } catch (error) {
    throw new Error('Error getting all users:', error as Error);
  }
}