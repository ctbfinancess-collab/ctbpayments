import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function ButtonBase({
  backgroundColor,
  borderColor = 'transparent',
  children,
  disabled = false,
  loading = false,
  onPress,
  shadowStyle,
  style,
  textColor = colors.white,
  textStyle,
  ...props
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor, borderColor },
        shadowStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.xl,
  },
  disabled: { backgroundColor: colors.disabled, opacity: 0.65, ...shadows.none },
  text: { ...typography.button, textAlign: 'center' },
});
