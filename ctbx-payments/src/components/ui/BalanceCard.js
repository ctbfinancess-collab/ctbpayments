import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import Icon from './Icon';

export default function BalanceCard({
  actionLabel,
  currency = 'R$',
  footerLabel,
  label,
  onActionPress,
  onToggleVisibility,
  style,
  value,
  visible = true,
  variant = 'purple',
}) {
  const Container = onActionPress && !actionLabel ? TouchableOpacity : View;
  return (
    <Container activeOpacity={0.9} onPress={onActionPress} style={[styles.card, variant === 'blue' ? styles.blue : styles.purple, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity accessibilityLabel={visible ? 'Ocultar saldo' : 'Mostrar saldo'} onPress={onToggleVisibility} style={styles.eyeButton}>
          <Icon color={colors.ice} name={visible ? 'eye-outline' : 'eye-off-outline'} size={19} />
        </TouchableOpacity>
      </View>
      <Text style={styles.value}>{visible ? `${currency} ${value}` : '••••••'}</Text>
      {footerLabel ? <Text style={styles.footerLabel}>{footerLabel}</Text> : null}
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress} style={styles.actionButton}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Container>
  );
}

// "Dark glass": mesma linguagem visual do Extrato/Investimentos — fundo
// translúcido em vez de cor sólida, com um glow colorido por variante em vez
// da sombra genérica anterior.
const styles = StyleSheet.create({
  card: { borderRadius: radii.xxl, borderWidth: 1, minHeight: 150, overflow: 'hidden', padding: spacing.xl },
  purple: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(99, 102, 241, 0.35)', shadowColor: '#5946C8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 6 },
  blue: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(39, 111, 255, 0.45)', shadowColor: '#0044FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 6 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.label, color: colors.slate100 },
  eyeButton: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
  value: { ...typography.balance, color: colors.white, marginTop: spacing.md },
  footerLabel: { ...typography.body, color: colors.slate100, marginTop: spacing.md },
  actionButton: { alignSelf: 'flex-start', backgroundColor: colors.whiteAlpha08, borderColor: colors.borderStrong, borderRadius: radii.pill, borderWidth: 1, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionText: { ...typography.label, color: colors.ice, fontSize: 11 },
});
