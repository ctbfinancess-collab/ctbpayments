import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, Screen } from '../ui';
import { colors, spacing, typography } from '../../theme';

// "Dark glass": mesma linguagem visual do Extrato/Investimentos/Home — fundo
// translúcido em vez de cor sólida, borda quase invisível. `card`/`border`/
// `elevated`/`borderStrong` são reaproveitados por praticamente todas as
// telas do fluxo Pix (via PixForm e cada tela), então mudar aqui já
// atualiza o app inteiro nessa rota.
export const PIX_COLORS = {
  dark: colors.navy900,
  accent: colors.purple500,
  confirmation: colors.orange500,
  page: colors.background,
  card: 'rgba(12, 43, 76, 0.72)',
  elevated: 'rgba(16, 51, 85, 0.72)',
  text: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  border: 'rgba(92, 142, 220, 0.10)',
  borderStrong: 'rgba(99, 102, 241, 0.45)',
  success: colors.success,
  danger: colors.danger,
};

const PIX_BACKGROUND = require('../../../assets/ctbx-pix-background.png');

export default function PixLayout({ navigation, title, children, scroll = true }) {
  const body = scroll ? (
    <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <Screen atmospheric backgroundSource={PIX_BACKGROUND} contentContainerStyle={styles.screenContent} gradient={false}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Voltar"
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon color={colors.textPrimary} name="chevron-back" size={24} />
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
  title: { ...typography.heading3, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  spacer: { width: 40 },
  content: { backgroundColor: 'transparent', flexGrow: 1, padding: spacing.xl },
});
