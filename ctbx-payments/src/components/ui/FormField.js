import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import Icon from './Icon';

export default function FormField({
  error,
  inputRef,
  icon,
  label,
  onBlur,
  onFocus,
  premium = false,
  rightActionLabel,
  onRightAction,
  style,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.group, style]}>
      {label ? <Text style={[styles.label, premium && styles.premiumLabel]}>{label}</Text> : null}
      <View style={[styles.box, premium && styles.premiumBox, focused && styles.focused, error && styles.invalid]}>
        {icon ? <Icon color={focused ? colors.purple500 : colors.purple300} name={icon} size={22} style={styles.icon} /> : null}
        <TextInput
          {...inputProps}
          ref={inputRef}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.purple400}
          style={[styles.input, premium && styles.premiumInput]}
        />
        {rightActionLabel ? (
          <TouchableOpacity accessibilityRole="button" onPress={onRightAction} style={styles.action}>
            <Text style={styles.actionText}>{rightActionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  premiumLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  box: { alignItems: 'center', backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', minHeight: 50, paddingHorizontal: spacing.lg },
  premiumBox: { backgroundColor: 'rgba(5, 20, 38, 0.88)', borderColor: 'rgba(89, 70, 200, 0.52)', borderRadius: 15, minHeight: 58 },
  focused: { borderColor: colors.inputFocus, shadowColor: colors.purple500, shadowOpacity: 0.12, shadowRadius: 8 },
  invalid: { borderColor: colors.danger, borderWidth: StyleSheet.hairlineWidth },
  input: { ...typography.input, color: colors.textPrimary, flex: 1, minHeight: 48, paddingVertical: 0 },
  premiumInput: { color: colors.textPrimary, minHeight: 56 },
  icon: { marginRight: spacing.md },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingLeft: spacing.md },
  actionText: { ...typography.label, color: colors.purple300 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs, opacity: 0.88 },
});
