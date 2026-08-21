import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppHeader, Card, ErrorState, Icon, LoadingState, MissingDataState, ModalSheet, PrimaryButton, Screen } from '../../components/ui';
import LineTrendChart from '../../components/investments/LineTrendChart';
import useAsyncResource from '../../hooks/useAsyncResource';
import useAsyncAction from '../../hooks/useAsyncAction';
import { convertCurrency, getExchangeRate, getGlobalAccount, getGlobalMovements } from '../../services/globalAccountService';
import { colors, radii, spacing, typography } from '../../theme';

const GLOBAL_BACKGROUND = require('../../../assets/ctbx-investments-background.png');
const TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'statement', label: 'Extrato' },
  { id: 'charts', label: 'Gráficos' },
  { id: 'account', label: 'Conta' },
];
const MONTH_DAY_LABELS = ['01', '05', '10', '15', '20', '25', '31'];
const QUICK_ACTIONS = [
  { id: 'send', icon: 'paper-plane-outline', label: 'Enviar\nInternacional' },
  { id: 'receive', icon: 'arrow-down-circle-outline', label: 'Receber' },
  { id: 'convert', icon: 'swap-horizontal-outline', label: 'Converter\nMoeda' },
  { id: 'pay', icon: 'card-outline', label: 'Pagar' },
  { id: 'invest', icon: 'trending-up-outline', label: 'Investir' },
  { id: 'more', icon: 'ellipsis-horizontal', label: 'Mais' },
];

function money(tag, value) { return `${tag} ${value}`; }

