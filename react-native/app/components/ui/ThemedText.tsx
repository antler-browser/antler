import React from 'react';
import { Text, TextProps, useColorScheme } from 'react-native';
import { Colors } from '../../../lib';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'subtitle' | 'link';
};

const typeStyles = {
  default: {
    fontFamily: 'SourceSans3-Regular',
    fontWeight: 400 as const,
    fontSize: 16,
  },
  title: {
    fontFamily: 'SourceSans3-Bold',
    fontWeight: 700 as const,
    fontSize: 32,
  },
  subtitle: {
    fontFamily: 'SourceSans3-SemiBold', 
    fontWeight: 600 as const,
    fontSize: 20,
  },
  link: {
    fontFamily: 'SourceSans3-Bold',
    fontWeight: 700 as const,
    fontSize: 16,
  },
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const textColor = Colors[colorScheme].text;

  return (
    <Text
      style={[
        typeStyles[type],
        { color: textColor },
        style,
      ]}
      {...rest}
    />
  );
}