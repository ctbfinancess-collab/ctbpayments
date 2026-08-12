import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export default function Divider({ label, style, lineStyle, labelStyle }) {
  if (!label) {
    return <View style={[styles.line, style, lineStyle]} />;
  }

  return (
    <View style={[styles.withLabel, style]}>
      <View style={[styles.line, lineStyle]} />
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <View style={[styles.line, lineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  withLabel: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  line: {
    backgroundColor: colors.borderSubtle,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    marginHorizontal: spacing.md,
  },
});
