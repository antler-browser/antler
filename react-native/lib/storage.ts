import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialLink } from './social-links';

export interface UserProfile {
  id: string;
  name: string;
  version: string;
  socials?: SocialLink[];
  avatar?: string;
}

export interface AppState {
  completedDids: string[];
  currentDid?: string;
  hasCompletedWelcome?: boolean;
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

export async function getAppState(): Promise<AppState | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(getLocalStorageKey('APP_STATE'));
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error reading app state:', error);
    return null;
  }
}

export async function saveAppState(appState: AppState): Promise<void> {
  try {
    const jsonValue = JSON.stringify(appState);
    await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, jsonValue);
  } catch (error) {
    console.error('Error saving app state:', error);
    throw error;
  }
}

export async function getUserProfile(did: string): Promise<UserProfile | null> {
  try {
    const key = getLocalStorageKey('USER_PROFILE', did);
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error reading user profile:', error);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const key = getLocalStorageKey('USER_PROFILE', profile.id);
    const jsonValue = JSON.stringify(profile);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

export async function deleteUserProfile(did: string): Promise<void> {
  try {
    const key = getLocalStorageKey('USER_PROFILE', did);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const appState = await getAppState();
    if (!appState?.currentDid) {
      return null;
    }
    return await getUserProfile(appState.currentDid);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function setCurrentUser(did: string): Promise<void> {
  try {
    const appState = await getAppState() || { completedDids: [] };
    appState.currentDid = did;

    if (!appState.completedDids.includes(did)) {
      appState.completedDids.push(did);
    }

    await saveAppState(appState);
  } catch (error) {
    console.error('Error setting current user:', error);
    throw error;
  }
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const appState = await getAppState();
    return appState ? appState.completedDids.length > 0 : false;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

export async function hasCompletedWelcome(): Promise<boolean> {
  try {
    const appState = await getAppState();
    return appState?.hasCompletedWelcome === true;
  } catch (error) {
    console.error('Error checking welcome status:', error);
    return false;
  }
}

export async function setWelcomeCompleted(): Promise<void> {
  try {
    const appState = await getAppState() || { completedDids: [] };
    appState.hasCompletedWelcome = true;
    await saveAppState(appState);
  } catch (error) {
    console.error('Error setting welcome completed:', error);
    throw error;
  }
}

export async function hasCompletedProfileCreation(): Promise<boolean> {
  try {
    const appState = await getAppState();
    return appState ? appState.completedDids.length > 0 : false;
  } catch (error) {
    console.error('Error checking profile creation status:', error);
    return false;
  }
}

export async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const antlerKeys = keys.filter(key => key.startsWith('@antler/'));
    await AsyncStorage.multiRemove(antlerKeys);
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
}