import React, { useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BottomTabBar,
  ErrorState,
  Icon,
  LoadingState,
  ModalSheet,
  PrimaryButton,
  Screen,
  ServiceCard,
} from '../components/ui';
import useAppWidth from '../hooks/useAppWidth';
import useAsyncResource from '../hooks/useAsyncResource';
import { isSandboxMode } from '../config';
import { getHomeData } from '../services/accountService';
import { getCards } from '../services/cardService';
import { listTransactions } from '../services/statementService';
import { colors, radii, spacing, typography } from '../theme';

// Skin visual exclusiva da Home, derivada da prancha oficial CTBX Payments.
// Mantida localmente para não alterar o visual das demais telas nesta etapa.
const HOME_VISUAL = {
  navy: '#0D1B2A',
  blue: '#0A2D5E',
  violet: '#5E6BFF',
  orange: '#FF8A00',
  ice: '#F2F5F8',
  textSecondary: '#B9C5D4',
  surface: 'rgba(11, 28, 51, 0.94)',
  surfaceElevated: 'rgba(14, 38, 67, 0.96)',
  surfaceBlue: 'rgba(10, 45, 94, 0.88)',
  surfaceViolet: 'rgba(30, 35, 83, 0.94)',
  border: 'rgba(91, 135, 187, 0.24)',
  borderStrong: 'rgba(94, 107, 255, 0.42)',
  violetSoft: 'rgba(94, 107, 255, 0.14)',
  whiteSoft: 'rgba(242, 245, 248, 0.08)',
  // "Dark glass": mesma linguagem visual do Extrato/Investimentos — fundo
  // translúcido em vez de cor quase sólida, borda quase invisível. Usado nos
  // cards de conteúdo (tiles, ícones de acesso rápido, banners, listas);
  // o card de saldo e os cartões (arte própria) continuam com o tratamento
  // "hero" que já tinham.
  glass: 'rgba(12, 43, 76, 0.6)',
  glassStrong: 'rgba(12, 43, 76, 0.72)',
  glassBorder: 'rgba(92, 142, 220, 0.10)',
};

const HOME_CARD_SHADOW = {
  elevation: 5,
  shadowColor: '#020914',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 18,
};

const PAYMENT_CARD_ASPECT_RATIO = 1638 / 960;

// Selo/ícone e cor de cada conta do carrossel multicurrency — badge circular
// com o símbolo da moeda (sem bandeiras de país, conceito financeiro
// internacional) e uma cor de destaque (`accent`) usada na borda/glow e na
// linha inferior quando a conta está selecionada. Investimentos usa um
// ícone de gráfico/tendência em vez de símbolo de moeda. Ver
// BALANCE_TILE_FALLBACK para ids fora desta lista (ex.: contas SANDBOX
// ainda não mapeadas, como 'credit').
const BALANCE_TILE_META = {
  digital: { symbol: 'R$', tint: '#1F8B4C', accent: '#3DDC7A' },
  usd: { symbol: 'US$', tint: '#8A6A12', accent: '#F2C94C' },
  eur: { symbol: '€', tint: '#4B2E83', accent: '#A78BFA' },
  aed: { symbol: 'AED', tint: '#0E5C63', accent: '#2DD4CF' },
  investment: { icon: 'trending-up-outline', tint: '#2B2E86', accent: '#7C8CFF' },
};
const BALANCE_TILE_FALLBACK = { icon: 'wallet-outline', tint: '#1E2353', accent: HOME_VISUAL.violet };
// Tela de destino ao tocar em cada tile de saldo. Contas globais (USD/EUR/
// AED) abrem a tela de conta global (câmbio, conversão e dados da conta).
const BALANCE_TILE_ROUTE = { digital: 'Statement', investment: 'Investments', usd: 'GlobalAccount', eur: 'GlobalAccount', aed: 'GlobalAccount' };
const BALANCE_TILE_WIDTH = 132;

const HOME_PROMOTION_CARDS = [
  { id: 'salary_advance', audience: 'PF', title: 'Antecipação Salarial', text: 'Seu salário não precisa esperar o dia 5. Antecipe até R$ 1.200 do seu saldo hoje.', buttonText: 'Antecipar Agora', route: 'NavScreen176', image: require('../../assets/legacy/assets_images_credit_antecipacaosalarial.webp') },
  { id: 'working_capital', audience: 'PJ', title: 'Capital de Giro', text: 'Capital de Giro sob medida para a sua empresa crescer. Simule até R$ 50 mil em parcelas fixas.', buttonText: 'Simular Giro', route: 'NavScreen179', image: require('../../assets/legacy/assets_images_pj_capitalgiro.webp') },
  { id: 'refer_and_earn', audience: 'ALL', title: 'Indique e Ganhe', text: 'Amigo CTB vale ouro! Compartilhe seu código de indicação e ganhe R$ 20 de cashback após a ativação.', buttonText: 'Indicar Agora', route: 'NavScreen87', image: require('../../assets/legacy/assets_images_indique.jpg') },
];

