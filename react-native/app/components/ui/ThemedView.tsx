import React from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';
import { Colors } from '../../../lib';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...rest
}: ThemedViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = colorScheme === 'light' ? lightColor : darkColor;

  return (
    <View
      style={[
        { backgroundColor: backgroundColor ?? Colors[colorScheme].background },
        style,
      ]}
      {...rest}
    />
  );
}