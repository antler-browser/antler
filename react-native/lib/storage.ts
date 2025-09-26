import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialLink } from './social-links';

export const APP_STATE_VERSION = '1.0.0';

// Stores references to DIDs
export interface AppState {
  version: string;
  completedDids: string[];
  currentDid?: string;
  hasCompletedWelcome: boolean;
}

const DEFAULT_APP_STATE: AppState = {
  version: APP_STATE_VERSION,
  completedDids: [],
  currentDid: undefined,
  hasCompletedWelcome: false,
};

// Stores DID data
export interface UserProfile {
  id: string;
  name: string;
  version: string;
  socials?: SocialLink[];
  avatar?: string;
}

const STORAGE_KEYS = {
  APP_STATE: '@antler/app_state',
  USER_PROFILE: '@antler/user_profile_',
} as const;

function getLocalStorageKey(type: keyof typeof STORAGE_KEYS, did?: string): string {
  switch (type) {
    case 'USER_PROFILE':
      if (!did) { throw new Error('DID is required for user profile key'); }
      return `${STORAGE_KEYS[type]}${did}`;
    default:
      return STORAGE_KEYS[type];
  }
}

/**
 * Initializes AppState if it doesn't exist
 */
export async function initializeAppState(): Promise<void> {
  try {
    const key = getLocalStorageKey('APP_STATE');
    const jsonValue = await AsyncStorage.getItem(key);
    if (!jsonValue) {
      await saveAppState(DEFAULT_APP_STATE);
      return;
    }
  } catch (error) {
    console.error(`Error initializing app state: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Gets AppState, always returning a valid state (never null)
 */
export async function getAppState(): Promise<AppState> {
  try {
    const key = getLocalStorageKey('APP_STATE');
    const jsonValue = await AsyncStorage.getItem(key);
    if (!jsonValue) { throw new Error('App state should have been initialized'); }

    return JSON.parse(jsonValue as string) as AppState;
  } catch (error) {
    console.error(`Error reading app state: ${(error as Error).message}`);
    throw error;
  }
}

async function saveAppState(appState: AppState): Promise<void> {
  try {
    const jsonValue = JSON.stringify(appState);
    const key = getLocalStorageKey('APP_STATE');
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error saving app state: ${(error as Error).message}`);
    throw error;
  }
}

export async function deleteDIDFromAppState(did: string): Promise<void> {
  try {
    const oldAppState = await getAppState();
    const filteredDids = oldAppState.completedDids.filter(id => id !== did);
    
    // Update app state
    const newAppState = { 
      ...oldAppState,
      completedDids: filteredDids,
      currentDid: oldAppState.currentDid === did 
        ? (filteredDids[0] || undefined)  // If deleting current DID, pick first remaining
        : oldAppState.currentDid,         // Otherwise keep current DID unchanged
    };
    
    await saveAppState(newAppState);
  } catch (error) {
    console.error(`Error deleting DID from app state: ${(error as Error).message}`);
    throw error;
  }
}

export async function getUserProfile(did: string): Promise<UserProfile | null> {
  try {
    const key = getLocalStorageKey('USER_PROFILE', did);
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error reading user profile: ${(error as Error).message}`);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const key = getLocalStorageKey('USER_PROFILE', profile.id);
    const jsonValue = JSON.stringify(profile);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error saving user profile: ${(error as Error).message}`);
    throw error;
  }
}

export async function deleteUserProfile(did: string): Promise<void> {
  try {
    const key = getLocalStorageKey('USER_PROFILE', did);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error deleting user profile: ${(error as Error).message}`);
    throw error;
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const appState = await getAppState();
    if (!appState.currentDid) { return null; }
    return await getUserProfile(appState.currentDid);
  } catch (error) {
    console.error(`Error getting current user: ${(error as Error).message}`);
    return null;
  }
}

export async function setCurrentUser(did: string): Promise<void> {
  try {
    const oldAppState = await getAppState();
    
    const newAppState = { 
      ...oldAppState,
      currentDid: did,
      completedDids: oldAppState.completedDids?.includes(did) 
        ? oldAppState.completedDids 
        : [...(oldAppState.completedDids || []), did],
    };

    await saveAppState(newAppState);
  } catch (error) {
    console.error(`Error setting current user: ${(error as Error).message}`);
    throw error;
  }
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const appState = await getAppState();
    return appState.completedDids.length > 0;
  } catch (error) {
    console.error(`Error checking onboarding status: ${(error as Error).message}`);
    return false;
  }
}
export async function setWelcomeCompleted(): Promise<void> {
  try {
    const oldAppState = await getAppState();
    const newAppState = { 
      ...oldAppState,
      hasCompletedWelcome: true,
    };
    await saveAppState(newAppState);
  } catch (error) {
    console.error(`Error setting welcome completed: ${(error as Error).message}`);
    throw error;
  }
}

export async function hasCompletedWelcome(): Promise<boolean> {
  try {
    const appState = await getAppState();
    return appState.hasCompletedWelcome;
  } catch (error) {
    console.error(`Error checking welcome status: ${(error as Error).message}`);
    return false;
  }
}


export async function hasCompletedProfileCreation(): Promise<boolean> {
  try {
    const appState = await getAppState();
    return appState.completedDids.length > 0;
  } catch (error) {
    console.error(`Error checking profile creation status: ${(error as Error).message}`);
    return false;
  }
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const appState = await getAppState();
    if (appState.completedDids.length === 0) {
      return [];
    }

    const profiles = await Promise.all(
      appState.completedDids.map(did => getUserProfile(did))
    );

    return profiles.filter((profile): profile is UserProfile => profile !== null);
  } catch (error) {
    console.error(`Error getting all user profiles: ${(error as Error).message}`);
    return [];
  }
}

export async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const antlerKeys = keys.filter(key => key.startsWith('@antler/'));
    await AsyncStorage.multiRemove(antlerKeys);
  } catch (error) {
    console.error(`Error clearing storage: ${(error as Error).message}`);
    throw error;
  }
}