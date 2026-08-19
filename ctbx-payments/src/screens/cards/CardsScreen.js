import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBar, EmptyState, ErrorState, Icon, LoadingState, Screen, SectionTitle } from '../../components/ui';
import FinancialCard from '../../components/cards/FinancialCard';
import VirtualCard from '../../components/cards/VirtualCard';
import { getCards, getVirtualCardsOverview } from '../../services/cardService';
import useAsyncResource from '../../hooks/useAsyncResource';
import { colors, radii, spacing, typography } from '../../theme';

const ACTIONS = [['Detalhes', 'CardDetails', 'information-circle-outline'], ['Ativar cartão', 'CardActivation', 'checkmark-circle-outline'], ['Recarregar', 'CardRecharge', 'add-circle-outline'], ['Trocar senha', 'CardPassword', 'key-outline'], ['Bloquear cartão', 'CardSecurity', 'lock-closed-outline'], ['Extrato', 'CardStatement', 'reader-outline'], ['Comprovantes', 'CardReceipts', 'receipt-outline'], ['Solicitar cartão', 'CardRequest', 'card-outline']];
const TABS = [['physical', 'Físico'], ['virtual', 'Virtual']];
const VIRTUAL_ACTIONS = [['Criar cartão virtual', 'add-circle-outline', 'create'], ['Gerenciar limites', 'options-outline', 'manage'], ['Bloquear cartão', 'lock-closed-outline', 'manage'], ['Mais opções', 'ellipsis-horizontal-circle-outline', 'manage']];
const EMPTY_VIRTUAL_OVERVIEW = { cards: [], pool: null };

