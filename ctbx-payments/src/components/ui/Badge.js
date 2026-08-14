import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

const variants = {
  primary: {
    backgroundColor: colors.purpleAlpha20,
    borderColor: colors.purpleAlpha45,
    color: colors.purple300,
  },
  confirmation: {
    backgroundColor: colors.orangeAlpha20,
    borderColor: colors.orangeAlpha45,
    color: colors.orange400,
  },
  success: {
    backgroundColor: colors.successAlpha20,
    borderColor: colors.successAlpha45,
    color: colors.success,
  },
  neutral: {
    backgroundColor: colors.whiteAlpha08,
    borderColor: colors.whiteAlpha14,
    color: colors.textSecondary,
  },
};

export default function Badge({ children, variant = 'primary', style, textStyle }) {
  const palette = variants[variant] || variants.primary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        style,
      ]}
    >
      <Text style={[styles.text, { color: palette.color }, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  text: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.xs,
  },
});
