import { useState, useEffect } from 'react';
import { initializeDatabase } from '../../lib/db';
import { AppStateFns, ProfileTransferIO } from '../../lib';

interface UseOnboardingResult {
  isLoading: boolean;
  hasCompletedWelcome: boolean;
}

export function useOnboarding(): UseOnboardingResult {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkOnboardingStatus = async () => {
      try {
        // Initialize database (run migrations)
        initializeDatabase();

        // If a previous run was killed mid-share, an exported profile — and so a plaintext
        // private key — may still be sitting in the cache directory.
        ProfileTransferIO.sweepStaleExports();

        // Initialize AppState on app launch
        await AppStateFns.initAppState();
        const welcomeCompleted = await AppStateFns.hasCompletedWelcome();

        if (isMounted) {
          setHasCompletedWelcome(welcomeCompleted);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoading, hasCompletedWelcome };
}