export default function CardsScreen({ navigation, route }) {
  const [tab, setTab] = useState(route.params?.tab || 'physical');
  const { data: cards, error, loading, retry } = useAsyncResource(getCards, []);
  const { data: virtualOverview, error: virtualError, loading: virtualLoading, retry: retryVirtual } = useAsyncResource(getVirtualCardsOverview, EMPTY_VIRTUAL_OVERVIEW);
  // Cartão-alvo das ações rápidas ("Gerenciar limites"/"Bloquear cartão"/
  // "Mais opções") — nunca fixo no primeiro da lista. Tocar num cartão do
  // carrossel seleciona o alvo (sem navegar); tocar numa linha da lista
  // abaixo abre os detalhes dele direto. Sem seleção explícita ainda, cai
  // no primeiro só como valor inicial — mas assim que o usuário toca em
  // outro cartão, o alvo muda de verdade.
  const [selectedVirtualCardId, setSelectedVirtualCardId] = useState(null);

  if (loading) return <Screen><LoadingState label="Carregando cartões…" /></Screen>;
  if (error) return <Screen><ErrorState message="Não foi possível carregar os cartões." onRetry={retry} /></Screen>;
  if (!cards.length) return <Screen><EmptyState message="Nenhum cartão disponível." /></Screen>;
  const [financialCard, transportCard] = cards;
  const virtualCards = virtualOverview?.cards || [];
  const pool = virtualOverview?.pool;
  const activeVirtualCardId = virtualCards.some((item) => item.id === selectedVirtualCardId) ? selectedVirtualCardId : virtualCards[0]?.id;
  const activeVirtualCard = virtualCards.find((item) => item.id === activeVirtualCardId);

  const openSelectedVirtualCard = () => {
    if (!activeVirtualCardId) return Alert.alert('Nenhum cartão virtual ainda', 'Crie um cartão virtual primeiro.');
    navigation.navigate('CardVirtualDetails', { cardId: activeVirtualCardId });
  };

  return (
    <Screen atmospheric backgroundSource={require('../../../assets/ctbx-investments-background.png')} gradient={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus cartões</Text>
        <Text style={styles.sub}>Gerencie seus cartões CTBX</Text>
      </View>
      <View style={styles.tabsRow}>
        {TABS.map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setTab(id)} style={[styles.tabChip, tab === id && styles.tabChipActive]}>
            <Text style={[styles.tabChipText, tab === id && styles.tabChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.bodyContent} style={styles.body} showsVerticalScrollIndicator={false}>
        {tab === 'physical' ? (
          <>
            <FinancialCard card={financialCard} />
            <Text style={styles.balance}>Saldo disponível  <Text style={styles.amount}>{financialCard.balance}</Text></Text>
            <SectionTitle title="Serviços do cartão" />
            <View style={styles.grid}>
              {ACTIONS.map(([label, screen, icon]) => (
                <TouchableOpacity key={screen} onPress={() => navigation.navigate(screen)} style={styles.action}>
                  <Icon color={colors.purple400} name={icon} size={22} />
                  <Text style={styles.actionText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {transportCard ? (
              <>
                <SectionTitle title="Cartão de transporte" />
                <TouchableOpacity accessibilityLabel="Abrir cartão de transporte" onPress={() => navigation.navigate('TransportCard')} style={styles.transport}>
                  <Image resizeMode="cover" source={require('../../../assets/ctbx-card-transport.png')} style={styles.transportImage} />
                </TouchableOpacity>
              </>
            ) : null}
          </>
        ) : virtualLoading ? (
          <LoadingState label="Carregando cartões virtuais…" />
        ) : virtualError ? (
          <ErrorState message="Não foi possível carregar os cartões virtuais." onRetry={retryVirtual} />
        ) : (
          <>
            {pool ? (
              <View style={styles.poolCard}>
                <Text style={styles.poolLabel}>Limite disponível</Text>
                <Text style={styles.poolAvailable}>{pool.available}</Text>
                <View style={styles.poolBarTrack}>
                  <View style={[styles.poolBarFill, { width: `${pool.totalMinor ? Math.min(100, Math.round((pool.allocatedMinor / pool.totalMinor) * 100)) : 0}%` }]} />
                </View>
                <Text style={styles.poolTotal}>Limite total: {pool.total}</Text>
              </View>
            ) : null}
            <SectionTitle title="Ações rápidas" />
            {activeVirtualCard ? (
              <Text style={styles.quickActionsTarget}>Para: {activeVirtualCard.nickname || `•••• ${activeVirtualCard.lastFour}`}</Text>
            ) : null}
            <View style={styles.grid}>
              {VIRTUAL_ACTIONS.map(([label, icon, kind]) => (
                <TouchableOpacity key={label} onPress={() => (kind === 'create' ? navigation.navigate('CardVirtualCreate') : openSelectedVirtualCard())} style={styles.action}>
                  <Icon color={colors.purple400} name={icon} size={22} />
                  <Text style={styles.actionText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {virtualCards.length ? (
              <>
                <SectionTitle title="Seus cartões virtuais" />
                <Text style={styles.carouselHint}>Toque num cartão pra escolher o alvo das ações rápidas acima.</Text>
                <ScrollView contentContainerStyle={styles.carousel} horizontal showsHorizontalScrollIndicator={false}>
                  {virtualCards.map((item) => (
                    <TouchableOpacity key={item.id} onPress={() => setSelectedVirtualCardId(item.id)} style={[styles.carouselItem, item.id === activeVirtualCardId && styles.carouselItemActive]}>
                      <VirtualCard card={item} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.virtualList}>
                  {virtualCards.map((item) => (
                    <TouchableOpacity key={item.id} onPress={() => navigation.navigate('CardVirtualDetails', { cardId: item.id })} style={styles.virtualRow}>
                      <View style={styles.virtualRowSwatch}><Icon color={colors.textPrimary} name="card-outline" size={18} /></View>
                      <View style={styles.virtualRowInfo}>
                        <Text numberOfLines={1} style={styles.virtualRowTitle}>{item.nickname || `•••• ${item.lastFour}`}</Text>
                        <Text style={styles.virtualRowSub}>{item.status}</Text>
                      </View>
                      <Icon color={colors.textMuted} name="chevron-forward" size={18} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <EmptyState message="Nenhum cartão virtual ainda — crie o primeiro nas ações rápidas acima." />
            )}
          </>
        )}
      </ScrollView>
      <BottomTabBar activeKey="cards" onTabPress={(item) => { if (item.key === 'home') navigation.navigate('Home'); if (item.key === 'services') navigation.navigate('Services'); if (item.key === 'pix') navigation.navigate('Pix'); if (item.key === 'profile') navigation.navigate('Profile'); }} />
    </Screen>
  );
}

// "Dark glass": mesma linguagem visual do Extrato/Investimentos/Home — fundo
// translúcido em vez de cor sólida, borda quase invisível, sombra própria.
const styles = StyleSheet.create({
  header: { backgroundColor: 'transparent', padding: spacing.xl, paddingBottom: spacing.md },
  title: { ...typography.heading1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  tabsRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xl },
  tabChip: { alignItems: 'center', borderRadius: radii.pill, flex: 1, paddingVertical: spacing.sm },
  tabChipActive: { backgroundColor: colors.purple500 },
  tabChipText: { ...typography.caption, color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabChipTextActive: { color: colors.white, fontWeight: '700' },
  body: { backgroundColor: 'transparent', flex: 1 },
  bodyContent: { backgroundColor: 'transparent', paddingBottom: spacing.xxxl, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  balance: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.lg },
  amount: { color: colors.textPrimary, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  action: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: 16, borderWidth: 1, minHeight: 88, padding: spacing.md, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4, width: '48%' },
  actionText: { color: colors.textPrimary, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  transport: { aspectRatio: 1638 / 960, borderColor: colors.purple400, borderRadius: 20, borderWidth: 1, marginBottom: spacing.lg, overflow: 'hidden', width: '100%' },
  transportImage: { height: '100%', width: '100%' },
  poolCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: 16, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
  poolLabel: { ...typography.caption, color: colors.textSecondary },
  poolAvailable: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 2 },
  poolBarTrack: { backgroundColor: colors.whiteAlpha08, borderRadius: 999, height: 6, marginTop: spacing.md, overflow: 'hidden', width: '100%' },
  poolBarFill: { backgroundColor: colors.purple400, borderRadius: 999, height: '100%' },
  poolTotal: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  quickActionsTarget: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs, marginTop: -spacing.xs },
  carouselHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  carousel: { gap: spacing.md, paddingBottom: spacing.md, paddingRight: spacing.md },
  carouselItem: { borderRadius: radii.xl, width: 280 },
  carouselItemActive: { borderColor: colors.purple400, borderWidth: 2 },
  virtualList: { gap: spacing.sm, marginBottom: spacing.lg },
  virtualRow: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  virtualRowSwatch: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  virtualRowInfo: { flex: 1 },
  virtualRowTitle: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '700' },
  virtualRowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
