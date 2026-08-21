import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

export default function Card({ children, elevated = true, style, ...props }) {
  return (
    <View style={[styles.card, elevated && shadows.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
