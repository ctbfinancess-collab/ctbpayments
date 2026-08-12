import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii } from '../../theme';

export default function IconButton({
  accessibilityLabel,
  children,
  onPress,
  size = 42,
  style,
  variant = 'subtle',
  ...props
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.72}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'solid' && styles.solid,
        variant === 'outline' && styles.outline,
        { borderRadius: size / 2, height: size, width: size },
        style,
      ]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  solid: { backgroundColor: colors.surfaceElevated, borderRadius: radii.pill },
  outline: { borderColor: colors.borderStrong, borderWidth: 1 },
});
