import * as React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors, LocalStorage, Navigation } from '../../lib';

import { CameraScreen } from './camera';
import { OnboardingNavigator } from './onboarding/OnboardingNavigator';
import { ProfileNavigator } from './profile/ProfileNavigator';
import { ProfileViewScreen } from './profile/ProfileViewScreen';

const Stack = createNativeStackNavigator<Navigation.RootStackParamList>();

const stackScreenOptions = {
  ...Platform.select({
    android: {
      animation: 'slide_from_right' as const,
      freezeOnBlur: true,
    },
    ios: {
      // iOS keeps default behavior
    }
  }),
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
  gestureResponseDistance: Platform.select({
    android: {
      start: 40,
      end: 200,
    },
    ios: {
      start: 50,
    },
  }),
};

function CameraStack() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Stack.Navigator
      screenOptions={{
        ...stackScreenOptions,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name={Navigation.CAMERA_SCREEN}
        component={CameraScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Navigation.PROFILE_SCREEN}
        component={ProfileViewScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

const linking: LinkingOptions<Navigation.RootStackParamList> = {
  prefixes: ['antler://'],
  config: {
    screens: {
      [Navigation.CAMERA_SCREEN]: {
        screens: {
          [Navigation.CAMERA_SCREEN]: 'camera',
          [Navigation.PROFILE_SCREEN]: 'profile',
        },
      },
    },
  },
};

export default function App() {
  const colorScheme = useColorScheme();
  const navigationRef = React.useRef<NavigationContainerRef<Navigation.RootStackParamList>>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasCompletedWelcome, setHasCompletedWelcome] = React.useState(false);

  React.useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const welcomeCompleted = await LocalStorage.hasCompletedWelcome();
      setHasCompletedWelcome(welcomeCompleted);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={{
          dark: colorScheme === 'dark',
          colors: {
            primary: Colors[colorScheme ?? 'light'].tint,
            background: Colors[colorScheme ?? 'light'].background,
            card: Colors[colorScheme ?? 'light'].card,
            text: Colors[colorScheme ?? 'light'].text,
            border: Colors[colorScheme ?? 'light'].border,
            notification: Colors[colorScheme ?? 'light'].notification,
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: 'normal' as const,
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500' as const,
            },
            bold: {
              fontFamily: 'System',
              fontWeight: 'bold' as const,
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '700' as const,
            },
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={hasCompletedWelcome ? Navigation.CAMERA_SCREEN : Navigation.ONBOARDING_SCREEN}
        >
          {!hasCompletedWelcome && (
            <Stack.Screen name={Navigation.ONBOARDING_SCREEN} component={OnboardingNavigator} />
          )}
          <Stack.Screen name={Navigation.CAMERA_SCREEN} component={CameraStack} />
          <Stack.Screen
            name={Navigation.PROFILE_CREATION_SCREEN}
            component={ProfileNavigator}
            options={{
              presentation: 'modal',
              animation: Platform.OS === 'ios' ? 'default' : 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}