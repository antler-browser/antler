import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SocialLink } from "./social-links";

// Screen names
export const CAMERA_SCREEN = "CameraScreen";
export const PROFILE_SCREEN = "ProfileScreen";
export const PROFILE_CREATE_OR_EDIT_SCREEN = "ProfileCreateOrEditScreen ";
export const WEBVIEW_SCREEN = "WebviewScreen";
export const MODAL_STACK = "ModalStack";
export const WELCOME_SCREEN = "WelcomeScreen";

// Profile mode type
export type ProfileMode = 'create' | 'edit';
export type ProfileScreenParams = { did: string };

// Onboarding stack param list (simplified - just welcome)
export type OnboardingStackParamList = {
  Welcome: undefined;
};

// Profile form stack param list
export type ProfileCreateOrEditStackParamList = {
  Name: {
    mode: ProfileMode;
    did?: string;
    pendingUrl?: string;
    pendingWebViewPublicKey?: string;
  } | undefined;
  Socials: {
    mode: ProfileMode;
    name: string;
    did?: string;
    pendingUrl?: string;
    pendingWebViewPublicKey?: string;
  };
  Avatar: {
    mode: ProfileMode;
    name: string;
    socials?: SocialLink[];
    did?: string;
    pendingUrl?: string;
    pendingWebViewPublicKey?: string;
  };
};
// Root stack param list
export type RootStackParamList = {
  [CAMERA_SCREEN]: undefined;
  [PROFILE_SCREEN]: ProfileScreenParams;
  [WELCOME_SCREEN]: undefined;
  [MODAL_STACK]: {
    screen: keyof ModalStackParamList;
    params?: ModalStackParamList[keyof ModalStackParamList];
  } | undefined;
};

// Modal stack param list
export type ModalStackParamList = {
  [PROFILE_CREATE_OR_EDIT_SCREEN]: {
    pendingUrl?: string;
    pendingWebViewPublicKey?: string;
    mode?: ProfileMode;
    did?: string;
    initialScreen?: keyof ProfileCreateOrEditStackParamList;
  } | undefined;
  [WEBVIEW_SCREEN]: { url: string; did: string; webViewPublicKey: string };
};


// Navigation prop types
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;