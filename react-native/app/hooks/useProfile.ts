import { useState, useEffect } from 'react';
import { LocalStorage } from '../../lib';

interface UseProfileResult {
  profile: LocalStorage.UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProfile(did: string): UseProfileResult {
  const [profile, setProfile] = useState<LocalStorage.UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userProfile = await LocalStorage.getUserProfile(did);
      setProfile(userProfile);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load profile'));
      console.error('Error loading profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [did]);

  return { profile, isLoading, error, refetch: loadProfile };
}
