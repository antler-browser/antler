import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SocialLink } from "./social-links";

// Screen names
export const CAMERA_SCREEN = "CameraScreen";
export const PROFILE_SCREEN = "ProfileScreen";
export const ONBOARDING_SCREEN = "OnboardingScreen";
export const PROFILE_CREATION_SCREEN = "ProfileCreationScreen";
export const WEBVIEW_SCREEN = "WebViewScreen";
export const MODAL_STACK = "ModalStack";

// Profile mode type
export type ProfileMode = 'create' | 'edit';
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
    pendingUrl?: string;
  } | undefined;
  Socials: {
    mode: ProfileMode;
    name: string;
    did?: string;
    pendingUrl?: string;
  };
  Avatar: {
    mode: ProfileMode;
    name: string;
    socials?: SocialLink[];
    did?: string;
    pendingUrl?: string;
  };
};

// Modal stack param list
export type ModalStackParamList = {
  [PROFILE_CREATION_SCREEN]: { pendingUrl?: string } | undefined;
  [WEBVIEW_SCREEN]: { url: string };
};

// Root stack param list
export type RootStackParamList = {
  [CAMERA_SCREEN]: undefined;
  [PROFILE_SCREEN]: ProfileScreenParams;
  [ONBOARDING_SCREEN]: undefined;
  [MODAL_STACK]: {
    screen: keyof ModalStackParamList;
    params?: ModalStackParamList[keyof ModalStackParamList];
  } | undefined;
};

// Navigation prop types
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;