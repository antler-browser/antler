import { useState, useEffect } from 'react';
import { initializeDatabase } from '../../lib/db';
import { AppStateFns } from '../../lib';

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
