import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppHeader, Icon, Screen } from '../ui';
import { colors, spacing } from '../../theme';
const PAYMENT_BACKGROUND = require('../../../assets/ctbx-statement-background.png');
export default function PaymentLayout({ children, navigation, title }) { return <Screen atmospheric backgroundSource={PAYMENT_BACKGROUND} contentContainerStyle={styles.screen} gradient={false}><AppHeader leftContent={<Icon color={colors.textPrimary} name="chevron-back" size={24} />} onLeftPress={() => navigation.goBack()} title={title} /><ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView></Screen>; }
const styles = StyleSheet.create({ screen: { paddingHorizontal: 0 }, content: { flexGrow: 1, padding: spacing.xl } });
