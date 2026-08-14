import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import Icon from '../ui/Icon';

export function TransferField({ label, multiline, onBlur, onFocus, ...props }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.group}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} onBlur={(e) => { setFocused(false); onBlur?.(e); }} onFocus={(e) => { setFocused(true); onFocus?.(e); }} placeholderTextColor={colors.textMuted} style={[styles.input, focused && styles.focused, multiline && styles.multiline]} /></View>;
}

export function TransferInfoRow({ label, value, last = false }) {
  return <View style={[styles.info, last && styles.infoLast]}><Text style={styles.infoLabel}>{label}</Text><Text selectable style={styles.infoValue}>{value || '—'}</Text></View>;
}

export function TransferToggle({ label, onPress, selected }) {
  return <TouchableOpacity onPress={onPress} style={styles.toggle}><View style={[styles.checkbox, selected && styles.checked]}>{selected ? <Icon color={colors.white} name="checkmark" size={15} /> : null}</View><Text style={styles.toggleText}>{label}</Text></TouchableOpacity>;
}

// "Dark glass": mesma linguagem visual do Extrato/Investimentos/Pix — fundo
// translúcido em vez de cor sólida, borda quase invisível.
const styles = StyleSheet.create({
  group: { marginBottom: spacing.lg }, label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  input: { backgroundColor: 'rgba(16, 51, 85, 0.72)', borderColor: 'rgba(92, 142, 220, 0.08)', borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 14, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  focused: { borderColor: colors.purple500, borderWidth: 1.5 }, multiline: { minHeight: 88, textAlignVertical: 'top' },
  info: { borderBottomColor: 'rgba(92, 142, 220, 0.10)', borderBottomWidth: 1, paddingVertical: spacing.md }, infoLast: { borderBottomWidth: 0 },
  infoLabel: { ...typography.caption, color: colors.textSecondary }, infoValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 3 },
  toggle: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md }, checkbox: { alignItems: 'center', borderColor: colors.purple500, borderRadius: 5, borderWidth: 1, height: 22, justifyContent: 'center', marginRight: spacing.sm, width: 22 }, checked: { backgroundColor: colors.purple500 }, toggleText: { ...typography.body, color: colors.textPrimary },
});
