import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ServiceScreenLayout from '../../../components/services/ServiceScreenLayout';
import LineTrendChart from '../../../components/investments/LineTrendChart';
import { Card, Icon, MissingDataState } from '../../../components/ui';
import { formatStatementAmount } from '../../../utils/statementUtils';
import { buildEvolutionSeries, recentMonthLabels } from '../../../utils/investmentEvolution';
import { colors, radii, shadows, spacing, typography } from '../../../theme';

const TABS = [{ id: 'overview', label: 'Visão geral' }, { id: 'movements', label: 'Movimentações' }, { id: 'details', label: 'Detalhes' }];
const IR_RATE = 0.15;
const EVOLUTION_MONTHS = recentMonthLabels(6);

function money(value) { return `R$ ${formatStatementAmount(value)}`; }
function percent(value) { return `${value.toFixed(2).replace('.', ',')}%`; }
// Rótulos de eixo compactos ("R$45k") — números completos ali ficam
// poluídos; o valor exato já aparece no callout do próprio gráfico.
function moneyCompact(value) { return value >= 1000 ? `R$${Math.round(value / 1000)}k` : money(value); }

function InfoRow({ label, last, value }) {
  return <View style={[styles.infoRow, last && styles.infoRowLast]}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

export default function InvestmentPositionDetailScreen({ navigation, route }) {
  const position = route.params?.position;
  const [tab, setTab] = useState('overview');
  const backgroundSource = require('../../../../assets/ctbx-investments-background.png');
  if (!position) return <ServiceScreenLayout navigation={navigation} title="Investimentos"><MissingDataState navigation={navigation} title="Investimentos" /></ServiceScreenLayout>;

  const current = position.invested + position.yieldAmount;
  const irEstimate = position.yieldAmount * IR_RATE;
  const evolutionPoints = buildEvolutionSeries(position.invested, current, EVOLUTION_MONTHS.length);
  const evolutionMin = Math.min(position.invested, ...evolutionPoints) * 0.97;
  const evolutionMax = Math.max(current, ...evolutionPoints) * 1.03;
  const redeem = () => Alert.alert('Resgate no vencimento', 'O resgate antecipado real depende da integração com a custódia. Nesta demonstração, o resgate só é simulado na tela de simulação de novos investimentos.');

  return (
    <ServiceScreenLayout atmospheric backgroundSource={backgroundSource} navigation={navigation} title="Investimentos">
      <Card elevated={false} style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}><Icon color={colors.purple300} name={position.icon} size={22} /></View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerName}>{position.name}</Text>
            <Text style={styles.headerStatus}>{position.status}</Text>
          </View>
          <View style={styles.rateBadge}><Text style={styles.rateBadgeText}>{position.rateLabel}</Text></View>
        </View>
        <View style={styles.headerGridRow}>
          <View style={styles.headerGridCell}><Text style={styles.headerGridLabel}>Valor investido</Text><Text style={styles.headerGridValue}>{money(position.invested)}</Text></View>
          <View style={styles.headerGridCell}><Text style={styles.headerGridLabel}>Valor atual</Text><Text style={styles.headerGridValue}>{money(current)}</Text></View>
        </View>
        <View style={styles.headerGridRow}>
          <View style={styles.headerGridCell}><Text style={styles.headerGridLabel}>Rendimento</Text><Text style={styles.headerGridPositive}>{money(position.yieldAmount)} ({percent(position.yieldPercent)})</Text></View>
          <View style={styles.headerGridCell}><Text style={styles.headerGridLabel}>Rentabilidade</Text><Text style={styles.headerGridPositive}>{percent(position.yieldPercent)}</Text></View>
        </View>
      </Card>

      <View style={styles.tabsRow}>
        {TABS.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={[styles.tabChip, tab === item.id && styles.tabChipActive]}>
            <Text numberOfLines={1} style={[styles.tabChipText, tab === item.id && styles.tabChipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' ? (
        <>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeading}>Evolução do investimento</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => Alert.alert('Período', 'A seleção de outros períodos ainda não está disponível nesta demonstração.')} style={styles.periodChip}>
              <Text style={styles.periodChipText}>Últimos 6 meses</Text>
              <Icon color={colors.purple300} name="chevron-down-outline" size={14} />
            </TouchableOpacity>
          </View>
          <Card elevated={false} style={styles.card}>
            <View style={styles.chartCallout}><Text style={styles.chartCalloutText}>{money(current)}</Text></View>
            <View style={styles.chartRow}>
              <View style={styles.chartAxis}>
                <Text style={styles.axisLabel}>{moneyCompact(evolutionMax)}</Text>
                <Text style={styles.axisLabel}>{moneyCompact((evolutionMax + evolutionMin) / 2)}</Text>
                <Text style={styles.axisLabel}>{moneyCompact(evolutionMin)}</Text>
              </View>
              <LineTrendChart max={evolutionMax} min={evolutionMin} points={evolutionPoints} />
            </View>
            <View style={styles.chartMonthsRow}>
              {EVOLUTION_MONTHS.map((month) => <Text key={month} style={styles.axisMonth}>{month}</Text>)}
            </View>
          </Card>

          <Text style={styles.sectionHeading}>Informações do investimento</Text>
          <Card elevated={false} style={styles.card}>
            <InfoRow label="Produto" value={position.name} />
            <InfoRow label="Indexador" value={position.indexer} />
            <InfoRow label="Taxa" value={position.rateLabel} />
            <InfoRow label="Data da aplicação" value={position.appliedAt} />
            <InfoRow label="Vencimento" value={position.maturity} />
            <InfoRow label="Prazo" value={position.term} />
            <InfoRow label="Pagamento de juros" value={position.interestPayment} />
            <InfoRow label="Próximo pagamento" value={position.nextPayment} />
            <InfoRow last label="Liquidez" value={position.liquidity} />
          </Card>

          <Text style={styles.sectionHeading}>Resumo financeiro</Text>
          <Card elevated={false} style={styles.card}>
            <InfoRow label="Valor investido" value={money(position.invested)} />
            <InfoRow label="Rendimento bruto" value={money(position.yieldAmount)} />
            <InfoRow last label="IR estimado" value={`- ${money(irEstimate)}`} />
            <View style={styles.divider} />
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Valor atual</Text><Text style={styles.totalValue}>{money(current)}</Text></View>
          </Card>

          <TouchableOpacity accessibilityRole="button" onPress={redeem} style={styles.redeemButton}>
            <Icon color={colors.purple300} name="calendar-outline" size={17} />
            <Text style={styles.redeemButtonText}>Resgatar no vencimento</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {tab === 'movements' ? (
        <Card elevated={false} style={styles.card}>
          <View style={styles.movementRow}>
            <View style={styles.movementIcon}><Icon color={colors.purple400} name="arrow-down" size={17} /></View>
            <View style={styles.movementCopy}><Text style={styles.movementTitle}>Aplicação inicial</Text><Text style={styles.movementDate}>{position.appliedAt}</Text></View>
            <Text style={styles.movementValuePositive}>{money(position.invested)}</Text>
          </View>
          {position.nextPayment !== '—' ? (
            <View style={[styles.movementRow, styles.movementRowLast]}>
              <View style={styles.movementIcon}><Icon color={colors.orange400} name="calendar-outline" size={17} /></View>
              <View style={styles.movementCopy}><Text style={styles.movementTitle}>Pagamento de juros previsto</Text><Text style={styles.movementDate}>{position.nextPayment} · {position.interestPayment}</Text></View>
              <Text style={styles.movementValueMuted}>Agendado</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {tab === 'details' ? (
        <Card elevated={false} style={styles.card}>
          <InfoRow label="Produto" value={position.name} />
          <InfoRow label="Indexador" value={position.indexer} />
          <InfoRow label="Taxa" value={position.rateLabel} />
          <InfoRow label="Data da aplicação" value={position.appliedAt} />
          <InfoRow label="Vencimento" value={position.maturity} />
          <InfoRow label="Prazo" value={position.term} />
          <InfoRow label="Pagamento de juros" value={position.interestPayment} />
          <InfoRow label="Próximo pagamento" value={position.nextPayment} />
          <InfoRow last label="Liquidez" value={position.liquidity} />
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Icon color={colors.textMuted} name="lock-closed-outline" size={13} />
        <Text style={styles.footerText}>Ambiente seguro · Seus dados estão protegidos</Text>
      </View>
    </ServiceScreenLayout>
  );
}

// "Dark glass": mesma linguagem visual do Extrato/Investimentos — fundo
// translúcido em vez de cor sólida, borda quase invisível, sombra própria,
// aba ativa marcada só por borda + glow.
const styles = StyleSheet.create({
  headerCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(99, 102, 241, 0.35)', borderWidth: 1, padding: spacing.lg, shadowColor: '#5946C8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 6 },
  headerRow: { alignItems: 'center', flexDirection: 'row' },
  headerIcon: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: radii.md, height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { flex: 1, marginLeft: spacing.md },
  headerName: { ...typography.heading3, color: colors.textPrimary },
  headerStatus: { ...typography.caption, color: colors.success, marginTop: 2 },
  rateBadge: { backgroundColor: 'rgba(16, 51, 85, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  rateBadgeText: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  headerGridRow: { flexDirection: 'row', marginTop: spacing.lg },
  headerGridCell: { flex: 1 },
  headerGridLabel: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  headerGridValue: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 15, marginTop: 2 },
  headerGridPositive: { ...typography.bodyMedium, color: colors.success, fontSize: 15, marginTop: 2 },
  tabsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  tabChip: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, flex: 1, paddingVertical: spacing.sm },
  tabChipActive: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(99, 102, 241, 0.55)', ...shadows.glowPurple },
  tabChipText: { ...typography.caption, color: colors.textSecondary, fontSize: 11, textAlign: 'center' },
  tabChipTextActive: { color: colors.purple300, fontWeight: '700' },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  sectionHeading: { ...typography.heading3, color: colors.textPrimary, marginTop: spacing.xl },
  periodChip: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  periodChipText: { ...typography.caption, color: colors.purple300 },
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, marginTop: spacing.md, padding: spacing.lg, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  chartCallout: { alignSelf: 'flex-end', backgroundColor: colors.purple500, borderRadius: radii.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  chartCalloutText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  chartRow: { flexDirection: 'row' },
  chartAxis: { height: 130, justifyContent: 'space-between', marginRight: spacing.sm },
  axisLabel: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  chartMonthsRow: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 46, marginTop: spacing.xs },
  axisMonth: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  infoRow: { borderBottomColor: 'rgba(92, 142, 220, 0.10)', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { ...typography.caption, color: colors.textMuted },
  infoValue: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13 },
  divider: { backgroundColor: 'rgba(92, 142, 220, 0.10)', height: 1, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
  totalLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  totalValue: { ...typography.heading3, color: colors.purple400 },
  redeemButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.lg, minHeight: 50 },
  redeemButtonText: { ...typography.button, color: colors.purple300 },
  movementRow: { alignItems: 'center', borderBottomColor: 'rgba(92, 142, 220, 0.10)', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: spacing.md },
  movementRowLast: { borderBottomWidth: 0 },
  movementIcon: { alignItems: 'center', backgroundColor: 'rgba(16, 51, 85, 0.72)', borderRadius: radii.md, height: 36, justifyContent: 'center', width: 36 },
  movementCopy: { flex: 1, marginLeft: spacing.md },
  movementTitle: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13 },
  movementDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  movementValuePositive: { ...typography.bodyMedium, color: colors.success, fontSize: 13 },
  movementValueMuted: { ...typography.caption, color: colors.textMuted },
  footer: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.xl },
  footerText: { ...typography.caption, color: colors.textMuted },
});
