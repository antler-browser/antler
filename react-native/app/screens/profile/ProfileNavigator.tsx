import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NameScreen } from './NameScreen';
import { SocialsScreen } from './SocialsScreen';
import { AvatarScreen } from './AvatarScreen';
import { Navigation } from '../../../lib';

const Stack = createNativeStackNavigator<Navigation.ProfileCreationStackParamList>();

export function ProfileNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="Socials" component={SocialsScreen} />
      <Stack.Screen name="Avatar" component={AvatarScreen} />
    </Stack.Navigator>
  );
}