import { useState, useEffect } from 'react';
import { LocalStorage } from '../../lib';

interface UseProfileResult {
  profile: LocalStorage.UserProfile | null;
  isLoading: boolean;
  error: Error | null;
}

export function useProfile(did: string): UseProfileResult {
  const [profile, setProfile] = useState<LocalStorage.UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userProfile = await LocalStorage.getUserProfile(did);

        if (isMounted) {
          setProfile(userProfile);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load profile'));
          console.error('Error loading profile:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [did]);

  return { profile, isLoading, error };
}
