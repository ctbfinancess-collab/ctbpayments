import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { APP_MODES, appMode } from '../../config';
import { colors, radii, spacing, typography } from '../../theme';
export default function DemoEnvironmentBadge({ mode = appMode }) {
  if (mode === APP_MODES.PRODUCTION) return null;
  const sandbox = mode === APP_MODES.SANDBOX;
  return <View pointerEvents="none" style={[styles.badge, sandbox && styles.sandbox]}><Text style={styles.text}>{sandbox ? 'AMBIENTE SANDBOX' : 'AMBIENTE DE DEMONSTRAÇÃO'}</Text></View>;
}
const styles = StyleSheet.create({ badge: { alignSelf: 'center', backgroundColor: colors.orange500, borderBottomLeftRadius: radii.sm, borderBottomRightRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 3, position: 'absolute', top: 0, zIndex: 1000 }, sandbox: { backgroundColor: colors.purple500 }, text: { ...typography.caption, color: colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 } });
