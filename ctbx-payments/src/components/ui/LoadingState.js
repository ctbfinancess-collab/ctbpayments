import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
export default function LoadingState({ label = 'Carregando…', style }) { return <View accessibilityLiveRegion="polite" style={[styles.container, style]}><ActivityIndicator color={colors.purple400} size="large" /><Text style={styles.label}>{label}</Text></View>; }
const styles = StyleSheet.create({ container: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.xl }, label: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md } });
