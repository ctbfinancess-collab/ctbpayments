import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import { Card, OutlineButton } from '../../components/ui';
import { MOCK_CARD_TRANSACTIONS } from '../../data/cardMockData';
import { colors, spacing, typography } from '../../theme';

const PERIODS = [7, 15, 30];

export default function CardStatementScreen({ navigation }) {
  const [period, setPeriod] = useState(30);
  const transactions = useMemo(() => {
    const start = Date.now() - period * 86400000;
    return MOCK_CARD_TRANSACTIONS.filter((item) => new Date(item.occurredAt).getTime() >= start);
  }, [period]);
  return <CardScreenLayout navigation={navigation} title="Extrato do cartão"><View style={styles.wrap}>
    <View style={styles.filters}>{PERIODS.map((days) => <TouchableOpacity accessibilityRole="button" key={days} onPress={() => setPeriod(days)} style={[styles.chip, period === days && styles.chipActive]}><Text style={[styles.chipText, period === days && styles.chipTextActive]}>{days} dias</Text></TouchableOpacity>)}</View>
    {transactions.map((transaction) => <TouchableOpacity key={transaction.id} onPress={() => navigation.navigate('CardTransaction', { transaction })}><Card style={styles.item}><View><Text style={styles.title}>{transaction.title}</Text><Text style={styles.copy}>{transaction.date} · {transaction.status}</Text></View><Text style={[styles.value, transaction.value.startsWith('+') && styles.positive]}>{transaction.value}</Text></Card></TouchableOpacity>)}
    <Text style={styles.demo}>Ambiente de demonstração</Text>
    <OutlineButton onPress={() => navigation.navigate('CardReceipts')}>Ver comprovantes</OutlineButton>
  </View></CardScreenLayout>;
}

const styles = StyleSheet.create({ wrap: { gap: spacing.sm, padding: spacing.lg }, filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }, chip: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipActive: { backgroundColor: colors.purpleAlpha20, borderColor: colors.purple400 }, chipText: { color: colors.textSecondary }, chipTextActive: { color: colors.textPrimary, fontWeight: '700' }, item: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md }, title: { ...typography.body, color: colors.textPrimary, fontWeight: '700' }, copy: { ...typography.caption, color: colors.textSecondary, marginTop: 4 }, value: { color: colors.orange500, fontWeight: '800' }, positive: { color: colors.success }, demo: { ...typography.caption, color: colors.textMuted, textAlign: 'center' } });
