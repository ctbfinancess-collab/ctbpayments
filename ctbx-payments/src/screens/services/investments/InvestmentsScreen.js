import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import ServiceScreenLayout from '../../../components/services/ServiceScreenLayout';
import LineTrendChart from '../../../components/investments/LineTrendChart';
import { Card, Icon, LoadingState, ErrorState } from '../../../components/ui';
import { getInvestmentPositions, getInvestmentProducts } from '../../../services/investmentService';
import useAsyncResource from '../../../hooks/useAsyncResource';
import { formatStatementAmount } from '../../../utils/statementUtils';
import { recentMonthLabels } from '../../../utils/investmentEvolution';
import { colors, radii, shadows, spacing, typography } from '../../../theme';

const TABS = [{ id: 'positions', label: 'Meus investimentos' }, { id: 'return', label: 'Rentabilidade' }];
const CDI_RATE = 10.40;
const RENTABILITY_MONTHS = recentMonthLabels(7);
// Trajetória agregada estrutural/demonstrativa terminando na rentabilidade
// real calculada abaixo (não são cotações reais).
const RENTABILITY_MIN = -4;
const RENTABILITY_MAX = 12;

const PORTFOLIO_COLORS = [colors.purple500, '#3B82F6', colors.orange500, '#2DD4BF'];

function money(value) { return `R$ ${formatStatementAmount(value)}`; }
function percent(value) { return `${value.toFixed(2).replace('.', ',')}%`; }

// Barras ascendentes + seta de tendência — ilustração do card de saldo,
// igual à referência (bar chart + arrow), desenhada em SVG.
function GrowthGlyph({ size = 54 }) {
  return (
    <Svg height={size} viewBox="0 0 64 64" width={size}>
      <Rect fill={colors.purpleAlpha20} height="18" rx="3" width="10" x="2" y="46" />
      <Rect fill={colors.purpleAlpha45} height="28" rx="3" width="10" x="18" y="36" />
      <Rect fill={colors.purple400} height="38" rx="3" width="10" x="34" y="26" />
      <Rect fill={colors.purple300} height="48" rx="3" width="10" x="50" y="16" />
      <Path d="M4 44 L20 30 L36 22 L52 8" fill="none" stroke={colors.purple300} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <Path d="M44 8 L54 6 L56 16" fill="none" stroke={colors.purple300} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </Svg>
  );
}

function PortfolioDonut({ positions, size = 148, strokeWidth = 20, total }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  return (
    <Svg height={size} width={size}>
      <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={colors.whiteAlpha08} strokeWidth={strokeWidth} />
        {positions.map((position, index) => {
          const share = position.invested / total;
          const length = circumference * share;
          const dashoffset = -cumulative;
          cumulative += length;
          return (
            <Circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              key={position.id}
              r={radius}
              stroke={PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashoffset}
              strokeWidth={strokeWidth}
            />
          );
        })}
      </G>
    </Svg>
  );
}

