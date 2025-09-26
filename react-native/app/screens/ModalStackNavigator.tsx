import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileNavigator } from './profile/ProfileNavigator';
import { WebViewScreen } from './WebViewScreen';
import { Navigation } from '../../lib';

const Stack = createNativeStackNavigator<Navigation.ModalStackParamList>();

export function ModalStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name={Navigation.PROFILE_CREATION_SCREEN}
        component={ProfileNavigator}
      />
      <Stack.Screen
        name={Navigation.WEBVIEW_SCREEN}
        component={WebViewScreen}
      />
    </Stack.Navigator>
  );
}