import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

// Pill de status genérico, por tom (não por string de status específica) —
// cada tela mapeia seu próprio texto de status pro tom certo. Cores
// funcionais reservadas exclusivamente para status, conforme o brief visual.
const TONE_STYLE = {
  success: { color: adminColors.success, background: adminColors.successSoft },
  warning: { color: adminColors.warning, background: adminColors.warningSoft },
  danger: { color: adminColors.danger, background: adminColors.dangerSoft },
  info: { color: adminColors.info, background: adminColors.infoSoft },
  neutral: { color: adminColors.textSecondary, background: adminColors.surfaceElevated },
};

export default function StatusBadge({ label, tone = 'neutral' }) {
  const style = TONE_STYLE[tone] || TONE_STYLE.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: style.background }]}>
      <Text style={[styles.pillText, { color: style.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  pillText: { ...typography.caption },
});
