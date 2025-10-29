// Mock expo-secure-store before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK: 1,
}));

// Mock AsyncStorage before any imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

import { saveDIDPrivateKey, getDIDPrivateKey, deleteDIDPrivateKey } from '../../lib/secure-storage';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

describe('secure-storage', () => {
  const mockDID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
  const mockPrivateKey = 'base64encodedprivatekey==';
  const expectedKey = 'antler_did_key_z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    describe('saveDIDPrivateKey', () => {
      it('should save private key to SecureStore with biometric protection', async () => {
        (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

        await saveDIDPrivateKey(mockDID, mockPrivateKey);

        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          expectedKey,
          mockPrivateKey,
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
            requireAuthentication: true,
          }
        );
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      });

      it('should throw error if SecureStore fails', async () => {
        (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Keychain error'));

        await expect(saveDIDPrivateKey(mockDID, mockPrivateKey)).rejects.toThrow(
          'Error saving DID private key: Keychain error'
        );
      });
    });

    describe('getDIDPrivateKey', () => {
      it('should retrieve private key from SecureStore', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockPrivateKey);

        const result = await getDIDPrivateKey(mockDID);

        expect(SecureStore.getItemAsync).toHaveBeenCalledWith(expectedKey);
        expect(result).toBe(mockPrivateKey);
        expect(AsyncStorage.getItem).not.toHaveBeenCalled();
      });

      it('should return null if key not found', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

        const result = await getDIDPrivateKey(mockDID);

        expect(result).toBeNull();
      });

      it('should throw error if SecureStore fails', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Keychain error'));

        await expect(getDIDPrivateKey(mockDID)).rejects.toThrow(
          'Error retrieving DID private key: Keychain error'
        );
      });
    });

    describe('deleteDIDPrivateKey', () => {
      it('should delete private key from SecureStore', async () => {
        (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

        await deleteDIDPrivateKey(mockDID);

        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(expectedKey);
        expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
      });

      it('should throw error if SecureStore fails', async () => {
        (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('Keychain error'));

        await expect(deleteDIDPrivateKey(mockDID)).rejects.toThrow(
          'Error deleting DID private key: Keychain error'
        );
      });
    });
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    describe('saveDIDPrivateKey', () => {
      it('should save private key to AsyncStorage', async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        await saveDIDPrivateKey(mockDID, mockPrivateKey);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(expectedKey, mockPrivateKey);
        expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      });

      it('should throw error if AsyncStorage fails', async () => {
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        await expect(saveDIDPrivateKey(mockDID, mockPrivateKey)).rejects.toThrow(
          'Error saving DID private key: Storage error'
        );
      });
    });

    describe('getDIDPrivateKey', () => {
      it('should retrieve private key from AsyncStorage', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockPrivateKey);

        const result = await getDIDPrivateKey(mockDID);

        expect(AsyncStorage.getItem).toHaveBeenCalledWith(expectedKey);
        expect(result).toBe(mockPrivateKey);
        expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
      });

      it('should return null if key not found', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const result = await getDIDPrivateKey(mockDID);

        expect(result).toBeNull();
      });

      it('should throw error if AsyncStorage fails', async () => {
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        await expect(getDIDPrivateKey(mockDID)).rejects.toThrow(
          'Error retrieving DID private key: Storage error'
        );
      });
    });

    describe('deleteDIDPrivateKey', () => {
      it('should delete private key from AsyncStorage', async () => {
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        await deleteDIDPrivateKey(mockDID);

        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(expectedKey);
        expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
      });

      it('should throw error if AsyncStorage fails', async () => {
        (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        await expect(deleteDIDPrivateKey(mockDID)).rejects.toThrow(
          'Error deleting DID private key: Storage error'
        );
      });
    });
  });

  describe('Key sanitization', () => {
    it('should replace colons with underscores in DID', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await saveDIDPrivateKey(mockDID, mockPrivateKey);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.not.stringContaining(':'),
        mockPrivateKey,
        expect.any(Object)
      );
    });
  });
});