function PositionRow({ onPress, position }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.positionCard}>
      <View style={styles.positionHeaderRow}>
        <View style={styles.positionIcon}><Icon color={colors.purple300} name={position.icon} size={20} /></View>
        <View style={styles.positionHeaderCopy}>
          <Text style={styles.positionName}>{position.name}</Text>
          <Text style={styles.positionStatus}>{position.status}</Text>
        </View>
        <Icon color={colors.textMuted} name="chevron-forward" size={18} />
      </View>
      <View style={styles.positionGridRow}>
        <View style={styles.positionGridCell}>
          <Text style={styles.positionGridLabel}>Valor investido</Text>
          <Text style={styles.positionGridValue}>{money(position.invested)}</Text>
        </View>
        <View style={styles.positionGridCell}>
          <Text style={styles.positionGridLabel}>Rentabilidade</Text>
          <Text style={styles.positionGridValue}>{position.rateLabel}</Text>
        </View>
      </View>
      <View style={styles.positionGridRow}>
        <View style={styles.positionGridCell}>
          <Text style={styles.positionGridLabel}>Rendimento</Text>
          <Text style={styles.positionGridPositive}>{money(position.yieldAmount)} ({percent(position.yieldPercent)})</Text>
        </View>
        <View style={styles.positionGridCell}>
          <Text style={styles.positionGridLabel}>Vencimento</Text>
          <Text style={styles.positionGridValue}>{position.maturity}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function InvestmentsScreen({ navigation }) {
  const { data: positions, error: positionsError, loading: positionsLoading, retry: retryPositions } = useAsyncResource(getInvestmentPositions, []);
  const { data: products } = useAsyncResource(getInvestmentProducts, []);
  const [tab, setTab] = useState('positions');
  const [visible, setVisible] = useState(true);
  const backgroundSource = require('../../../../assets/ctbx-investments-background.png');

  const totalInvested = positions.reduce((sum, p) => sum + p.invested, 0);
  const totalYield = positions.reduce((sum, p) => sum + p.yieldAmount, 0);
  const totalYieldPercent = totalInvested ? (totalYield / totalInvested) * 100 : 0;
  const averageYieldPercent = positions.length ? positions.reduce((sum, p) => sum + p.yieldPercent, 0) / positions.length : 0;
  const rentabilityPoints = Array.from({ length: RENTABILITY_MONTHS.length }, (_, index) => {
    const t = index / (RENTABILITY_MONTHS.length - 1);
    return totalYieldPercent * t + Math.sin(t * Math.PI * 1.3) * 1.5;
  });

  const openPosition = (position) => navigation.navigate('InvestmentPositionDetail', { position });
  const openFirstProduct = () => (products[0] ? navigation.navigate('InvestmentSimulation', { product: products[0] }) : Alert.alert('Sem produtos disponíveis', 'Nenhum produto de investimento está disponível nesta demonstração.'));

  if (positionsLoading) return <ServiceScreenLayout atmospheric backgroundSource={backgroundSource} navigation={navigation} title="Investimentos"><LoadingState /></ServiceScreenLayout>;
  if (positionsError) return <ServiceScreenLayout atmospheric backgroundSource={backgroundSource} navigation={navigation} title="Investimentos"><ErrorState onRetry={retryPositions} /></ServiceScreenLayout>;

  return (
    <ServiceScreenLayout atmospheric backgroundSource={backgroundSource} navigation={navigation} title="Investimentos">
      <Card elevated={false} style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <Text style={styles.summaryLabel}>Saldo investido</Text>
          <TouchableOpacity accessibilityLabel={visible ? 'Ocultar saldo' : 'Mostrar saldo'} onPress={() => setVisible((v) => !v)} style={styles.eyeButton}>
            <Icon color={colors.textSecondary} name={visible ? 'eye-outline' : 'eye-off-outline'} size={18} />
          </TouchableOpacity>
        </View>
        <View style={styles.summaryBodyRow}>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryValue}>{visible ? money(totalInvested) : 'R$ ••••••'}</Text>
            <Text style={styles.summaryYieldLabel}>Rendimento total</Text>
            <View style={styles.summaryYieldRow}>
              <Icon color={colors.success} name="arrow-up-outline" size={13} />
              <Text style={styles.summaryYieldText}>{visible ? `${money(totalYield)} (${percent(totalYieldPercent)})` : '••••'}</Text>
            </View>
          </View>
          <GrowthGlyph />
        </View>
      </Card>

      <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('ServiceInfo', { type: 'help' })} style={styles.banner}>
        <Icon color={colors.purple300} name="shield-checkmark-outline" size={20} />
        <Text style={styles.bannerText}>Invista com segurança e faça seu dinheiro render mais com a CTBX.</Text>
        <Icon color={colors.textMuted} name="chevron-forward" size={16} />
      </TouchableOpacity>

      <View style={styles.tabsRow}>
        {TABS.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={[styles.tabChip, tab === item.id && styles.tabChipActive]}>
            <Text style={[styles.tabChipText, tab === item.id && styles.tabChipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'positions' ? (
        <>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeadingInline}>Meus investimentos</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => Alert.alert('Meus investimentos', 'Todos os seus investimentos já estão listados aqui nesta demonstração.')}>
              <Text style={styles.sectionAction}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {positions.map((position) => <PositionRow key={position.id} onPress={() => openPosition(position)} position={position} />)}

          <TouchableOpacity accessibilityRole="button" onPress={openFirstProduct} style={styles.actionBanner}>
            <View style={styles.actionBannerIcon}><Icon color={colors.white} name="add-circle" size={22} /></View>
            <View style={styles.bannerCopy}>
              <Text style={styles.actionBannerTitle}>Investir mais</Text>
              <Text style={styles.actionBannerText}>Explore novas oportunidades e faça seu dinheiro crescer.</Text>
            </View>
            <Icon color={colors.textMuted} name="chevron-forward" size={18} />
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>Resumo da carteira</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Icon color={colors.purple300} name="wallet-outline" size={20} /><Text style={styles.statValue}>{money(totalInvested)}</Text><Text style={styles.statLabel}>Total investido</Text></View>
            <View style={styles.statCard}><Icon color={colors.success} name="trending-up-outline" size={20} /><Text style={styles.statValue}>{money(totalYield)}</Text><Text style={styles.statLabel}>Rendimento total</Text></View>
            <View style={styles.statCard}><Text style={styles.statPercentGlyph}>%</Text><Text style={styles.statValue}>{percent(averageYieldPercent)} a.a.</Text><Text style={styles.statLabel}>Rentabilidade média</Text></View>
            <View style={styles.statCard}><Icon color={colors.purple300} name="shield-checkmark-outline" size={20} /><Text style={styles.statValue}>{positions.length}</Text><Text style={styles.statLabel}>Investimentos ativos</Text></View>
          </View>

          <TouchableOpacity accessibilityRole="button" onPress={openFirstProduct} style={styles.actionBanner}>
            <View style={styles.actionBannerIcon}><Icon color={colors.white} name="calculator-outline" size={20} /></View>
            <View style={styles.bannerCopy}>
              <Text style={styles.actionBannerTitle}>Simular investimentos</Text>
              <Text style={styles.actionBannerText}>Veja projeções e compare opções.</Text>
            </View>
            <Icon color={colors.textMuted} name="chevron-forward" size={18} />
          </TouchableOpacity>
        </>
      ) : (
        <Card elevated={false} style={styles.card}>
          <Text style={styles.cardTitle}>Composição da carteira</Text>
          <View style={styles.portfolioRow}>
            <View style={styles.donutWrap}>
              <PortfolioDonut positions={positions} total={totalInvested} />
              <View pointerEvents="none" style={styles.donutCenter}>
                <Text style={styles.donutValue}>{visible ? money(totalInvested) : '••••'}</Text>
                <Text style={styles.donutLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.legend}>
              {positions.map((position, index) => (
                <View key={position.id} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length] }]} />
                  <View style={styles.legendCopy}>
                    <Text numberOfLines={1} style={styles.legendLabel}>{position.name}</Text>
                    <Text style={styles.legendValue}>{percent((position.invested / totalInvested) * 100)} · {money(position.invested)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rentabilityCompareRow}>
            <View>
              <Text style={styles.compareLabel}>Rentabilidade (12 meses)</Text>
              <Text style={styles.comparePositive}>+{percent(totalYieldPercent)}</Text>
            </View>
            <View>
              <Text style={styles.compareLabel}>CDI (12 meses)</Text>
              <Text style={styles.compareNeutral}>+{percent(CDI_RATE)}</Text>
            </View>
          </View>
          <View style={styles.chartRow}>
            <View style={styles.chartAxis}>
              <Text style={styles.axisLabel}>12%</Text>
              <Text style={styles.axisLabel}>8%</Text>
              <Text style={styles.axisLabel}>4%</Text>
              <Text style={styles.axisLabel}>0%</Text>
              <Text style={styles.axisLabel}>-4%</Text>
            </View>
            <LineTrendChart max={RENTABILITY_MAX} min={RENTABILITY_MIN} points={rentabilityPoints} />
          </View>
          <View style={styles.chartMonthsRow}>
            {RENTABILITY_MONTHS.map((month) => <Text key={month} style={styles.axisMonth}>{month}</Text>)}
          </View>
        </Card>
      )}

      <View style={styles.footer}>
        <Icon color={colors.textMuted} name="lock-closed-outline" size={13} />
        <Text style={styles.footerText}>Ambiente seguro · Seus dados estão protegidos</Text>
      </View>
    </ServiceScreenLayout>
  );
}

