import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../lib';
import { ThemedView } from './ThemedView';

interface ThemedTextInputProps extends TextInputProps {
  error?: boolean;
}

export function ThemedTextInput({ error, style, ...props }: ThemedTextInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.card,
            borderColor: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.icon}
        selectionColor={colors.tint}
        {...props}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
});
