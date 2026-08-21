import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import StatementLayout from '../../components/statement/StatementLayout';
import TransactionCard from '../../components/statement/TransactionCard';
import { Card, EmptyState, ErrorState, Icon, LoadingState } from '../../components/ui';
import { getStatementData } from '../../services/statementService';
import useAsyncResource from '../../hooks/useAsyncResource';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { filterTransactions, formatStatementAmount, groupTransactionsByDate } from '../../utils/statementUtils';

const AREAS = [
  { id: 'statement', label: 'Extrato', searchPlaceholder: 'Buscar movimentação', heading: 'Movimentações' },
  { id: 'future', label: 'Futuros', searchPlaceholder: 'Buscar lançamentos futuros', heading: 'Lançamentos futuros', subtitle: 'Confira os pagamentos e recebimentos agendados.' },
  { id: 'blocked', label: 'Bloqueados', searchPlaceholder: 'Buscar movimentação', heading: 'Movimentações bloqueadas' },
];

// Botão de contorno violeta com ícone à esquerda do texto — o OutlineButton
// compartilhado sempre envolve `children` num <Text>, então não comporta um
// ícone+rótulo lado a lado (View dentro de Text quebra no React Native).
function IconOutlineButton({ children, icon, onPress, style }) {
  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={onPress} style={[styles.iconOutlineButton, style]}>
      <Icon color={colors.purple300} name={icon} size={16} />
      <Text style={styles.iconOutlineText}>{children}</Text>
    </TouchableOpacity>
  );
}

function StatementBalanceCard({ label, onToggleVisibility, value, visible }) {
  return (
    <View style={styles.balanceCard}>
      <Image pointerEvents="none" resizeMode="cover" source={require('../../../assets/ctbx-balance-card-background.png')} style={styles.balanceCardBackground} />
      <View style={styles.balanceHeaderRow}>
        <Text style={styles.balanceLabel}>{label}</Text>
        <TouchableOpacity accessibilityLabel={visible ? 'Ocultar saldo' : 'Mostrar saldo'} onPress={onToggleVisibility} style={styles.balanceEyeButton}>
          <Icon color={colors.textPrimary} name={visible ? 'eye-outline' : 'eye-off-outline'} size={19} />
        </TouchableOpacity>
      </View>
      <Text style={styles.balanceValue}>{visible ? `R$ ${value}` : 'R$ ••••••'}</Text>
      <Text style={styles.balanceSubtitle}>Conta •••• 0000</Text>
    </View>
  );
}

