import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors, Navigation } from '../../lib';
import { useOnboarding } from '../hooks';

import { CameraScreen } from './CameraScreen';
import { WelcomeScreen } from './onboarding/WelcomeScreen';
import { ProfileNavigator } from './profile/ProfileNavigator';
import { ProfileViewScreen } from './profile/ProfileViewScreen';
import { WebViewScreen } from './WebViewScreen';

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
      <Stack.Screen
        name={Navigation.WEBVIEW_SCREEN}
        component={WebViewScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
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
  const { isLoading, hasCompletedWelcome } = useOnboarding();

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={hasCompletedWelcome ? Navigation.CAMERA_SCREEN : Navigation.ONBOARDING_SCREEN}
        >
          {!hasCompletedWelcome && (
            <Stack.Screen
              name={Navigation.ONBOARDING_SCREEN}
              component={WelcomeScreen}
              options={{
                gestureEnabled: false,
              }}
            />
          )}
          <Stack.Screen
            name={Navigation.CAMERA_SCREEN}
            component={CameraStack}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
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