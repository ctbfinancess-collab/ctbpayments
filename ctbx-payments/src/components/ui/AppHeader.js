import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default function AppHeader({
  leftAccessibilityLabel = 'Voltar',
  leftContent,
  logoSource,
  onLeftPress,
  onRightPress,
  rightAccessibilityLabel = 'Ação',
  rightContent,
  title,
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityLabel={leftAccessibilityLabel}
        disabled={!onLeftPress}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        onPress={onLeftPress}
        style={styles.side}
      >
        {leftContent}
      </TouchableOpacity>
      <View style={styles.center}>
        {logoSource ? <Image resizeMode="contain" source={logoSource} style={styles.logo} /> : null}
        {title ? <Text numberOfLines={1} style={styles.title}>{title}</Text> : null}
      </View>
      <TouchableOpacity
        accessibilityLabel={rightAccessibilityLabel}
        disabled={!onRightPress}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        onPress={onRightPress}
        style={styles.side}
      >
        {rightContent}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.navy900,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  side: { alignItems: 'center', justifyContent: 'center', minHeight: 44, width: 44 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logo: { height: 30, maxWidth: 128, width: '100%' },
  title: { ...typography.heading3, color: colors.textPrimary, textAlign: 'center' },
});
