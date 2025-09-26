import { useState, useEffect } from 'react';
import { LocalStorage } from '../../lib';

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
        // Initialize AppState on app launch
        await LocalStorage.initializeAppState();
        const welcomeCompleted = await LocalStorage.hasCompletedWelcome();

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