function InfoField({ copyable, label, value }) {
  const copy = async () => { await Clipboard.setStringAsync(String(value)); Alert.alert('Copiado', `${label} copiado para a área de transferência.`); };
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueRow}>
        <Text selectable style={styles.fieldValue}>{value || '—'}</Text>
        {copyable && value ? (
          <TouchableOpacity accessibilityLabel={`Copiar ${label}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={copy} style={styles.copyButton}>
            <Icon color={colors.purple300} name="copy-outline" size={15} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function GlobalAccountScreen({ navigation, route }) {
  const balance = route.params?.balance;
  const currency = balance?.currency;
  const [tab, setTab] = useState('overview');
  const [visible, setVisible] = useState(true);
  const [converterVisible, setConverterVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('toForeign'); // 'toForeign' (BRL→moeda) | 'toBrl' (moeda→BRL)
  const [conversion, setConversion] = useState(null);

  const loadAccount = React.useCallback(() => getGlobalAccount(currency), [currency]);
  const loadRate = React.useCallback(() => getExchangeRate(currency), [currency]);
  const loadMovements = React.useCallback(() => getGlobalMovements(currency), [currency]);
  const { data: account, error: accountError, loading: accountLoading, retry: retryAccount } = useAsyncResource(loadAccount);
  const { data: rate, error: rateError, loading: rateLoading, retry: retryRate } = useAsyncResource(loadRate);
  const { data: movements, loading: movementsLoading } = useAsyncResource(loadMovements, []);
  const { execute: runConversion, loading: converting } = useAsyncAction(convertCurrency);

  if (!balance || !currency) return <MissingDataState navigation={navigation} title="Conta global" />;

  const incomingTotal = movements.filter((item) => item.direction === 'entrada').reduce((sum, item) => sum + Number(item.amount.replace(/\./g, '').replace(',', '.')), 0);
  const outgoingTotal = movements.filter((item) => item.direction === 'saida').reduce((sum, item) => sum + Number(item.amount.replace(/\./g, '').replace(',', '.')), 0);
  const netTotal = incomingTotal - outgoingTotal;
  const currentValue = Number(String(balance.value).replace(/\./g, '').replace(',', '.'));
  // Curva ilustrativa (sobe com altos e baixos até o saldo atual, com um
  // pico destacado no meio do mês) — puramente demonstrativa, mesmo espírito
  // dos outros gráficos "estruturais" do app.
  const MONTH_SHAPE = [0.32, 0.18, 0.44, 0.6, 0.86, 0.7, 1];
  const monthSeries = MONTH_SHAPE.map((fraction) => currentValue * (0.55 + fraction * 0.5));
  const seriesMin = 0;
  const seriesMax = Math.ceil((Math.max(...monthSeries) * 1.08) / 1000) * 1000;

  const convert = async () => {
    if (!amount.trim()) return;
    const from = direction === 'toForeign' ? 'BRL' : currency;
    const to = direction === 'toForeign' ? currency : 'BRL';
    try { setConversion(await runConversion({ amount, from, to })); } catch { /* erro já fica registrado no estado do hook */ }
  };

  const openQuickAction = (action) => {
    if (action.id === 'convert') return setConverterVisible(true);
    if (action.id === 'receive') return setTab('account');
    if (action.id === 'invest') return navigation.navigate('Investments');
    if (action.id === 'pay') return navigation.navigate('Payments');
    if (action.id === 'send') return Alert.alert('Enviar internacional', 'Transferência internacional direta ainda não está disponível nesta demonstração. Use "Converter Moeda" para simular a cotação.');
    Alert.alert('Mais opções', 'Novas ações para a conta global chegam em breve.');
  };

  return (
    <Screen atmospheric backgroundSource={GLOBAL_BACKGROUND} gradient={false} contentContainerStyle={styles.screen}>
      <AppHeader
        leftContent={<Icon color={colors.textPrimary} name="chevron-back" size={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => Alert.alert('Ajuda', 'Dúvidas sobre sua conta global? Fale com o suporte pelos canais oficiais do app.')}
        rightContent={<Icon color={colors.textPrimary} name="help-circle-outline" size={22} />}
        title={`Conta Global ${currency}`}
      />
      <View style={styles.currencyPillRow}>
        <View style={styles.currencyPill}><Text style={styles.currencyPillText}>{currency}</Text></View>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={[styles.tabChip, tab === item.id && styles.tabChipActive]}>
            <Text numberOfLines={1} style={[styles.tabChipText, tab === item.id && styles.tabChipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView bounces={false} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card elevated={false} style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <Text style={styles.heroLabel}>Saldo disponível</Text>
            <TouchableOpacity accessibilityLabel={visible ? 'Ocultar saldo' : 'Mostrar saldo'} onPress={() => setVisible((current) => !current)} style={styles.eyeButton}>
              <Icon color={colors.textSecondary} name={visible ? 'eye-outline' : 'eye-off-outline'} size={18} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroValue}>{visible ? money(balance.tag, balance.value) : `${balance.tag} ••••••`}</Text>
          <Text style={styles.heroCurrencyName}>{account?.currencyName}</Text>
          <View style={styles.activeRow}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Conta ativa</Text>
          </View>
        </Card>

        {tab === 'overview' ? (
          <>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity key={action.id} onPress={() => openQuickAction(action)} style={styles.quickTile}>
                  <Icon color={colors.purple300} name={action.icon} size={20} />
                  <Text style={styles.quickTileLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Card elevated={false} style={styles.promoCard}>
              <View style={styles.promoIcon}><Icon color={colors.purple300} name="sync-outline" size={22} /></View>
              <View style={styles.promoCopy}>
                <Text style={styles.promoTitle}>Sua conta global</Text>
                <Text style={styles.promoText}>Receba pagamentos internacionais, faça transferências e converta moedas com segurança e agilidade.</Text>
                <TouchableOpacity onPress={() => Alert.alert('Conta global', 'Sua conta global permite receber, enviar e converter moedas estrangeiras direto pelo app. Mais funções chegam em breve.')}>
                  <View style={styles.promoLinkRow}><Text style={styles.promoLink}>Saiba mais</Text><Icon color={colors.purple300} name="chevron-forward" size={14} /></View>
                </TouchableOpacity>
              </View>
            </Card>
          </>
        ) : null}

        {tab === 'statement' ? (
          <Card elevated={false} style={styles.card}>
            {movementsLoading ? <LoadingState /> : movements.length ? movements.map((item, index) => {
              const incoming = item.direction === 'entrada';
              return (
                <View key={item.id} style={[styles.movementRow, index === movements.length - 1 && styles.movementRowLast]}>
                  <View style={[styles.movementIcon, incoming ? styles.incomingBg : styles.outgoingBg]}>
                    <Icon color={incoming ? colors.purple400 : colors.orange400} name={incoming ? 'arrow-down' : 'arrow-up'} size={16} />
                  </View>
                  <View style={styles.movementCopy}>
                    <Text style={styles.movementTitle}>{item.description}</Text>
                    <Text style={styles.movementDate}>{item.date} · {item.time}</Text>
                  </View>
                  <Text style={[styles.movementValue, incoming ? styles.incoming : styles.outgoing]}>{incoming ? '+' : '-'} {balance.tag} {item.amount}</Text>
                </View>
              );
            }) : <Text style={styles.emptyMovements}>Nenhuma movimentação recente nesta conta.</Text>}
          </Card>
        ) : null}

        {tab === 'charts' ? (
          <>
            <View style={styles.monthRow}>
              <Text style={styles.sectionHeading}>Resumo do mês</Text>
              <TouchableOpacity onPress={() => Alert.alert('Período', 'A seleção de outros meses ainda não está disponível nesta demonstração.')} style={styles.monthChip}>
                <Text style={styles.monthChipText}>Agosto 2026</Text>
                <Icon color={colors.purple300} name="chevron-down-outline" size={14} />
              </TouchableOpacity>
            </View>
            <Card elevated={false} style={styles.card}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Entradas</Text>
                  <Text style={styles.summaryPositive}>{balance.tag} {incomingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Saídas</Text>
                  <Text style={styles.summaryNegative}>{balance.tag} {outgoingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Saldo líquido</Text>
                  <Text style={styles.summaryNeutral}>{balance.tag} {netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
              </View>
              <View style={styles.chartRow}>
                <View style={styles.chartAxis}>
                  <Text style={styles.axisLabel}>{Math.round(seriesMax / 1000)}k</Text>
                  <Text style={styles.axisLabel}>{Math.round((seriesMax + seriesMin) / 2000)}k</Text>
                  <Text style={styles.axisLabel}>0</Text>
                </View>
                <LineTrendChart dots gradientColors={[colors.purple400, colors.orange400]} highlightIndex={4} max={seriesMax} min={0} points={monthSeries} width={280} />
              </View>
              <View style={styles.chartDaysRow}>
                {MONTH_DAY_LABELS.map((day) => <Text key={day} style={styles.axisDay}>{day}</Text>)}
              </View>
            </Card>
          </>
        ) : null}

        {tab === 'account' ? (
          <View>
            <View style={styles.accountHeaderRow}>
              <Text style={styles.sectionHeading}>Dados da conta (para receber)</Text>
              <Text style={styles.flagEmoji}>{account?.flag}</Text>
            </View>
            {accountLoading ? <LoadingState /> : accountError ? <ErrorState message="Não foi possível carregar os dados da conta." onRetry={retryAccount} /> : (
              <Card elevated={false} style={styles.card}>
                <InfoField label="Titular da conta" value={account.holder} />
                <InfoField label="Tipo de conta" value={account.accountType} />
                <InfoField label="País" value={`${account.country} ${account.flag}`} />
                <InfoField copyable label="Account Number" value={account.accountNumber} />
                {account.routingNumber ? <InfoField copyable label="Routing / ABA" value={account.routingNumber} /> : null}
                {account.iban ? <InfoField copyable label="IBAN" value={account.iban} /> : null}
                <InfoField copyable label="SWIFT / BIC" value={account.swift} />
                <InfoField label="Banco Correspondente" value={account.correspondentBank} />
                <InfoField label="Endereço do banco" value={account.bankAddress} />
              </Card>
            )}

            <Text style={styles.sectionHeading}>Câmbio</Text>
            {rateLoading ? <LoadingState /> : rateError ? <ErrorState message="Não foi possível carregar a cotação." onRetry={retryRate} /> : (
              <Card elevated={false} style={styles.card}>
                <View style={styles.rateRow}>
                  <View style={styles.rateCol}>
                    <Text style={styles.rateLabel}>Compra</Text>
                    <Text style={styles.rateValue}>R$ {rate.buy.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <View style={styles.rateDivider} />
                  <View style={styles.rateCol}>
                    <Text style={styles.rateLabel}>Venda</Text>
                    <Text style={styles.rateValue}>R$ {rate.sell.toFixed(2).replace('.', ',')}</Text>
                  </View>
                </View>
                <Text style={styles.rateNote}>1 {currency} · Atualizado em {rate.updatedAt} · SANDBOX, cotação estrutural</Text>
              </Card>
            )}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Icon color={colors.textMuted} name="lock-closed-outline" size={13} />
          <Text style={styles.footerText}>Ambiente seguro · Dados de demonstração</Text>
        </View>
      </ScrollView>

      <ModalSheet onClose={() => setConverterVisible(false)} title={`Converter ${currency}`} visible={converterVisible}>
        <View style={styles.directionRow}>
          <TouchableOpacity onPress={() => setDirection('toForeign')} style={[styles.directionChip, direction === 'toForeign' && styles.directionChipActive]}>
            <Text style={[styles.directionText, direction === 'toForeign' && styles.directionTextActive]}>BRL → {currency}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDirection('toBrl')} style={[styles.directionChip, direction === 'toBrl' && styles.directionChipActive]}>
            <Text style={[styles.directionText, direction === 'toBrl' && styles.directionTextActive]}>{currency} → BRL</Text>
          </TouchableOpacity>
        </View>
        <TextInput keyboardType="decimal-pad" onChangeText={setAmount} placeholder={direction === 'toForeign' ? 'Valor em R$' : `Valor em ${currency}`} placeholderTextColor={colors.textMuted} style={styles.input} value={amount} />
        <PrimaryButton disabled={converting} loading={converting} onPress={convert} style={styles.convertButton}>Converter</PrimaryButton>
        {conversion ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Você recebe aproximadamente</Text>
            <Text style={styles.resultValue}>{direction === 'toForeign' ? currency : 'R$'} {conversion.result}</Text>
            <Text style={styles.resultNote}>Taxa usada: {conversion.rate.toFixed(4)} · conversão estrutural SANDBOX, não é uma cotação em tempo real.</Text>
          </View>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  currencyPillRow: { flexDirection: 'row', marginTop: -spacing.sm, paddingHorizontal: spacing.lg },
  currencyPill: { backgroundColor: 'rgba(242, 106, 33, 0.14)', borderColor: 'rgba(242, 106, 33, 0.5)', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 3 },
  currencyPillText: { ...typography.caption, color: colors.orange400, fontWeight: '700' },
  tabsRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  tabChip: { alignItems: 'center', borderRadius: radii.pill, paddingVertical: spacing.sm, flex: 1 },
  tabChipActive: { backgroundColor: colors.purple500 },
  tabChipText: { ...typography.caption, color: colors.textSecondary, fontSize: 12 },
  tabChipTextActive: { color: colors.white, fontWeight: '700' },
  body: { gap: spacing.md, padding: spacing.lg },
  heroCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(99, 102, 241, 0.35)', borderWidth: 1, padding: spacing.xl, shadowColor: '#5946C8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 6 },
  heroHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroLabel: { ...typography.body, color: colors.textSecondary },
  eyeButton: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
  heroValue: { ...typography.display, color: colors.textPrimary, marginTop: spacing.xs },
  heroCurrencyName: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  activeRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  activeDot: { backgroundColor: colors.success, borderRadius: 4, height: 7, width: 7 },
  activeText: { ...typography.caption, color: colors.success },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickTile: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.lg, borderWidth: 1, justifyContent: 'center', minHeight: 76, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4, width: '31%' },
  quickTileLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 10, marginTop: spacing.xs, textAlign: 'center' },
  promoCard: { alignItems: 'flex-start', backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, flexDirection: 'row', shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  promoIcon: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: radii.md, height: 40, justifyContent: 'center', marginRight: spacing.md, width: 40 },
  promoCopy: { flex: 1 },
  promoTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  promoText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  promoLinkRow: { alignItems: 'center', flexDirection: 'row', gap: 2, marginTop: spacing.sm },
  promoLink: { ...typography.label, color: colors.purple300 },
  sectionHeading: { ...typography.heading3, color: colors.textPrimary },
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  movementRow: { alignItems: 'center', borderBottomColor: 'rgba(92, 142, 220, 0.10)', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: spacing.md },
  movementRowLast: { borderBottomWidth: 0 },
  movementIcon: { alignItems: 'center', borderRadius: radii.md, height: 32, justifyContent: 'center', marginRight: spacing.md, width: 32 },
  incomingBg: { backgroundColor: colors.purpleAlpha20 },
  outgoingBg: { backgroundColor: colors.orangeAlpha20 },
  movementCopy: { flex: 1 },
  movementTitle: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13 },
  movementDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  movementValue: { ...typography.bodyMedium, fontSize: 13 },
  incoming: { color: colors.purple400 },
  outgoing: { color: colors.orange400 },
  emptyMovements: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  monthRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  monthChip: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  monthChipText: { ...typography.caption, color: colors.purple300 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCol: { flex: 1 },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  summaryPositive: { ...typography.bodyMedium, color: colors.success, marginTop: spacing.xs },
  summaryNegative: { ...typography.bodyMedium, color: colors.orange400, marginTop: spacing.xs },
  summaryNeutral: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: spacing.xs },
  chartRow: { flexDirection: 'row', marginTop: spacing.lg },
  chartAxis: { height: 130, justifyContent: 'space-between', marginRight: spacing.sm },
  axisLabel: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  chartDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 30, marginTop: spacing.xs },
  axisDay: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  accountHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  flagEmoji: { fontSize: 22 },
  field: { borderBottomColor: 'rgba(92, 142, 220, 0.10)', borderBottomWidth: 1, paddingVertical: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.textSecondary },
  fieldValueRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  fieldValue: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  copyButton: { alignItems: 'center', height: 28, justifyContent: 'center', marginLeft: spacing.sm, width: 28 },
  rateRow: { flexDirection: 'row', paddingVertical: spacing.xs },
  rateCol: { flex: 1 },
  rateDivider: { backgroundColor: 'rgba(92, 142, 220, 0.10)', marginHorizontal: spacing.lg, width: 1 },
  rateLabel: { ...typography.caption, color: colors.textSecondary },
  rateValue: { ...typography.heading3, color: colors.textPrimary, marginTop: spacing.xs },
  rateNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  directionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  directionChip: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, flex: 1, paddingVertical: spacing.sm },
  directionChipActive: { borderColor: colors.purple500, shadowColor: '#5946C8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 3 },
  directionText: { ...typography.caption, color: colors.textSecondary },
  directionTextActive: { color: colors.purple300, fontWeight: '700' },
  input: { backgroundColor: 'rgba(16, 51, 85, 0.72)', borderColor: 'rgba(92, 142, 220, 0.08)', borderRadius: radii.md, borderWidth: 1, color: colors.textPrimary, fontSize: 14, minHeight: 52, paddingHorizontal: spacing.lg },
  convertButton: { marginTop: spacing.md },
  resultBox: { alignItems: 'center', borderTopColor: 'rgba(92, 142, 220, 0.10)', borderTopWidth: 1, marginTop: spacing.lg, paddingTop: spacing.lg },
  resultLabel: { ...typography.caption, color: colors.textSecondary },
  resultValue: { ...typography.display, color: colors.textPrimary, marginTop: spacing.xs },
  resultNote: { ...typography.caption, color: colors.orange400, marginTop: spacing.sm, textAlign: 'center' },
  footer: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.md },
  footerText: { ...typography.caption, color: colors.textMuted },
});
