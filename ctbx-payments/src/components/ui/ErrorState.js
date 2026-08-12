import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import OutlineButton from './OutlineButton';
export default function ErrorState({ message = 'Não foi possível carregar os dados.', onRetry, style }) { return <View accessibilityRole="alert" style={[styles.container, style]}><Text style={styles.title}>Algo deu errado</Text><Text style={styles.message}>{message}</Text>{onRetry ? <OutlineButton onPress={onRetry} style={styles.button}>Tentar novamente</OutlineButton> : null}</View>; }
const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, title: { ...typography.heading3, color: colors.textPrimary }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }, button: { marginTop: spacing.lg } });
