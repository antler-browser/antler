import { CameraType, useCameraPermissions, Camera } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera/build/Camera.types';
import { Alert, Linking } from 'react-native';

export interface QRCodeData {
  type: string;
  data: string;
  cornerPoints?: { x: number; y: number }[];
  bounds?: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
}

export const CAMERA_SETTINGS = {
  defaultRatio: '16:9' as const,
  defaultZoom: 0,
  defaultFacing: 'back' as CameraType,
  animationDuration: 300,
  scanInterval: 1000,
} as const;

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await Camera.requestCameraPermissionsAsync();

  if (status === 'denied') {
    Alert.alert(
      'Camera Permission Required',
      'Please enable camera access in your device settings to use this feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }

  return status === 'granted';
}

export function parseQRCode(scanningResult: BarcodeScanningResult): QRCodeData | null {
  if (!scanningResult || !scanningResult.data) {
    return null;
  }

  return {
    type: scanningResult.type,
    data: scanningResult.data,
    cornerPoints: scanningResult.cornerPoints,
    bounds: scanningResult.bounds
  };
}

export function isValidURL(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidDID(string: string): boolean {
  return string.startsWith('did:');
}

export function handleScannedData(data: string): { type: 'url' | 'did' | 'text', value: string } {
  if (isValidURL(data)) {
    return { type: 'url', value: data };
  }

  if (isValidDID(data)) {
    return { type: 'did', value: data };
  }

  return { type: 'text', value: data };
}

export const useCameraPermission = () => {
  const [permission, requestPermission] = useCameraPermissions();

  const hasPermission = permission?.granted ?? false;
  const canAskAgain = permission?.canAskAgain ?? true;

  const requestCameraAccess = async (): Promise<boolean> => {
    if (hasPermission) return true;

    if (!canAskAgain) {
      Alert.alert(
        'Camera Access Denied',
        'You have previously denied camera access. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }

    const result = await requestPermission();
    return result.granted;
  };

  return {
    hasPermission,
    canAskAgain,
    requestCameraAccess
  };
};