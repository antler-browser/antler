import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useRoute, RouteProp } from '@react-navigation/native';
import { NameScreen } from './NameScreen';
import { SocialsScreen } from './SocialsScreen';
import { AvatarScreen } from './AvatarScreen';
import { Navigation } from '../../../lib';

const Stack = createNativeStackNavigator<Navigation.ProfileCreateOrEditStackParamList>();
type ProfileCreateOrEditNavigatorRoute = RouteProp<Navigation.ModalStackParamList, typeof Navigation.PROFILE_CREATE_OR_EDIT_SCREEN>;

export function ProfileCreateOrEditNavigator() {
  const route = useRoute<ProfileCreateOrEditNavigatorRoute>();
  const pendingUrl = route.params?.pendingUrl;
  const pendingWebViewPublicKey = route.params?.pendingWebViewPublicKey;
  const mode = route.params?.mode || 'create';
  const did = route.params?.did;
  const initialScreen = route.params?.initialScreen || 'Name';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
      initialRouteName={initialScreen}
    >
      <Stack.Screen
        name="Name"
        component={NameScreen}
        initialParams={{
          mode: mode as Navigation.ProfileMode,
          pendingUrl,
          pendingWebViewPublicKey,
          did,
        }}
      />
      <Stack.Screen name="Socials" component={SocialsScreen} />
      <Stack.Screen name="Avatar" component={AvatarScreen} />
    </Stack.Navigator>
  );
}
