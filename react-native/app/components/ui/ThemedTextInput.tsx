import React from 'react';
import { TextInput, StyleSheet, TextInputProps, useColorScheme } from 'react-native';
import { Colors } from '../../../lib';
import { ThemedView } from './ThemedView';

interface ThemedTextInputProps extends TextInputProps {
  error?: boolean;
}

export function ThemedTextInput({ error, style, multiline, ...props }: ThemedTextInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={styles.container}>
      <TextInput
        multiline={multiline}
        style={[
          styles.input,
          multiline ? styles.multiline : styles.singleLine,
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
    // Android draws the native EditText outside its laid-out box when its intrinsic content is
    // taller than the box. Without this it paints over whatever sits below it.
    overflow: 'hidden',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  singleLine: {
    height: 56,
  },
  // No fixed height: a multiline caller sets its own, and a `height` here would fight it.
  multiline: {
    minHeight: 56,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
});