// "Dark glass": mesma linguagem visual do Extrato — fundo translúcido em vez
// de cor sólida, borda quase invisível, sombra própria, e a aba ativa
// marcada só por borda + glow (sem preenchimento roxo sólido).
const styles = StyleSheet.create({
  summaryCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(99, 102, 241, 0.35)', borderWidth: 1, overflow: 'hidden', padding: spacing.lg, shadowColor: '#5946C8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 6 },
  summaryTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...typography.body, color: colors.textSecondary },
  summaryBodyRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  summaryTextCol: { flex: 1 },
  summaryValue: { ...typography.display, color: colors.textPrimary },
  summaryYieldLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  summaryYieldRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  summaryYieldText: { ...typography.bodyMedium, color: colors.success },
  eyeButton: { alignItems: 'center', height: 28, justifyContent: 'center', width: 28 },
  banner: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, padding: spacing.md },
  bannerText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  bannerCopy: { flex: 1 },
  tabsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tabChip: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, flex: 1, paddingVertical: spacing.sm },
  tabChipActive: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(99, 102, 241, 0.55)', ...shadows.glowPurple },
  tabChipText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  tabChipTextActive: { color: colors.purple300, fontWeight: '700' },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  sectionHeading: { ...typography.heading3, color: colors.textPrimary, marginTop: spacing.xl },
  sectionHeadingInline: { ...typography.heading3, color: colors.textPrimary },
  sectionAction: { ...typography.label, color: colors.purple300 },
  positionCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.lg, borderWidth: 1, marginTop: spacing.md, padding: spacing.lg, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  positionHeaderRow: { alignItems: 'center', flexDirection: 'row' },
  positionIcon: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: radii.md, height: 40, justifyContent: 'center', width: 40 },
  positionHeaderCopy: { flex: 1, marginLeft: spacing.md },
  positionName: { ...typography.bodyMedium, color: colors.textPrimary },
  positionStatus: { ...typography.caption, color: colors.success, marginTop: 2 },
  positionGridRow: { flexDirection: 'row', marginTop: spacing.md },
  positionGridCell: { flex: 1 },
  positionGridLabel: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  positionGridValue: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13, marginTop: 2 },
  positionGridPositive: { ...typography.bodyMedium, color: colors.success, fontSize: 13, marginTop: 2 },
  actionBanner: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, padding: spacing.md },
  actionBannerIcon: { alignItems: 'center', backgroundColor: colors.purple500, borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  actionBannerTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  actionBannerText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  statCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4, width: '47.5%' },
  statPercentGlyph: { color: colors.purple300, fontSize: 20, fontWeight: '700' },
  statValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: spacing.sm },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, padding: spacing.lg, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  cardTitle: { ...typography.heading3, color: colors.textPrimary },
  portfolioRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  donutWrap: { alignItems: 'center', height: 148, justifyContent: 'center', width: 148 },
  donutCenter: { alignItems: 'center', position: 'absolute' },
  donutValue: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13 },
  donutLabel: { ...typography.caption, color: colors.textMuted },
  legend: { flex: 1, gap: spacing.md },
  legendRow: { alignItems: 'center', flexDirection: 'row' },
  legendDot: { borderRadius: 4, height: 8, marginRight: spacing.sm, width: 8 },
  legendCopy: { flex: 1 },
  legendLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  legendValue: { ...typography.caption, color: colors.textMuted, fontSize: 10, marginTop: 1 },
  divider: { backgroundColor: 'rgba(92, 142, 220, 0.10)', height: 1, marginVertical: spacing.lg },
  rentabilityCompareRow: { flexDirection: 'row', gap: spacing.xxl },
  compareLabel: { ...typography.caption, color: colors.textMuted },
  comparePositive: { ...typography.heading3, color: colors.purple400, marginTop: 2 },
  compareNeutral: { ...typography.heading3, color: colors.textSecondary, marginTop: 2 },
  chartRow: { flexDirection: 'row', marginTop: spacing.lg },
  chartAxis: { height: 130, justifyContent: 'space-between', marginRight: spacing.sm },
  axisLabel: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  chartMonthsRow: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 30, marginTop: spacing.xs },
  axisMonth: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  footer: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.xl },
  footerText: { ...typography.caption, color: colors.textMuted },
});
