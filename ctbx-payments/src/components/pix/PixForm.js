import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PIX_COLORS } from './PixLayout';
import { ConfirmationButton, OutlineButton, PrimaryButton } from '../ui';
import { colors, radii, spacing, typography } from '../../theme';

export function PixField({ label, multiline = false, onBlur, onFocus, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, focused && styles.inputFocused, multiline && styles.multiline]}
        {...props}
      />
    </View>
  );
}

export function PixButton({ children, confirmation = false, disabled = false, loading = false, onPress, secondary = false }) {
  const Button = confirmation ? ConfirmationButton : secondary ? OutlineButton : PrimaryButton;
  return <Button disabled={disabled} loading={loading} onPress={onPress} style={styles.button}>{children}</Button>;
}

export function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: 16 },
  label: { ...typography.label, color: PIX_COLORS.secondary, marginBottom: spacing.sm },
  input: {
    backgroundColor: PIX_COLORS.card,
    borderColor: PIX_COLORS.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: PIX_COLORS.text,
    fontSize: typography.fontSize.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputFocused: { borderColor: colors.purple500, borderWidth: 1.5 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  button: { marginTop: spacing.md },
  infoRow: { borderBottomColor: PIX_COLORS.border, borderBottomWidth: 1, paddingVertical: 11 },
  infoLabel: { ...typography.caption, color: PIX_COLORS.secondary, marginBottom: 3 },
  infoValue: { ...typography.bodyMedium, color: PIX_COLORS.text },
});
