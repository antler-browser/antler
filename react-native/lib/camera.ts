import { CameraType, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera/build/Camera.types';

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

export type ScannedResult = {
  type: 'url' | 'did' | 'text';
  value: string;
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

export function handleScannedData(data: string): ScannedResult {
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

  const requestCameraAccess = async (): Promise<boolean> => {
    if (permission?.granted) return true;

    if (!permission?.canAskAgain) {
      return false;
    }

    const result = await requestPermission();
    return result.granted;
  };

  return {
    requestCameraAccess,
    permission
  };
};