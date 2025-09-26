import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useRoute, RouteProp } from '@react-navigation/native';
import { NameScreen } from './NameScreen';
import { SocialsScreen } from './SocialsScreen';
import { AvatarScreen } from './AvatarScreen';
import { Navigation } from '../../../lib';

const Stack = createNativeStackNavigator<Navigation.ProfileCreationStackParamList>();

type ProfileNavigatorRoute = RouteProp<Navigation.ModalStackParamList, 'ProfileCreationScreen'>;

export function ProfileNavigator() {
  const route = useRoute<ProfileNavigatorRoute>();
  const pendingUrl = route.params?.pendingUrl;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="Name"
        component={NameScreen}
        initialParams={{
          mode: 'create' as Navigation.ProfileMode,
          pendingUrl
        }}
      />
      <Stack.Screen name="Socials" component={SocialsScreen} />
      <Stack.Screen name="Avatar" component={AvatarScreen} />
    </Stack.Navigator>
  );
}