function formatTransactionAmount(transaction) {
  const formatted = transaction.amountFormatted
    || Number(transaction.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${transaction.direction === 'entrada' ? '+' : '−'} R$ ${formatted}`;
}

function transactionIcon(transaction) {
  if (/pix/i.test(transaction.description || transaction.category)) return 'grid-outline';
  if (/pagamento|boleto/i.test(transaction.description || transaction.category)) return 'arrow-forward-outline';
  return 'card-outline';
}

// MOCK TEMPORARIO: estes valores serao substituidos pelos retornos da API original.
// MOCK TEMPORARIO: numero, titular, validade e saldo virao das APIs de cartoes.
const MOCK_CARDS = [
  {
    id: 'financial',
    type: 'FINANCEIRO',
    label: 'Mastercard - Crédito',
    lastFourDigits: '0000',
    holderName: 'CLIENTE DEMONSTRAÇÃO',
    expiration: '12/29',
    logo: require('../../assets/legacy/assets_images_master.png'),
  },
  {
    id: 'transport',
    type: 'TRANSPORTE',
    label: 'Cartão TOP',
    lastFourDigits: '0000',
    balance: 'R$ 38,50',
    logo: require('../../assets/legacy/assets_images_top.png'),
  },
];

const RECOVERED_TOP_BANNERS = [
  {
    id: 'banner_ganhador_video',
    eyebrow: 'Depoimento',
    title: 'Primeiro Ganhador SuperCTB',
    subtitle: 'Veja o depoimento da Ivonete, que faturou R$ 5.000,00!',
    ctaText: 'ASSISTA AGORA',
  },
];

// `icon` usa nomes do conjunto Ionicons (ver src/components/ui/Icon.js) e só é
// exibido quando o item não tem um `asset` próprio (ícone ilustrado legado).
const HOME_SECTIONS = [
  {
    title: 'Acesso rápido',
    items: [
      { key: 1, label: 'PIX', icon: 'flash-outline' },
      { key: 7, label: 'Transferências', icon: 'swap-horizontal-outline' },
      { key: 8, label: 'Pagar Conta', icon: 'document-text-outline' },
      { key: 10, label: 'Extrato', icon: 'reader-outline' },
    ],
  },
  {
    title: 'Serviços',
    items: [
      { key: 43, label: 'Recarga TOP', icon: 'bus-outline' },
      { key: 13, label: 'Comprovantes', icon: 'receipt-outline' },
      { key: 3, label: 'Investimentos', icon: 'trending-up-outline' },
    ],
  },
  {
    title: 'Produtos',
    items: [
      { key: 37, label: 'Antecipação Salarial', icon: 'cash-outline' },
      { key: 38, label: 'Benefícios', icon: 'gift-outline' },
      { key: 39, label: 'Crédito Consignado', icon: 'wallet-outline' },
    ],
  },
  {
    title: 'Empresas',
    items: [
      { key: 40, label: 'Capital de Giro', icon: 'briefcase-outline' },
      { key: 41, label: 'Antecipação de Recebíveis', icon: 'checkmark-done-outline' },
      { key: 42, label: 'POS Tapon', icon: 'phone-portrait-outline' },
      { key: 11, label: 'Cobrança', icon: 'repeat-outline' },
      { key: 22, label: 'Microcrédito Digital', icon: 'sparkles-outline' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { key: 26, label: 'Perfil', icon: 'person-outline' },
      { key: 27, label: 'Tarifas', icon: 'pricetag-outline' },
      { key: 30, label: 'Indicar Amigos', icon: 'people-outline' },
      { key: 31, label: 'Ajuda', icon: 'help-circle-outline' },
    ],
  },
];

const HOME_QUICK_ACTIONS = HOME_SECTIONS[0].items;
const HOME_SERVICE_ITEMS = [...HOME_SECTIONS[1].items, ...HOME_SECTIONS[2].items];

const HOME_MODAL_ITEMS = HOME_SECTIONS.flatMap((section) => section.items);
const HOME_ROUTE_BY_KEY = {
  1: ['Pix'], 3: ['Investments'], 7: ['Transfers'], 8: ['Payments'], 10: ['Statement'],
  11: ['BillingStart'], 13: ['ServiceReceipts'], 26: ['Profile'],
  27: ['ServiceInfo', { type: 'fees' }], 31: ['ServiceInfo', { type: 'help' }],
  39: ['ConsignedCredit'], 43: ['CardRecharge', { transport: true }],
};

// MOCK TEMPORARIO: no APK esta lista e recuperada do AsyncStorage por conta e
// posteriormente sincronizada com a API `favorito/novo`.
const INITIAL_FAVORITE_KEYS = [1, 7, 8, 10];

function FavoriteListRow({ item, selected, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.favoriteListRow}>
      <View style={styles.favoriteListIconArea}>
        <Icon color={HOME_VISUAL.violet} name={item.icon} size={22} />
      </View>
      <View style={styles.favoriteListTextArea}>
        <Text style={styles.favoriteListText}>{item.label}</Text>
      </View>
      <View style={styles.favoriteListActionArea}>
        <Icon color={selected ? colors.danger : HOME_VISUAL.violet} name={selected ? 'remove-circle' : 'add-circle'} size={23} />
      </View>
    </TouchableOpacity>
  );
}

function ServiceGrid({ items, editable = false, selectedKeys = [], onItemPress, onToggle }) {
  return (
    <View style={styles.modalGrid}>
      {items.map((item) => {
        const selected = selectedKeys.includes(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            disabled={!editable && !HOME_ROUTE_BY_KEY[item.key]}
            onPress={editable ? () => onToggle(item.key) : HOME_ROUTE_BY_KEY[item.key] ? () => onItemPress(item) : null}
            style={styles.modalGridItemWrapper}
          >
            <View style={styles.modalGridItem}>
              {editable ? (
                <Icon color={selected ? colors.danger : colors.success} name={selected ? 'remove-circle' : 'add-circle'} size={27} style={styles.gridActionIcon} />
              ) : null}
              <View style={styles.modalGridIconArea}>
                <Icon color={HOME_VISUAL.violet} name={item.icon} size={24} />
              </View>
              <Text numberOfLines={2} style={styles.modalGridText}>
                {item.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { data: homeData, error: homeError, loading: homeLoading, retry: retryHome } = useAsyncResource(getHomeData, { balances: [], summary: null });
  const { data: serviceCards, error: cardsError, loading: cardsLoading, retry: retryCards } = useAsyncResource(getCards, []);
  const { data: transactions } = useAsyncResource(listTransactions, []);
  const balances = homeData?.balances || [];
  const homeCards = isSandboxMode ? serviceCards.map((card) => card.type === 'TRANSPORT' ? { ...card, type: 'TRANSPORTE', label: 'Cartão TOP', lastFourDigits: card.lastFour, logo: require('../../assets/legacy/assets_images_top.png') } : { ...card, type: 'FINANCEIRO', label: `${card.brand} - Crédito`, lastFourDigits: card.lastFour, holderName: card.holder, expiration: card.expiry, logo: require('../../assets/legacy/assets_images_master.png') }) : MOCK_CARDS;
  const width = useAppWidth();
  const balanceTilesRef = useRef(null);
  const balanceScrollX = useRef(0);
  // Medidas reais do carrossel (não uma aproximação por padding/spacing) —
  // só assim a seta ">" consegue calcular corretamente o quanto falta
  // rolar pra revelar o último card (Investimentos), em qualquer tamanho
  // de tela. `onLayout` dá a largura visível; `onContentSizeChange` dá a
  // largura total do conteúdo (5 tiles + margens).
  const balanceTilesViewportWidth = useRef(0);
  const balanceTilesContentWidth = useRef(0);
  const [selectedBalanceId, setSelectedBalanceId] = useState(balances[0]?.id);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showTransportBalance, setShowTransportBalance] = useState(true);
  // SANDBOX: exibe inicialmente o saldo disponível recebido do BFF para que o
  // teste integrado não confunda o saldo bloqueado com o saldo principal.
  // O controle de ocultar/mostrar permanece disponível e DEMO não é alterado.
  const [visibleBalances, setVisibleBalances] = useState(() => (
    isSandboxMode ? { digital: true } : {}
  ));
  const [favoriteKeys, setFavoriteKeys] = useState(INITIAL_FAVORITE_KEYS);
  const [favoritesCircleVisible, setFavoritesCircleVisible] = useState(false);
  const [favoritesSquareVisible, setFavoritesSquareVisible] = useState(false);
  const [moreServicesVisible, setMoreServicesVisible] = useState(false);

  const toggleBalance = (id) => {
    setVisibleBalances((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const scrollBalanceTiles = (direction) => {
    // Fallback (medidas ainda não chegaram via onLayout/onContentSizeChange
    // no primeiro render) usa a mesma aproximação de antes; assim que o
    // carrossel mede a si mesmo, os valores reais tomam conta.
    const viewportWidth = balanceTilesViewportWidth.current || (width - 108);
    const contentWidth = balanceTilesContentWidth.current || (BALANCE_TILE_WIDTH * balances.length + spacing.sm * Math.max(0, balances.length - 1));
    const maxX = Math.max(0, contentWidth - viewportWidth);
    const nextX = Math.max(0, Math.min(maxX, balanceScrollX.current + direction * BALANCE_TILE_WIDTH * 2));
    balanceTilesRef.current?.scrollTo({ x: nextX, animated: true });
  };

  const toggleFavorite = (key) => {
    setFavoriteKeys((current) =>
      current.includes(key)
        ? current.filter((favoriteKey) => favoriteKey !== key)
        : [...current, key],
    );
  };

  const favoriteItems = HOME_MODAL_ITEMS.filter((item) => favoriteKeys.includes(item.key));
  const otherItems = HOME_MODAL_ITEMS.filter((item) => !favoriteKeys.includes(item.key));
  const recentTransactions = (transactions || []).slice(0, 3);
  const visiblePromotionCards = HOME_PROMOTION_CARDS.filter((card) => card.audience === 'ALL' || card.audience === 'PF');

  if (homeLoading || cardsLoading) return <Screen><LoadingState label="Carregando conta…" /></Screen>;
  if (homeError) return <Screen><ErrorState message="Não foi possível carregar os dados da conta." onRetry={retryHome} /></Screen>;
  if (cardsError) return <Screen><ErrorState message="Não foi possível carregar os cartões." onRetry={retryCards} /></Screen>;

  return (
    <Screen atmospheric atmosphericVariant="homePremium" backgroundSource={require('../../assets/ctbx-home-background.png')} contentContainerStyle={styles.screenContent} gradient={false}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <View style={styles.headerLogoBadge}>
              <Image accessibilityLabel="CTBX Payments" resizeMode="contain" source={require('../../assets/ctbx-logo-official-transparent.png')} style={styles.headerLogo} />
            </View>
            <View>
              <Text style={styles.greeting}>Olá, {homeData.summary.displayName}</Text>
              <Text style={styles.greetingSubtitle}>Bem-vinda de volta!</Text>
            </View>
          </View>
          <TouchableOpacity accessibilityLabel="Notificações" activeOpacity={0.7} style={styles.headerAction}>
            <Icon color={colors.ice} name="notifications-outline" size={21} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          {balances.length ? (() => {
            const selectedBalance = balances.find((balance) => balance.id === selectedBalanceId) || balances[0];
            const selectedVisible = Boolean(visibleBalances[selectedBalance.id]);
            return (
              <View style={styles.balanceModule}>
                <View style={styles.balanceCard}>
                  <Image pointerEvents="none" resizeMode="cover" source={require('../../assets/ctbx-balance-card-background.png')} style={styles.balanceCardBackground} />
                  <View style={styles.balanceHeaderRow}>
                    <Text style={styles.balanceLabel}>Saldo disponível</Text>
                    <TouchableOpacity accessibilityLabel={selectedVisible ? 'Ocultar saldo' : 'Mostrar saldo'} onPress={() => toggleBalance(selectedBalance.id)} style={styles.balanceEyeButton}>
                      <Icon color={HOME_VISUAL.ice} name={selectedVisible ? 'eye-outline' : 'eye-off-outline'} size={19} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.balanceValue}>{selectedVisible ? `${selectedBalance.tag} ${selectedBalance.value}` : `${selectedBalance.tag} ••••••`}</Text>

                  <View style={styles.balanceTilesRow}>
                    <TouchableOpacity accessibilityLabel="Categorias anteriores" onPress={() => scrollBalanceTiles(-1)} style={styles.balanceTileNav}>
                      <Icon color={HOME_VISUAL.ice} name="chevron-back" size={18} />
                    </TouchableOpacity>
                    <ScrollView
                      ref={balanceTilesRef}
                      horizontal
                      bounces={false}
                      onContentSizeChange={(contentWidth) => { balanceTilesContentWidth.current = contentWidth; }}
                      onLayout={({ nativeEvent }) => { balanceTilesViewportWidth.current = nativeEvent.layout.width; }}
                      onScroll={({ nativeEvent }) => { balanceScrollX.current = nativeEvent.contentOffset.x; }}
                      scrollEventThrottle={16}
                      showsHorizontalScrollIndicator={false}
                      style={styles.balanceTilesScroll}
                    >
                      {balances.map((balance) => {
                        const selected = balance.id === selectedBalance.id;
                        const meta = BALANCE_TILE_META[balance.id] || BALANCE_TILE_FALLBACK;
                        return (
                          <TouchableOpacity
                            key={balance.id}
                            activeOpacity={0.85}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            onPress={() => {
                              setSelectedBalanceId(balance.id);
                              const route = BALANCE_TILE_ROUTE[balance.id];
                              if (route) navigation.navigate(route, { balance });
                            }}
                            style={[styles.balanceTile, selected && [styles.balanceTileSelected, { borderColor: meta.accent, shadowColor: meta.accent }]]}
                          >
                            <View style={[styles.balanceTileIcon, { backgroundColor: meta.tint }]}>
                              {meta.symbol ? <Text numberOfLines={1} style={styles.balanceTileIconSymbol}>{meta.symbol}</Text> : <Icon color={HOME_VISUAL.ice} name={meta.icon} size={20} />}
                            </View>
                            <Text numberOfLines={1} style={styles.balanceTileLabel}>{balance.description}</Text>
                            <Text numberOfLines={1} style={styles.balanceTileValue}>{selected && !selectedVisible ? '••••••' : `${balance.tag} ${balance.value}`}</Text>
                            {selected ? <View style={[styles.balanceTileUnderline, { backgroundColor: meta.accent }]} /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity accessibilityLabel="Próximas categorias" onPress={() => scrollBalanceTiles(1)} style={styles.balanceTileNav}>
                      <Icon color={HOME_VISUAL.orange} name="chevron-forward" size={18} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.balanceDots}>
                    {balances.map((balance) => (
                      <View key={balance.id} style={[styles.balanceDot, balance.id === selectedBalance.id && styles.balanceDotActive]} />
                    ))}
                  </View>
                </View>
              </View>
            );
          })() : null}

          <View style={styles.quickModule}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Acesso rápido</Text>
              <View style={styles.quickHeaderActions}>
                <TouchableOpacity accessibilityLabel="Gerenciar favoritos" onPress={() => setFavoritesCircleVisible(true)} style={styles.quickHeaderIcon}><Icon color={HOME_VISUAL.textSecondary} name="heart-outline" size={17} /></TouchableOpacity>
                <TouchableOpacity onPress={() => setFavoritesSquareVisible(true)}><Text style={styles.sectionAction}>Editar</Text></TouchableOpacity>
              </View>
            </View>
            <View style={styles.quickGrid}>
              {HOME_QUICK_ACTIONS.map((item) => {
                const [routeName, params] = HOME_ROUTE_BY_KEY[item.key];
                return <TouchableOpacity key={item.key} activeOpacity={0.78} onPress={() => navigation.navigate(routeName, params)} style={styles.quickItem}>
                  <View style={styles.quickIconBox}><Icon color={HOME_VISUAL.violet} name={item.icon} size={25} /></View>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.quickLabel}>{item.label}</Text>
                </TouchableOpacity>;
              })}
            </View>
          </View>

          <View style={styles.topBannerModule}>
            {RECOVERED_TOP_BANNERS.map((banner) => (
              <TouchableOpacity key={banner.id} activeOpacity={1} style={styles.topBannerShadow}>
                <View style={styles.topBannerCard}>
                  <View style={styles.topBannerContent}>
                    <Text style={styles.topBannerEyebrow}>{banner.eyebrow}</Text>
                    <Text numberOfLines={2} style={styles.topBannerTitle}>
                      {banner.title}
                    </Text>
                    <Text numberOfLines={3} style={styles.topBannerSubtitle}>
                      {banner.subtitle}
                    </Text>
                    <View style={styles.topBannerCta}>
                      <Icon color={colors.white} name="play" size={12} style={styles.playIcon} />
                      <Text style={styles.topBannerCtaText}>{banner.ctaText}</Text>
                    </View>
                  </View>
                  <View style={styles.topBannerArt}>
                    <LinearGradient colors={['#1230C9', '#0B1B3E', HOME_VISUAL.orange]} end={{ x: 1, y: 0.5 }} start={{ x: 0, y: 0.5 }} style={styles.topBannerPhone}>
                      <Icon color={colors.white} name="play" size={30} />
                    </LinearGradient>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cardsModule}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Meus cartões</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Cards')}><Text style={styles.sectionAction}>Ver todos</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal bounces={false} decelerationRate="fast" onMomentumScrollEnd={({ nativeEvent }) => setActiveCardIndex(Math.round(nativeEvent.contentOffset.x / (width * 0.88)))} scrollEventThrottle={16} showsHorizontalScrollIndicator={false} snapToAlignment="start" snapToInterval={width * 0.88} contentContainerStyle={styles.cardsScrollContent}>
              {homeCards.map((card) => <View key={card.id} style={[styles.cardSlide, { height: (width * 0.88 * 0.94) / PAYMENT_CARD_ASPECT_RATIO, width: width * 0.88 }]}>
                {card.type === 'FINANCEIRO' ? <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Cards')} style={[styles.cardFrame, styles.financialCard]}><Image accessibilityLabel={`Cartão CTBX final ${card.lastFourDigits}`} resizeMode="contain" source={require('../../assets/ctbx-card-financial.png')} style={styles.financialCardImage} /></TouchableOpacity> : <View style={[styles.cardFrame, styles.transportCard]}><Image accessibilityLabel={`Cartão de transporte CTBX final ${card.lastFourDigits}`} resizeMode="contain" source={require('../../assets/ctbx-card-transport.png')} style={styles.transportCardImage} />{!showTransportBalance ? <View pointerEvents="none" style={styles.transportHiddenBalance}><Text style={styles.transportHiddenBalanceText}>R$ •••••</Text></View> : null}<TouchableOpacity accessibilityLabel={showTransportBalance ? 'Ocultar saldo de transporte' : 'Mostrar saldo de transporte'} onPress={() => setShowTransportBalance((current) => !current)} style={styles.transportEyeHotspot} /><TouchableOpacity accessibilityLabel="Recarregar cartão de transporte" onPress={() => navigation.navigate('CardRecharge', { transport: true })} style={styles.transportRechargeHotspot} /></View>}
              </View>)}
            </ScrollView>
            <View style={styles.cardPagination}>{homeCards.map((card, index) => <View key={card.id} style={[styles.cardPaginationDot, index === activeCardIndex && styles.cardPaginationDotActive]} />)}</View>
          </View>

          <View style={styles.movementsModule}>
            <View style={styles.sectionHeadingRow}><Text style={styles.sectionHeading}>Últimas movimentações</Text><TouchableOpacity onPress={() => navigation.navigate('Statement')}><Text style={styles.sectionAction}>Ver todas</Text></TouchableOpacity></View>
            <View style={styles.movementsList}>{recentTransactions.map((transaction) => <TouchableOpacity key={transaction.id} activeOpacity={0.75} onPress={() => navigation.navigate('StatementDetail', { transaction })} style={styles.movementRow}><View style={styles.movementIcon}><Icon color={transaction.direction === 'entrada' ? HOME_VISUAL.violet : HOME_VISUAL.orange} name={transactionIcon(transaction)} size={20} /></View><View style={styles.movementText}><Text numberOfLines={1} style={styles.movementTitle}>{transaction.description}</Text><Text style={styles.movementDate}>{transaction.date} · {transaction.time}</Text></View><Text style={[styles.movementValue, transaction.direction === 'entrada' && styles.movementValueIn]}>{formatTransactionAmount(transaction)}</Text><Icon color={HOME_VISUAL.textSecondary} name="chevron-forward" size={17} /></TouchableOpacity>)}</View>
          </View>

          <View style={styles.servicesModule}>
            <View style={styles.sectionHeadingRow}><Text style={styles.sectionHeading}>Serviços</Text><TouchableOpacity onPress={() => setMoreServicesVisible(true)}><Text style={styles.sectionAction}>Ver todos</Text></TouchableOpacity></View>
            <View style={styles.homeServicesGrid}>{HOME_SERVICE_ITEMS.map((item) => <View key={item.key} style={styles.homeServiceWrapper}><ServiceCard icon={<Icon color={HOME_VISUAL.ice} name={item.icon} size={25} />} label={item.label} onPress={HOME_ROUTE_BY_KEY[item.key] ? () => { const [routeName, params] = HOME_ROUTE_BY_KEY[item.key]; navigation.navigate(routeName, params); } : () => navigation.navigate('Services')} style={styles.homeServiceTile} /></View>)}</View>
          </View>

          <View style={styles.campaignsModule}>
            <View style={styles.sectionHeadingRow}><Text style={styles.sectionHeading}>Campanhas</Text><TouchableOpacity onPress={() => navigation.navigate('Services')}><Text style={styles.sectionAction}>Ver todas</Text></TouchableOpacity></View>
            <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promotionScrollContent}>
              {visiblePromotionCards.map((promotion) => <TouchableOpacity key={promotion.id} activeOpacity={0.88} onPress={() => navigation.navigate('Services')} style={[styles.promotionCard, { width: width * 0.72 }]}><Image source={promotion.image} resizeMode="cover" style={styles.promotionImageArea} /><View style={styles.promotionContent}><Text numberOfLines={1} style={styles.promotionTitle}>{promotion.title}</Text><Text numberOfLines={2} style={styles.promotionText}>{promotion.text}</Text><View style={styles.promotionButton}><Text style={styles.promotionButtonText}>{promotion.buttonText}</Text></View></View></TouchableOpacity>)}
            </ScrollView>
          </View>
        </ScrollView>
        <BottomTabBar
          activeKey="home"
          renderIcon={(tab, active) => {
            const names = {
              home: ['home-outline', 'home'],
              cards: ['card-outline', 'card'],
              services: ['grid-outline', 'grid'],
              pix: ['flash-outline', 'flash'],
              profile: ['person-outline', 'person'],
            }[tab.key];
            return <Icon color={active ? HOME_VISUAL.violet : HOME_VISUAL.textSecondary} name={names[active ? 1 : 0]} size={20} />;
          }}
          variant="homePremium"
          onTabPress={(tab) => {
            if (tab.key === 'pix') navigation.navigate('Pix');
            if (tab.key === 'cards') navigation.navigate('Cards');
            if (tab.key === 'services') navigation.navigate('Services');
            if (tab.key === 'profile') navigation.navigate('Profile');
          }}
        />
      </View>

      <ModalSheet onClose={() => setFavoritesCircleVisible(false)} title="Atalhos de função" visible={favoritesCircleVisible}>
            <ScrollView bounces={false} contentContainerStyle={styles.circleModalContent}>
              <Text style={styles.circleModalSubtitle}>
                {'Adicione aos atalhos as funções \nque você mais ultiliza'}
              </Text>

              <View style={styles.circleModalSection}>
                <Text style={styles.circleModalSectionTitle}>Meus atalhos</Text>
                {favoriteItems.map((item) => (
                  <FavoriteListRow
                    key={item.key}
                    item={item}
                    onPress={() => toggleFavorite(item.key)}
                    selected
                  />
                ))}
              </View>

              <View style={styles.circleModalDivider} />

              <View style={styles.circleModalSection}>
                <Text style={styles.circleModalSectionTitle}>Outras funções</Text>
                {otherItems.map((item) => (
                  <FavoriteListRow
                    key={item.key}
                    item={item}
                    onPress={() => toggleFavorite(item.key)}
                  />
                ))}
              </View>

              <PrimaryButton onPress={() => setFavoritesCircleVisible(false)}>Salvar</PrimaryButton>
              <View style={styles.modalBottomSpace} />
            </ScrollView>
      </ModalSheet>

      <ModalSheet onClose={() => setFavoritesSquareVisible(false)} title="Funcionalidades" visible={favoritesSquareVisible}>
          <ScrollView bounces={false} contentContainerStyle={styles.darkModalContent}>
            <Text style={styles.darkModalSubtitle}>
              Acesse a função que deseja ou organize seus itens favoritos da tela inicial.
            </Text>
            <View style={styles.darkModalDivider} />

            <View style={styles.squareModalSectionPrimary}>
              <Text style={styles.darkModalSectionTitle}>Meus atalhos</Text>
              <ServiceGrid
                editable
                items={favoriteItems}
                onToggle={toggleFavorite}
                selectedKeys={favoriteKeys}
              />
            </View>

            <View style={styles.darkModalDivider} />

            <View style={styles.squareModalSectionSecondary}>
              <Text style={styles.darkModalSectionTitleSecondary}>Outras funções</Text>
              <ServiceGrid
                editable
                items={otherItems}
                onToggle={toggleFavorite}
                selectedKeys={favoriteKeys}
              />
            </View>

            <PrimaryButton onPress={() => setFavoritesSquareVisible(false)}>Salvar</PrimaryButton>
            <View style={styles.modalBottomSpace} />
          </ScrollView>
      </ModalSheet>

      <ModalSheet onClose={() => setMoreServicesVisible(false)} title="Funcionalidades" visible={moreServicesVisible}>
          <ScrollView bounces={false} contentContainerStyle={styles.darkModalContent}>
            <Text style={styles.darkModalSubtitle}>Acesse a função que deseja</Text>
            <View style={styles.darkModalDivider} />
            <View style={styles.moreServicesModalSection}>
              <ServiceGrid items={HOME_MODAL_ITEMS} onItemPress={(item) => { const [routeName, params] = HOME_ROUTE_BY_KEY[item.key]; setMoreServicesVisible(false); navigation.navigate(routeName, params); }} />
            </View>
          </ScrollView>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0 },
  safeArea: { backgroundColor: 'transparent', flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    minHeight: 92,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerIdentity: { alignItems: 'center', flexDirection: 'row' },
  headerLogoBadge: { height: 44, marginRight: spacing.md, width: 44 },
  headerLogo: { height: '100%', width: '100%' },
  greeting: { ...typography.heading2, color: HOME_VISUAL.ice, fontSize: 21, letterSpacing: -0.25 },
  greetingSubtitle: { ...typography.body, color: HOME_VISUAL.textSecondary, marginTop: 1 },
  headerAction: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  notificationDot: { backgroundColor: HOME_VISUAL.orange, borderRadius: 4, height: 7, position: 'absolute', right: 6, top: 6, width: 7 },
  scrollView: { backgroundColor: 'transparent', flex: 1 },
  content: { paddingBottom: spacing.xl },
  balanceModule: { marginTop: spacing.xs, paddingHorizontal: 18 },
  balanceCard: { borderColor: HOME_VISUAL.borderStrong, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', padding: spacing.lg, ...HOME_CARD_SHADOW },
  balanceCardBackground: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  balanceHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { ...typography.body, color: HOME_VISUAL.ice },
  balanceEyeButton: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
  balanceValue: { ...typography.display, color: HOME_VISUAL.ice, marginTop: spacing.xs },
  balanceTilesRow: { alignItems: 'center', flexDirection: 'row', marginTop: spacing.lg },
  balanceTileNav: { alignItems: 'center', borderColor: HOME_VISUAL.border, borderRadius: radii.pill, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  balanceTilesScroll: { flex: 1, marginHorizontal: spacing.sm },
  balanceTile: { backgroundColor: HOME_VISUAL.glass, borderColor: HOME_VISUAL.glassBorder, borderRadius: radii.md, borderWidth: 1, marginRight: spacing.sm, padding: spacing.md, width: BALANCE_TILE_WIDTH },
  // Destaque sutil por conta: a cor vem de `meta.accent` (inline, por
  // tile), aqui só a "receita" do glow — fina e discreta, sem exagerar.
  balanceTileSelected: { borderWidth: 1.5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 4 },
  balanceTileIcon: { alignItems: 'center', borderRadius: radii.pill, height: 36, justifyContent: 'center', marginBottom: spacing.sm, paddingHorizontal: 2, width: 36 },
  balanceTileIconSymbol: { color: HOME_VISUAL.ice, fontSize: 11, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center' },
  balanceTileLabel: { ...typography.caption, color: HOME_VISUAL.textSecondary, fontSize: 11 },
  balanceTileValue: { ...typography.bodyMedium, color: HOME_VISUAL.ice, fontSize: 12, marginTop: 2 },
  balanceTileUnderline: { backgroundColor: HOME_VISUAL.orange, borderRadius: 2, height: 3, marginTop: spacing.sm, width: '100%' },
  balanceDots: { alignSelf: 'center', flexDirection: 'row', marginTop: spacing.md },
  balanceDot: { backgroundColor: HOME_VISUAL.border, borderRadius: 3, height: 6, marginHorizontal: 3, width: 6 },
  balanceDotActive: { backgroundColor: HOME_VISUAL.orange, width: 16 },
  quickModule: { marginTop: 24, paddingHorizontal: 18 },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeading: { ...typography.heading3, color: HOME_VISUAL.ice, fontSize: 16 },
  sectionAction: { ...typography.bodyMedium, color: HOME_VISUAL.violet, fontSize: 13 },
  quickHeaderActions: { alignItems: 'center', flexDirection: 'row' },
  quickHeaderIcon: { marginRight: spacing.md, padding: 2 },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { alignItems: 'center', width: '24%' },
  quickIconBox: { alignItems: 'center', backgroundColor: HOME_VISUAL.glass, borderColor: HOME_VISUAL.glassBorder, borderRadius: 14, borderWidth: 1, height: 58, justifyContent: 'center', width: '88%' },
  quickLabel: { ...typography.caption, color: HOME_VISUAL.ice, fontSize: 10, marginTop: 7, textAlign: 'center', width: '100%' },
  cardsModule: { backgroundColor: 'transparent', paddingHorizontal: 18, paddingTop: 24 },
  cardsPanel: { backgroundColor: HOME_VISUAL.surface, borderColor: HOME_VISUAL.border, borderRadius: radii.xl, borderWidth: 1, paddingVertical: spacing.lg, ...HOME_CARD_SHADOW },
  moduleTitleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  moduleTitleIcon: { marginRight: spacing.sm },
  moduleTitle: { ...typography.heading3, color: HOME_VISUAL.ice },
  cardsScrollContent: { paddingRight: spacing.sm },
  cardSlide: { justifyContent: 'flex-start' },
  cardFrame: { aspectRatio: PAYMENT_CARD_ASPECT_RATIO, borderRadius: radii.xl, borderWidth: 1, marginRight: spacing.md, overflow: 'hidden', width: '94%', ...HOME_CARD_SHADOW },
  financialCard: { backgroundColor: HOME_VISUAL.navy, borderColor: HOME_VISUAL.borderStrong },
  financialCardImage: { borderRadius: radii.xl, height: '100%', width: '100%' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transportCard: { backgroundColor: HOME_VISUAL.surfaceViolet, borderColor: HOME_VISUAL.borderStrong },
  transportCardImage: { borderRadius: radii.xl, height: '100%', width: '100%' },
  transportHiddenBalance: { alignItems: 'flex-start', backgroundColor: '#11103A', height: '17%', justifyContent: 'center', left: '5.5%', position: 'absolute', top: '54%', width: '32%' },
  transportHiddenBalanceText: { ...typography.heading2, color: HOME_VISUAL.ice },
  transportEyeHotspot: { height: '25%', left: '27%', position: 'absolute', top: '39%', width: '14%' },
  transportRechargeHotspot: { bottom: '7%', height: '25%', position: 'absolute', right: '5%', width: '29%' },
  cardPagination: { flexDirection: 'row', alignSelf: 'center', marginTop: 8 },
  cardPaginationDot: { backgroundColor: HOME_VISUAL.border, borderRadius: 3, height: 6, marginHorizontal: 3, width: 6 },
  cardPaginationDotActive: { backgroundColor: HOME_VISUAL.violet, width: 18 },
  topBannerModule: { backgroundColor: 'transparent', paddingTop: 24 },
  topBannerShadow: { borderRadius: radii.xl, marginHorizontal: 18, ...HOME_CARD_SHADOW },
  topBannerCard: { backgroundColor: HOME_VISUAL.glassStrong, borderColor: HOME_VISUAL.borderStrong, borderRadius: radii.xl, borderWidth: 1, flexDirection: 'row', height: 156, overflow: 'hidden', padding: spacing.lg },
  topBannerContent: { flex: 1, paddingRight: 10, justifyContent: 'center' },
  topBannerEyebrow: { display: 'none' },
  topBannerTitle: { ...typography.heading2, color: colors.textPrimary, marginBottom: spacing.sm },
  topBannerSubtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, marginBottom: spacing.md },
  topBannerCta: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: HOME_VISUAL.violet, borderRadius: radii.pill, flexDirection: 'row', minHeight: 34, paddingHorizontal: spacing.md },
  playIcon: { marginRight: spacing.xs },
  topBannerCtaText: { ...typography.label, color: colors.white, fontSize: 10 },
  topBannerArt: { alignItems: 'center', justifyContent: 'center', width: 105 },
  topBannerPhone: { alignItems: 'center', borderRadius: 46, height: 92, justifyContent: 'center', overflow: 'hidden', width: 92, ...HOME_CARD_SHADOW },
  prizeText: { ...typography.label, color: colors.textPrimary, marginTop: spacing.sm },
  topBannerDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  topBannerDot: { backgroundColor: HOME_VISUAL.border, borderRadius: 3, height: 6, marginHorizontal: 3, width: 6 },
  topBannerDotActive: { backgroundColor: HOME_VISUAL.violet, width: 18 },
  movementsModule: { paddingHorizontal: 18, paddingTop: 24 },
  movementsList: { backgroundColor: HOME_VISUAL.glassStrong, borderColor: HOME_VISUAL.glassBorder, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  movementRow: { alignItems: 'center', borderBottomColor: HOME_VISUAL.glassBorder, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 62, paddingHorizontal: spacing.md },
  movementIcon: { alignItems: 'center', backgroundColor: HOME_VISUAL.violetSoft, borderRadius: 10, height: 38, justifyContent: 'center', marginRight: spacing.md, width: 38 },
  movementText: { flex: 1 },
  movementTitle: { ...typography.bodyMedium, color: HOME_VISUAL.ice, fontSize: 12 },
  movementDate: { ...typography.caption, color: HOME_VISUAL.textSecondary, fontSize: 10, marginTop: 1 },
  movementValue: { ...typography.bodyMedium, color: HOME_VISUAL.ice, fontSize: 12, marginRight: spacing.xs },
  movementValueIn: { color: HOME_VISUAL.violet },
  servicesModule: { backgroundColor: 'transparent', paddingHorizontal: 18, paddingTop: 24 },
  homeServicesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  homeServiceWrapper: { padding: 4, width: '33.333%' },
  homeServiceTile: { backgroundColor: HOME_VISUAL.glass, borderColor: HOME_VISUAL.glassBorder, minHeight: 82, padding: spacing.sm, width: '100%' },
  campaignsModule: { paddingLeft: 18, paddingTop: 24 },
  serviceSection: { marginBottom: spacing.md, width: '100%' },
  serviceSectionTitle: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  serviceRows: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, width: '100%' },
  serviceItemWrapper: { alignItems: 'center', padding: spacing.xs, width: '25%' },
  serviceItem: { backgroundColor: HOME_VISUAL.surface, borderColor: HOME_VISUAL.border, minHeight: 88, paddingHorizontal: spacing.xs, width: '100%' },
  serviceItemPrimary: { backgroundColor: HOME_VISUAL.surfaceElevated, borderColor: HOME_VISUAL.borderStrong },
  favoriteTriggers: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', minHeight: 44, paddingHorizontal: spacing.xl },
  favoriteTriggerButton: { alignItems: 'center', flexDirection: 'row', marginRight: 14 },
  favoriteTriggerIcon: { marginRight: spacing.xs },
  favoriteTriggerText: { ...typography.caption, color: colors.textSecondary },
  favoriteSquareTrigger: { marginRight: 14, padding: 2 },
  moreServicesTrigger: { ...typography.bodyMedium, color: HOME_VISUAL.violet },
  promotionModule: { backgroundColor: 'transparent' },
  promotionScrollContent: { paddingBottom: spacing.xxl, paddingRight: spacing.xl },
  promotionCard: { backgroundColor: HOME_VISUAL.glassStrong, borderColor: HOME_VISUAL.glassBorder, borderRadius: radii.xl, borderWidth: 1, marginRight: spacing.lg, overflow: 'hidden', ...HOME_CARD_SHADOW },
  promotionImageArea: { height: 92, width: '100%' },
  promotionContent: { padding: spacing.lg },
  promotionTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.xs },
  promotionText: { ...typography.caption, color: colors.textSecondary, height: 48, lineHeight: 16, marginBottom: spacing.md },
  promotionButton: { alignItems: 'center', backgroundColor: HOME_VISUAL.violet, borderRadius: radii.md, paddingVertical: spacing.sm },
  promotionButtonText: { ...typography.label, color: colors.white },
  circleModalContent: { flexGrow: 1, paddingBottom: spacing.sm },
  circleModalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  circleModalSection: { marginBottom: spacing.xl, width: '100%' },
  circleModalSectionTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.lg },
  circleModalDivider: { backgroundColor: colors.borderSubtle, height: 1, marginBottom: spacing.xl, width: '100%' },
  favoriteListRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.sm, minHeight: 58, width: '100%' },
  favoriteListIconArea: { alignItems: 'center', width: '20%' },
  favoriteListTextArea: { width: '70%' },
  favoriteListText: { ...typography.bodyMedium, color: colors.textPrimary },
  favoriteListActionArea: { alignItems: 'center', width: '10%' },
  modalBottomSpace: { height: 10 },
  darkModalContent: { flexGrow: 1, paddingBottom: spacing.sm },
  darkModalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  darkModalDivider: { backgroundColor: colors.borderSubtle, height: 1, width: '100%' },
  squareModalSectionPrimary: { marginBottom: 20, marginTop: 10, width: '100%' },
  darkModalSectionTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  squareModalSectionSecondary: { marginBottom: 20, marginTop: 5, width: '100%' },
  darkModalSectionTitleSecondary: { ...typography.heading3, color: colors.textPrimary, margin: spacing.md, textAlign: 'center' },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingHorizontal: '5%', width: '100%' },
  modalGridItemWrapper: { alignItems: 'center', marginVertical: 7, width: '33.333%' },
  modalGridItem: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, height: 95, justifyContent: 'center', width: '88%' },
  modalGridIconArea: { alignItems: 'center', height: 25, marginTop: 10 },
  modalGridText: { ...typography.caption, color: colors.textPrimary, paddingHorizontal: spacing.xs, textAlign: 'center' },
  gridActionIcon: { position: 'absolute', right: -5, top: -9, zIndex: 2 },
  moreServicesModalSection: { marginBottom: 20, marginTop: 10, width: '100%' },
});
