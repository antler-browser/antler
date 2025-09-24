import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SocialLink } from "./social-links";

// Screen names
export const CAMERA_SCREEN = "CameraScreen";
export const PROFILE_SCREEN = "ProfileScreen";
export const SETTINGS_SCREEN = "SettingsScreen";
export const ONBOARDING_SCREEN = "OnboardingScreen";
export const PROFILE_CREATION_SCREEN = "ProfileCreationScreen";

// Profile mode type
export type ProfileMode = 'create' | 'edit';

// Screen parameter types
export type SettingsScreenParams = undefined;
export type ProfileScreenParams = { did: string };

// Onboarding stack param list (simplified - just welcome)
export type OnboardingStackParamList = {
  Welcome: undefined;
};

// Profile creation stack param list (phase 2)
export type ProfileCreationStackParamList = {
  Name: {
    mode: ProfileMode;
    did?: string;
  } | undefined;
  Socials: {
    mode: ProfileMode;
    name: string;
    did?: string;
  };
  Avatar: {
    mode: ProfileMode;
    name: string;
    socials?: SocialLink[];
    did?: string;
  };
};

// Root stack param list
export type RootStackParamList = {
  [CAMERA_SCREEN]: undefined;
  [PROFILE_SCREEN]: ProfileScreenParams;
  [SETTINGS_SCREEN]: SettingsScreenParams;
  [ONBOARDING_SCREEN]: undefined;
  [PROFILE_CREATION_SCREEN]: undefined;
};

// Navigation prop types
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;