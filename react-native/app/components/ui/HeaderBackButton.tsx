import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navigation, Colors } from '../../../lib';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

interface HeaderBackButtonProps {
  onPress?: () => void;
}

export function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  const navigation = useNavigation<NativeStackNavigationProp<Navigation.OnboardingStackParamList>>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[
        styles.backButton,
        {
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0)'
        }
      ]}
      onPress={onPress || (() => navigation.goBack())}
      activeOpacity={0.7}>
      <Ionicons
        name="arrow-back"
        size={24}
        color={colors.text}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});