export default function StatementScreen({ navigation, route }) {
  const { data: statementData, error, loading, retry } = useAsyncResource(getStatementData, { balance: '', blockedTransactions: [], futureTransactions: [], transactions: [] });
  const [area, setArea] = useState('statement'); const [visibleBalance, setVisibleBalance] = useState(false); const [query, setQuery] = useState(''); const [period, setPeriod] = useState(30); const [direction, setDirection] = useState('todos'); const [category, setCategory] = useState('todos'); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [limit, setLimit] = useState(5);
  const currentArea = AREAS.find((item) => item.id === area);
  const source = area === 'future' ? statementData.futureTransactions : area === 'blocked' ? statementData.blockedTransactions : statementData.transactions;
  useEffect(() => {
    const applied = route.params?.appliedFilters;
    if (applied) { setCategory(applied.category); setDirection(applied.direction); setEndDate(applied.endDate); setPeriod(applied.period); setStartDate(applied.startDate); }
  }, [route.params?.filterVersion]);
  const filtered = useMemo(() => filterTransactions(source, { applyPastPeriod: area === 'statement', category, direction, endDate, period, query, startDate }), [source, area, category, direction, endDate, period, query, startDate]); const visible = filtered.slice(0, limit); const groups = groupTransactionsByDate(visible); const total = filtered.reduce((sum, item) => sum + (item.direction === 'entrada' ? item.amount : -item.amount), 0);
  const exportStatement = (format) => Alert.alert(`Exportar ${format}`, `A geração real de ${format} depende da API do extrato.`);
  const filterAction = <Icon color={colors.textPrimary} name="options-outline" size={20} />;
  const filterPress = () => navigation.navigate('StatementFilters', { current: { category, direction, endDate, period, startDate } });
  if (loading) return <StatementLayout atmospheric backgroundSource={require('../../../assets/ctbx-statement-background.png')} navigation={navigation} onRightPress={filterPress} rightContent={filterAction} title="Extrato"><LoadingState /></StatementLayout>;
  if (error) return <StatementLayout atmospheric backgroundSource={require('../../../assets/ctbx-statement-background.png')} navigation={navigation} onRightPress={filterPress} rightContent={filterAction} title="Extrato"><ErrorState message="Não foi possível carregar o extrato." onRetry={retry} /></StatementLayout>;
  return (
    <StatementLayout atmospheric backgroundSource={require('../../../assets/ctbx-statement-background.png')} navigation={navigation} onRightPress={filterPress} rightContent={filterAction} title="Extrato">
      <StatementBalanceCard label="Saldo da conta digital" onToggleVisibility={() => setVisibleBalance((v) => !v)} value={statementData.balance} visible={visibleBalance} />

      <View style={styles.areas}>{AREAS.map((item) => <TouchableOpacity key={item.id} onPress={() => { setArea(item.id); setLimit(5); }} style={[styles.chip, area === item.id && styles.chipActive]}><Text style={[styles.chipText, area === item.id && styles.chipTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>

      <View style={styles.search}>
        <Icon color={colors.textMuted} name="search-outline" size={18} style={styles.searchIcon} />
        <TextInput onChangeText={setQuery} placeholder={currentArea.searchPlaceholder} placeholderTextColor={colors.textMuted} style={styles.searchInput} value={query} />
      </View>

      <View style={styles.headingRow}>
        <Text style={styles.heading}>{currentArea.heading}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={filterPress} style={styles.filtersAction}>
          <Text style={styles.filtersActionText}>Filtros</Text>
          <Icon color={colors.purple300} name="options-outline" size={15} />
        </TouchableOpacity>
      </View>
      {currentArea.subtitle ? <Text style={styles.headingSubtitle}>{currentArea.subtitle}</Text> : null}

      {area === 'statement' ? <Card elevated={false} style={styles.total}><Text style={styles.totalLabel}>Total no período</Text><Text style={[styles.totalValue, total >= 0 ? styles.positive : styles.negative]}>{total >= 0 ? '+' : '-'} R$ {formatStatementAmount(Math.abs(total))}</Text></Card> : null}
      {groups.length ? groups.map((group) => <View key={group.date} style={styles.group}><Text style={styles.date}>{group.date}</Text>{group.items.map((item) => <TransactionCard item={item} key={item.id} onPress={() => navigation.navigate('StatementDetail', { transaction: item })} />)}</View>) : <EmptyState message="Nenhuma movimentação encontrada." />}
      {limit < filtered.length ? (
        <IconOutlineButton icon="chevron-down-outline" onPress={() => setLimit((v) => v + 5)} style={styles.load}>
          Carregar mais {area === 'future' ? 'futuros' : 'movimentações'}
        </IconOutlineButton>
      ) : null}

      <View style={styles.exports}>
        <IconOutlineButton icon="document-text-outline" onPress={() => exportStatement('PDF')} style={styles.exportButton}>Exportar PDF</IconOutlineButton>
        <IconOutlineButton icon="grid-outline" onPress={() => exportStatement('CSV')} style={styles.exportButton}>Exportar CSV</IconOutlineButton>
      </View>
      <IconOutlineButton icon="share-social-outline" onPress={() => Share.share({ message: `Extrato CTBX · ${filtered.length} movimentações` })} style={styles.share}>
        Compartilhar resumo
      </IconOutlineButton>

      <View style={styles.footer}>
        <Icon color={colors.textMuted} name="lock-closed-outline" size={13} />
        <Text style={styles.footerText}>Ambiente seguro · Seus dados estão protegidos</Text>
      </View>
    </StatementLayout>
  );
}
const styles = StyleSheet.create({
  // Card do saldo: mantém a arte de fundo (mapa+ave) já aprovada — só a
  // borda/glow foram ajustados para o azul "premium" pedido no brief,
  // sem transformar o card num bloco azul sólido.
  balanceCard: { borderColor: 'rgba(39, 111, 255, 0.45)', borderRadius: radii.xl, borderWidth: 1, marginBottom: spacing.xl, overflow: 'hidden', padding: spacing.xl, shadowColor: '#0044FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 6 },
  balanceCardBackground: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  balanceHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { ...typography.body, color: colors.textPrimary },
  balanceEyeButton: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
  balanceValue: { ...typography.display, color: colors.textPrimary, marginTop: spacing.xs },
  balanceSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  areas: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  // Abas inativas: mesmo "dark glass" translúcido dos cards de movimentação.
  // Aba ativa: SOMENTE borda/glow violeta-azul — sem preencher de roxo.
  chip: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, flex: 1, paddingVertical: spacing.md },
  chipActive: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(99, 102, 241, 0.55)', ...shadows.glowPurple },
  chipText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  chipTextActive: { color: colors.purple300, fontWeight: '700' },
  // Campo de busca: integrado ao fundo, borda quase invisível.
  search: { alignItems: 'center', backgroundColor: 'rgba(16, 51, 85, 0.72)', borderColor: 'rgba(92, 142, 220, 0.08)', borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', minHeight: 54, paddingHorizontal: spacing.lg },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { ...typography.input, color: colors.textPrimary, flex: 1, paddingVertical: 0 },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxl },
  heading: { ...typography.heading3, color: colors.textPrimary },
  headingSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  filtersAction: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  filtersActionText: { ...typography.label, color: colors.purple300 },
  // "Total no período": mesma linguagem translúcida dos cards de
  // movimentação (mais escuro, deixa o fundo aparecer), não mais opaco.
  total: { alignItems: 'center', backgroundColor: 'rgba(8, 30, 58, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.xl, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.xl, padding: spacing.lg, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  totalLabel: { ...typography.body, color: colors.textSecondary },
  totalValue: { ...typography.heading3 },
  positive: { color: colors.success },
  negative: { color: colors.orange400 },
  group: { marginBottom: spacing.xl, marginTop: spacing.lg },
  date: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.md },
  load: { marginBottom: spacing.lg },
  exports: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  exportButton: { flex: 1 },
  share: { marginTop: spacing.md },
  iconOutlineButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: 50, paddingHorizontal: spacing.lg },
  iconOutlineText: { ...typography.button, color: colors.purple300, textAlign: 'center' },
  footer: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { ...typography.caption, color: colors.textMuted },
});
