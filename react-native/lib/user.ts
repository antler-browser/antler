import * as LocalStorage from './storage';
import * as SecureStorage from './secure-storage';
import * as DID from './did';

export const USER_PROFILE_VERSION = '1.0.0';

/**
 * Create a new user with a generated DID
 */
export async function createUserWithDID(profile: Omit<LocalStorage.UserProfile, 'id' | 'version'>): Promise<LocalStorage.UserProfile> {
  try {
    // Generate the DID (pure cryptographic operation)
    const didResult = await DID.generateDID();

    // Create the user profile
    const userProfile: LocalStorage.UserProfile = {
      id: didResult.did,
      version: USER_PROFILE_VERSION,
      name: profile.name,
      socials: profile.socials,
      avatar: profile.avatar,
    };

    // Save user data
    await LocalStorage.saveUserProfile(userProfile);
    await SecureStorage.saveDIDPrivateKey(didResult.did, didResult.privateKey);
    await LocalStorage.setCurrentUser(didResult.did);

    return userProfile;
  } catch (error) {
    throw new Error(`Error creating user with DID: ${(error as Error).message}`);
  }
}

/**
 * Delete a user and all associated data
 */
export async function deleteUser(did: string): Promise<void> {
  try {

    // Delete user data
    await SecureStorage.deleteDIDPrivateKey(did);
    await LocalStorage.deleteUserProfile(did);
    await LocalStorage.deleteDIDFromAppState(did);

  } catch (error) {
    throw new Error(`Error deleting user: ${(error as Error).message}`);
  }
}