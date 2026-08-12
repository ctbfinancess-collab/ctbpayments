import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import StatementLayout from '../../components/statement/StatementLayout';
import TransactionCard from '../../components/statement/TransactionCard';
import { BalanceCard, Card, OutlineButton, PrimaryButton, SectionTitle } from '../../components/ui';
import { MOCK_BLOCKED_TRANSACTIONS, MOCK_FUTURE_TRANSACTIONS, MOCK_STATEMENT_BALANCE, MOCK_TRANSACTIONS } from '../../data/statementMockData';
import { colors, radii, spacing, typography } from '../../theme';
import { filterTransactions, formatStatementAmount, groupTransactionsByDate } from '../../utils/statementUtils';

const AREAS = [{ id: 'statement', label: 'Extrato' }, { id: 'future', label: 'Futuros' }, { id: 'blocked', label: 'Bloqueados' }];
export default function StatementScreen({ navigation, route }) {
  const [area, setArea] = useState('statement'); const [visibleBalance, setVisibleBalance] = useState(false); const [query, setQuery] = useState(''); const [period, setPeriod] = useState(30); const [direction, setDirection] = useState('todos'); const [category, setCategory] = useState('todos'); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [limit, setLimit] = useState(5);
  const source = area === 'future' ? MOCK_FUTURE_TRANSACTIONS : area === 'blocked' ? MOCK_BLOCKED_TRANSACTIONS : MOCK_TRANSACTIONS;
  useEffect(() => {
    const applied = route.params?.appliedFilters;
    if (applied) { setCategory(applied.category); setDirection(applied.direction); setEndDate(applied.endDate); setPeriod(applied.period); setStartDate(applied.startDate); }
  }, [route.params?.filterVersion]);
  const filtered = useMemo(() => filterTransactions(source, { category, direction, endDate, period, query, startDate }), [source, category, direction, endDate, period, query, startDate]); const visible = filtered.slice(0, limit); const groups = groupTransactionsByDate(visible); const total = filtered.reduce((sum, item) => sum + (item.direction === 'entrada' ? item.amount : -item.amount), 0);
  const exportStatement = (format) => Alert.alert(`Exportar ${format}`, `A geração real de ${format} depende da API do extrato.`);
  return <StatementLayout navigation={navigation} title="Extrato">
    <BalanceCard label="Saldo da conta digital" onToggleVisibility={() => setVisibleBalance((v) => !v)} value={MOCK_STATEMENT_BALANCE} variant="blue" visible={visibleBalance} />
    <View style={styles.areas}>{AREAS.map((item) => <TouchableOpacity key={item.id} onPress={() => { setArea(item.id); setLimit(5); }} style={[styles.chip, area === item.id && styles.chipActive]}><Text style={[styles.chipText, area === item.id && styles.chipTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
    <TextInput onChangeText={setQuery} placeholder="Buscar movimentação" placeholderTextColor={colors.textMuted} style={styles.search} value={query} />
    <SectionTitle actionLabel="Filtros" onActionPress={() => navigation.navigate('StatementFilters', { current: { category, direction, endDate, period, startDate } })} style={styles.title} title={area === 'statement' ? 'Movimentações' : area === 'future' ? 'Lançamentos futuros' : 'Movimentações bloqueadas'} />
    {area === 'statement' ? <Card style={styles.total}><Text style={styles.totalLabel}>Total no período</Text><Text style={[styles.totalValue, total >= 0 ? styles.positive : styles.negative]}>{total >= 0 ? '+' : '-'} R$ {formatStatementAmount(Math.abs(total))}</Text></Card> : null}
    {groups.length ? groups.map((group) => <View key={group.date} style={styles.group}><Text style={styles.date}>{group.date}</Text>{group.items.map((item) => <TransactionCard item={item} key={item.id} onPress={() => navigation.navigate('StatementDetail', { transaction: item })} />)}</View>) : <Text style={styles.empty}>Nenhuma movimentação encontrada.</Text>}
    {limit < filtered.length ? <OutlineButton onPress={() => setLimit((v) => v + 5)} style={styles.load}>Carregar mais</OutlineButton> : null}
    <View style={styles.exports}><PrimaryButton onPress={() => exportStatement('PDF')} style={styles.exportButton}>Exportar PDF</PrimaryButton><OutlineButton onPress={() => exportStatement('CSV')} style={styles.exportButton}>Exportar CSV</OutlineButton></View>
    <OutlineButton onPress={() => Share.share({ message: `Extrato CTBX · ${filtered.length} movimentações` })} style={styles.share}>Compartilhar resumo</OutlineButton>
  </StatementLayout>;
}
const styles = StyleSheet.create({ areas: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg }, chip: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: radii.pill, borderWidth: 1, flex: 1, paddingVertical: spacing.sm }, chipActive: { backgroundColor: colors.purpleAlpha20, borderColor: colors.purple500 }, chipText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' }, chipTextActive: { color: colors.purple300, fontWeight: '700' }, search: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, minHeight: 48, paddingHorizontal: spacing.lg }, title: { marginBottom: spacing.md, marginTop: spacing.xl }, total: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg, padding: spacing.lg }, totalLabel: { ...typography.body, color: colors.textSecondary }, totalValue: { ...typography.heading3 }, positive: { color: colors.success }, negative: { color: colors.orange400 }, group: { marginBottom: spacing.lg }, date: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm }, empty: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.xxl, textAlign: 'center' }, load: { marginBottom: spacing.md }, exports: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }, exportButton: { flex: 1, paddingHorizontal: spacing.sm }, share: { marginTop: spacing.sm } });
