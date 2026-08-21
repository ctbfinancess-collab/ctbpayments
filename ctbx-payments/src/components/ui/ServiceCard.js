import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import Badge from './Badge';

export default function ServiceCard({ badge, disabled = false, icon, label, onPress, style, variant = 'default' }) {
  return (
    <TouchableOpacity accessibilityState={{ disabled }} activeOpacity={0.78} disabled={disabled} onPress={onPress} style={[styles.card, variant === 'quick' && styles.quick, shadows.soft, disabled && styles.disabled, style]}>
      {badge ? <Badge style={styles.badge}>{badge}</Badge> : null}
      <View style={[styles.iconContainer, variant === 'quick' && styles.quickIcon]}>{icon}</View>
      <Text numberOfLines={2} style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 104,
    padding: spacing.md,
  },
  iconContainer: { alignItems: 'center', backgroundColor: 'rgba(94, 107, 255, 0.14)', borderRadius: radii.md, height: 42, justifyContent: 'center', marginBottom: spacing.sm, width: 42 },
  quick: { backgroundColor: colors.surfaceElevated, borderColor: colors.purpleAlpha45 },
  quickIcon: { backgroundColor: colors.purpleAlpha20 },
  label: { ...typography.label, color: colors.textPrimary, textAlign: 'center' },
  badge: { position: 'absolute', right: spacing.sm, top: spacing.sm },
  disabled: { opacity: 0.5 },
});
