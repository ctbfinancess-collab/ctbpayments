import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function BalanceCard({
  actionLabel,
  currency = 'R$',
  label,
  onActionPress,
  onToggleVisibility,
  style,
  value,
  visible = true,
  variant = 'purple',
}) {
  return (
    <View style={[styles.card, variant === 'blue' ? styles.blue : styles.purple, shadows.card, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity accessibilityLabel={visible ? 'Ocultar saldo' : 'Mostrar saldo'} onPress={onToggleVisibility} style={styles.eyeButton}>
          <Text style={styles.eye}>{visible ? '◉' : '○'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.value}>{visible ? `${currency} ${value}` : '••••••'}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress} style={styles.actionButton}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.borderStrong, borderRadius: radii.xl, borderWidth: 1, minHeight: 150, padding: spacing.xl },
  purple: { backgroundColor: colors.surfacePurple },
  blue: { backgroundColor: colors.navy700 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.label, color: colors.slate100 },
  eyeButton: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
  eye: { color: colors.ice, fontSize: 18 },
  value: { ...typography.balance, color: colors.white, marginTop: spacing.md },
  actionButton: { alignSelf: 'flex-start', borderColor: colors.borderStrong, borderRadius: radii.pill, borderWidth: 1, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionText: { ...typography.caption, color: colors.ice },
});
