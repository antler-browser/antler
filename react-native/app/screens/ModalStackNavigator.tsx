import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileCreateOrEditNavigator } from './profile/ProfileCreateOrEditNavigator';
import { WebViewScreen } from './WebViewScreen';
import { SettingsScreen } from './SettingsScreen';
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
        name={Navigation.PROFILE_CREATE_OR_EDIT_SCREEN}
        component={ProfileCreateOrEditNavigator}
      />
      <Stack.Screen
        name={Navigation.WEBVIEW_SCREEN}
        component={WebViewScreen}
      />
      <Stack.Screen
        name={Navigation.SETTINGS_SCREEN}
        component={SettingsScreen}
      />
    </Stack.Navigator>
  );
}
