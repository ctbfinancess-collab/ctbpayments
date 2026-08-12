import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { AppHeader, Screen } from '../ui';
import { colors, spacing } from '../../theme';
export default function PaymentLayout({ children, navigation, title }) { return <Screen contentContainerStyle={styles.screen} gradient><AppHeader leftContent={<Text style={styles.back}>‹</Text>} onLeftPress={() => navigation.goBack()} title={title} /><ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView></Screen>; }
const styles = StyleSheet.create({ screen: { paddingHorizontal: 0 }, content: { flexGrow: 1, padding: spacing.xl }, back: { color: colors.textPrimary, fontSize: 34, lineHeight: 34 } });
