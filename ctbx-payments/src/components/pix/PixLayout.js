import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../ui';
import { colors, spacing, typography } from '../../theme';

export const PIX_COLORS = {
  dark: colors.navy900,
  accent: colors.purple500,
  confirmation: colors.orange500,
  page: colors.background,
  card: colors.surface,
  elevated: colors.surfaceElevated,
  text: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  border: colors.borderSubtle,
  borderStrong: colors.borderStrong,
  success: colors.success,
  danger: colors.danger,
};

export default function PixLayout({ navigation, title, children, scroll = true }) {
  const body = scroll ? (
    <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <Screen contentContainerStyle={styles.screenContent} gradient>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Voltar"
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        <View style={styles.spacer} />
      </View>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0 },
  header: {
    alignItems: 'center',
    backgroundColor: PIX_COLORS.dark,
    flexDirection: 'row',
    borderBottomColor: PIX_COLORS.border,
    borderBottomWidth: 1,
    height: 58,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  backButton: { alignItems: 'center', backgroundColor: colors.whiteAlpha08, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  backIcon: { color: colors.textPrimary, fontSize: 34, fontWeight: '300', lineHeight: 34 },
  title: { ...typography.heading3, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  spacer: { width: 40 },
  content: { backgroundColor: 'transparent', flexGrow: 1, padding: spacing.xl },
});
