import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
export default function EmptyState({ message = 'Nenhum item encontrado.', title = 'Nada por aqui', style }) { return <View style={[styles.container, style]}><Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text></View>; }
const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, title: { ...typography.heading3, color: colors.textPrimary }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' } });
