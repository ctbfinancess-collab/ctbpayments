import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import { Card, EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { getVirtualCardTransactions } from '../../services/cardService';
import useAsyncResource from '../../hooks/useAsyncResource';
import { colors, shadows, spacing, typography } from '../../theme';

const PERIODS = [{ id: 7, label: '7 dias' }, { id: 15, label: '15 dias' }, { id: 30, label: '30 dias' }, { id: 0, label: 'Tudo' }];
const STATUSES = [
  { id: 'all', label: 'Todas' }, { id: 'APPROVED', label: 'Aprovadas' }, { id: 'DECLINED', label: 'Recusadas' },
  { id: 'REVERSED', label: 'Estornadas' }, { id: 'PENDING', label: 'Pendentes' },
];

export default function CardVirtualTransactionsScreen({ navigation, route }) {
  const cardId = route.params?.cardId;
  const [period, setPeriod] = useState(30);
  const [status, setStatus] = useState('all');
  const loader = React.useCallback(() => getVirtualCardTransactions(cardId), [cardId]);
  const { data: allTransactions, error, loading, retry } = useAsyncResource(loader, []);

  const transactions = useMemo(() => {
    const start = period ? Date.now() - period * 86_400_000 : 0;
    return allTransactions.filter((item) => new Date(item.occurredAt).getTime() >= start && (status === 'all' || item.statusKey === status));
  }, [allTransactions, period, status]);

  const title = 'Transações do cartão';
  if (loading) return <CardScreenLayout navigation={navigation} title={title}><LoadingState /></CardScreenLayout>;
  if (error) return <CardScreenLayout navigation={navigation} title={title}><ErrorState message="Não foi possível carregar as transações do cartão virtual." onRetry={retry} /></CardScreenLayout>;

  return (
    <CardScreenLayout navigation={navigation} title={title}>
      <View style={styles.wrap}>
        <View style={styles.filters}>
          {PERIODS.map((item) => (
            <TouchableOpacity accessibilityRole="button" key={item.id} onPress={() => setPeriod(item.id)} style={[styles.chip, period === item.id && styles.chipActive]}>
              <Text style={[styles.chipText, period === item.id && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filters}>
          {STATUSES.map((item) => (
            <TouchableOpacity accessibilityRole="button" key={item.id} onPress={() => setStatus(item.id)} style={[styles.chip, status === item.id && styles.chipActive]}>
              <Text style={[styles.chipText, status === item.id && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {transactions.length ? transactions.map((transaction) => (
          <Card elevated={false} key={transaction.id} style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.title}>{transaction.title}</Text>
              <Text style={styles.copy}>{transaction.date} · {transaction.status}</Text>
            </View>
            <Text style={[styles.value, transaction.value.startsWith('+') && styles.positive]}>{transaction.value}</Text>
          </Card>
        )) : <EmptyState message="Nenhuma transação encontrada com esses filtros." />}
      </View>
    </CardScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, padding: spacing.lg },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(99, 102, 241, 0.55)', ...shadows.glowPurple },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary, fontWeight: '700' },
  item: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  itemInfo: { flex: 1 },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  copy: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  value: { color: colors.orange500, fontWeight: '800' },
  positive: { color: colors.success },
});
