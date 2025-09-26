import React from 'react';
import { StyleSheet, ViewProps, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../lib';

export type ScreenProps = ViewProps & {
  children: React.ReactNode;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
};

export function Screen({ children, style, edges = ['top'], ...rest }: ScreenProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme].background },
        style,
      ]}
      edges={edges}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
