import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SocialLink } from "./social-links";

// Screen names
export const CAMERA_SCREEN = "CameraScreen";
export const PROFILE_SCREEN = "ProfileScreen";
export const PROFILE_CREATE_OR_EDIT_SCREEN = "ProfileCreateOrEditScreen ";
export const WEBVIEW_SCREEN = "WebviewScreen";
export const SETTINGS_SCREEN = "SettingsScreen";
export const SCAN_HISTORY_SCREEN = "ScanHistoryScreen";
export const EXPORT_PROFILE_SCREEN = "ExportProfileScreen";
export const IMPORT_PROFILE_SCREEN = "ImportProfileScreen";
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
  [CAMERA_SCREEN]: { pendingUrl?: string } | undefined;
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
  [SETTINGS_SCREEN]: undefined;
  [SCAN_HISTORY_SCREEN]: undefined;
  [EXPORT_PROFILE_SCREEN]: undefined;
  // `payload` is the raw text of a scanned profile QR code. It holds a plaintext private
  // key, so the screen consumes it once and clears it back off the route.
  [IMPORT_PROFILE_SCREEN]: { payload?: string } | undefined;
};


// Navigation prop types
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
// Parameterised by route name so a screen's setParams is typed to its own params, rather
// than to the union of every modal screen's.
export type ModalStackNavigationProp<
  T extends keyof ModalStackParamList = keyof ModalStackParamList
> = NativeStackNavigationProp<ModalStackParamList, T>;