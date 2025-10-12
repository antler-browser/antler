import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors, Navigation } from '../../lib';
import { useOnboarding } from '../hooks';

import { CameraScreen } from './CameraScreen';
import { WelcomeScreen } from './onboarding/WelcomeScreen';
import { ProfileViewScreen } from './profile/ProfileViewScreen';
import { ModalStackNavigator } from './ModalStackNavigator';

const Stack = createNativeStackNavigator<Navigation.RootStackParamList>();

function CameraStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name={Navigation.CAMERA_SCREEN}
        component={CameraScreen}
        options={{
          animation: 'none',
        }}
      />
      <Stack.Screen
        name={Navigation.PROFILE_SCREEN}
        component={ProfileViewScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name={Navigation.MODAL_STACK}
        component={ModalStackNavigator}
        options={{
          presentation: 'modal',
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_bottom',
          gestureEnabled: false,
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
          [Navigation.MODAL_STACK]: {
            screens: {
              [Navigation.WEBVIEW_SCREEN]: 'webview',
            },
          },
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
          initialRouteName={hasCompletedWelcome ? Navigation.CAMERA_SCREEN : Navigation.WELCOME_SCREEN}
        >
          <Stack.Screen
            name={Navigation.WELCOME_SCREEN}
            component={WelcomeScreen}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name={Navigation.CAMERA_SCREEN}
            component={CameraStack}
            options={{
              animation: hasCompletedWelcome ? 'none' : 'slide_from_bottom',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
