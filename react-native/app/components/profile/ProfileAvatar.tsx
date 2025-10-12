import React from 'react';
import { Image, View, Text, StyleSheet, StyleProp, ImageStyle, useColorScheme } from 'react-native';
import { Colors } from '../../../lib';

export interface ProfileAvatarProps {
  avatar?: string;
  name?: string;
  size: number;
  style?: StyleProp<ImageStyle>;
}

export function ProfileAvatar({ avatar, name, size, style }: ProfileAvatarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const getUserInitial = () => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const borderRadius = size / 2;
  const fontSize = size * 0.4; // 40% of size for good proportions

  if (avatar) {
    return (
      <Image
        source={{ uri: avatar }}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{getUserInitial()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initial: {
    color: 'white',
    fontWeight: 'bold',
  },
});
