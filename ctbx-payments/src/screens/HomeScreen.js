import React, { useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  BalanceCard,
  BottomTabBar,
  ModalSheet,
  PrimaryButton,
  Screen,
  SectionTitle,
  ServiceCard,
} from '../components/ui';
import { colors, radii, shadows, spacing, typography } from '../theme';

const COLORS = {
  dark: colors.navy900,
  accent: colors.orange500,
  page: colors.background,
  card: colors.surface,
};

// MOCK TEMPORARIO: estes valores serao substituidos pelos retornos da API original.
const MOCK_BALANCES = [
  {
    id: 'digital',
    description: 'Conta Digital',
    tag: 'R$',
    value: '2.480,75',
    blockedValue: '0,00',
  },
  {
    id: 'investment',
    description: 'Investimentos',
    tag: 'R$',
    value: '1.350,00',
  },
  {
    id: 'agreement',
    description: 'Saldo Convênio',
    tag: 'R$',
    value: '680,40',
  },
  {
    id: 'card',
    description: 'Conta Cartão',
    tag: 'R$',
    value: '920,10',
  },
];

// MOCK TEMPORARIO: numero, titular, validade e saldo virao das APIs de cartoes.
const MOCK_CARDS = [
  {
    id: 'financial',
    type: 'FINANCEIRO',
    label: 'Mastercard - Crédito',
    lastFourDigits: '4321',
    holderName: 'CLIENTE CTBX',
    expiration: '12/29',
    logo: require('../../assets/legacy/assets_images_master.png'),
  },
  {
    id: 'transport',
    type: 'TRANSPORTE',
    label: 'Cartão TOP',
    lastFourDigits: '9876',
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

const HOME_SECTIONS = [
  {
    title: 'Conta Digital',
    items: [
      { key: 1, label: 'PIX', symbol: '◆' },
      { key: 7, label: 'Transferências', symbol: '↔' },
      { key: 8, label: 'Pagar Conta', symbol: '▥' },
      { key: 10, label: 'Extrato', symbol: '≡' },
    ],
  },
  {
    title: 'Serviços',
    items: [
      { key: 43, label: 'Recarga TOP', symbol: '▰' },
      { key: 13, label: 'Comprovantes', symbol: '▤' },
      { key: 3, label: 'Investimentos', symbol: '◔' },
    ],
  },
  {
    title: 'Produtos',
    items: [
      { key: 37, label: 'Antecipação Salarial', symbol: '$' },
      { key: 38, label: 'Benefícios', symbol: '◇' },
      { key: 39, label: 'Crédito Consignado', symbol: '□' },
    ],
  },
  {
    title: 'Empresas',
    items: [
      { key: 40, label: 'Capital de Giro', symbol: '↗' },
      { key: 41, label: 'Antecipação de Recebíveis', symbol: '✓' },
      { key: 42, label: 'POS Tapon', symbol: '▦' },
      { key: 11, label: 'Cobrança', symbol: '∞' },
      { key: 22, label: 'Microcrédito Digital', symbol: '⌁' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { key: 26, label: 'Perfil', symbol: '●' },
      { key: 27, label: 'Tarifas', symbol: '☷' },
      { key: 30, label: 'Indicar Amigos', symbol: '◇' },
      { key: 31, label: 'Ajuda', symbol: '?' },
    ],
  },
];

// MOCK TEMPORARIO: o tipo de conta sera obtido de pessoa.pf_pj apos a autenticacao.
const MOCK_ACCOUNT_TYPE = 'PF';

const HOME_PROMOTION_CARDS = [
  {
    id: 'salary_advance',
    audience: 'PF',
    title: 'Antecipação Salarial',
    text: 'Seu salário não precisa esperar o dia 5. Antecipe até R$ 1.200 do seu saldo hoje.',
    buttonText: 'Antecipar Agora',
    route: 'NavScreen176',
    image: require('../../assets/legacy/assets_images_credit_antecipacaosalarial.webp'),
  },
  {
    id: 'working_capital',
    audience: 'PJ',
    title: 'Capital de Giro',
    text: 'Capital de Giro sob medida para a sua empresa crescer. Simule até R$ 50 mil em parcelas fixas.',
    buttonText: 'Simular Giro',
    route: 'NavScreen179',
    image: require('../../assets/legacy/assets_images_pj_capitalgiro.webp'),
  },
  {
    id: 'refer_and_earn',
    audience: 'ALL',
    title: 'Indique e Ganhe',
    text: 'Amigo CTB vale ouro! Compartilhe seu código de indicação e ganhe R$ 20 de cashback após a ativação.',
    buttonText: 'Indicar Agora',
    route: 'NavScreen87',
    image: require('../../assets/legacy/assets_images_indique.jpg'),
  },
];

const HOME_MODAL_ITEMS = HOME_SECTIONS.flatMap((section) => section.items);

// MOCK TEMPORARIO: no APK esta lista e recuperada do AsyncStorage por conta e
// posteriormente sincronizada com a API `favorito/novo`.
const INITIAL_FAVORITE_KEYS = [1, 7, 8, 10];

function ModalCloseButton({ onPress, light = false, topSpacing = 15 }) {
  return (
    <View style={[styles.modalCloseRow, { marginTop: topSpacing }]}>
      <TouchableOpacity
        accessibilityLabel="Fechar"
        hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        onPress={onPress}
        style={styles.modalCloseButton}
      >
        <Text style={[styles.modalCloseIcon, light && styles.modalCloseIconLight]}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

function FavoriteListRow({ item, selected, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.favoriteListRow}>
      <View style={styles.favoriteListIconArea}>
        <Text style={styles.favoriteListIcon}>{item.symbol}</Text>
      </View>
      <View style={styles.favoriteListTextArea}>
        <Text style={styles.favoriteListText}>{item.label}</Text>
      </View>
      <View style={styles.favoriteListActionArea}>
        <Text
          style={selected ? styles.favoriteListRemove : styles.favoriteListAdd}
        >
          {selected ? '⊖' : '⊕'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ServiceGrid({ items, editable = false, selectedKeys = [], onToggle }) {
  return (
    <View style={styles.modalGrid}>
      {items.map((item) => {
        const selected = selectedKeys.includes(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            // MOCK TEMPORARIO: as rotas NavScreen recuperadas ainda nao existem
            // no navigator Expo; no modo editavel o toque altera o favorito.
            onPress={editable ? () => onToggle(item.key) : undefined}
            style={styles.modalGridItemWrapper}
          >
            <View style={styles.modalGridItem}>
              {editable ? (
                <Text style={selected ? styles.gridRemoveIcon : styles.gridAddIcon}>
                  {selected ? '⊖' : '⊕'}
                </Text>
              ) : null}
              <View style={styles.modalGridIconArea}>
                <Text style={styles.modalGridIcon}>{item.symbol}</Text>
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
  const { width } = useWindowDimensions();
  const balanceScrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showTransportBalance, setShowTransportBalance] = useState(true);
  const [visibleBalances, setVisibleBalances] = useState({});
  const [favoriteKeys, setFavoriteKeys] = useState(INITIAL_FAVORITE_KEYS);
  const [favoritesCircleVisible, setFavoritesCircleVisible] = useState(false);
  const [favoritesSquareVisible, setFavoritesSquareVisible] = useState(false);
  const [moreServicesVisible, setMoreServicesVisible] = useState(false);
  const visiblePromotionCards = HOME_PROMOTION_CARDS.filter(
    (card) => card.audience === 'ALL' || card.audience === MOCK_ACCOUNT_TYPE,
  );

  const toggleBalance = (id) => {
    setVisibleBalances((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const handleBalanceScroll = ({ nativeEvent }) => {
    const nextIndex = Math.round(nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(nextIndex, MOCK_BALANCES.length - 1)));
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

  return (
    <Screen contentContainerStyle={styles.screenContent} gradient={false}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, Elma</Text>
            <Text style={styles.greetingSubtitle}>Bem-vinda de volta!</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Notificações" activeOpacity={0.7} style={styles.headerAction}>
            <Text style={styles.notificationIcon}>♢</Text>
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <ScrollView
            ref={balanceScrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            decelerationRate="fast"
            onMomentumScrollEnd={handleBalanceScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={styles.balanceCarousel}
          >
            {MOCK_BALANCES.map((balance) => {
              const isVisible = Boolean(visibleBalances[balance.id]);

              return (
                <View key={balance.id} style={[styles.slide, { width }]}>
                  <View>
                    <BalanceCard
                      actionLabel="Ver extrato"
                      label={balance.description}
                      onToggleVisibility={() => toggleBalance(balance.id)}
                      style={styles.balanceCard}
                      value={balance.value}
                      variant={balance.id === 'investment' ? 'purple' : 'blue'}
                      visible={isVisible}
                    />
                    {balance.blockedValue ? (
                      <TouchableOpacity activeOpacity={0.7} style={styles.blockedRow}>
                        <Text style={styles.blockedLabel}>Saldo Bloqueado</Text>
                        <Text style={styles.blockedValue}>
                          R$ {balance.blockedValue}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.pagination}>
            {MOCK_BALANCES.map((balance, index) => (
              <TouchableOpacity
                key={balance.id}
                accessibilityLabel={`Ir para saldo ${index + 1}`}
                activeOpacity={0.7}
                onPress={() => {
                  balanceScrollRef.current?.scrollTo({ x: width * index, animated: true });
                  setActiveIndex(index);
                }}
              >
                <View
                  style={[
                    styles.paginationDot,
                    index === activeIndex && styles.paginationDotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cardsModule}>
            <View style={styles.cardsPanel}>
              <View style={styles.moduleTitleRow}>
                <Text style={styles.moduleTitleIcon}>▱</Text>
                <Text style={styles.moduleTitle}>Meus cartões</Text>
              </View>

              <ScrollView
                horizontal
                bounces={false}
                decelerationRate="fast"
                onMomentumScrollEnd={({ nativeEvent }) => {
                  setActiveCardIndex(
                    Math.round(nativeEvent.contentOffset.x / (width * 0.82)),
                  );
                }}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={width * 0.82}
                contentContainerStyle={styles.cardsScrollContent}
              >
                {MOCK_CARDS.map((card) => (
                  <View key={card.id} style={{ width: width * 0.82 }}>
                    {card.type === 'FINANCEIRO' ? (
                      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Cards')} style={styles.financialCard}>
                        <View style={styles.cardWatermark}>
                          <Text style={styles.cardWatermarkText}>▰</Text>
                        </View>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.cardType}>{card.label}</Text>
                          <Image source={card.logo} resizeMode="contain" style={styles.cardLogo} />
                        </View>
                        <Text style={styles.cardNumber}>
                          **** **** **** {card.lastFourDigits}
                        </Text>
                        <View style={styles.cardFooterRow}>
                          <View style={styles.cardHolderArea}>
                            <Text style={styles.cardMetaLabel}>TITULAR</Text>
                            <Text numberOfLines={1} style={styles.cardMetaValue}>
                              {card.holderName}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.cardMetaLabel}>VALIDADE</Text>
                            <Text style={styles.cardMetaValue}>{card.expiration}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.transportCard}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.transportTitle}>Transporte Público</Text>
                          <Image source={card.logo} resizeMode="contain" style={styles.topLogo} />
                        </View>
                        <View>
                          <View style={styles.transportBalanceLabelRow}>
                            <Text style={styles.transportBalanceLabel}>Saldo de transporte</Text>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => setShowTransportBalance((current) => !current)}
                              style={styles.transportEye}
                            >
                              <Text style={styles.transportEyeText}>
                                {showTransportBalance ? '◉' : '⊘'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.transportBalance}>
                            {showTransportBalance ? card.balance : 'R$ •••••'}
                          </Text>
                        </View>
                        <View style={styles.transportFooterRow}>
                          <Text style={styles.transportNumber}>**** {card.lastFourDigits}</Text>
                          <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.navigate('CardRecharge', { transport: true })} style={styles.rechargeButton}>
                            <Text style={styles.rechargeText}>Recarregar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.cardPagination}>
                {MOCK_CARDS.map((card, index) => (
                  <View
                    key={card.id}
                    style={[
                      styles.cardPaginationDot,
                      index === activeCardIndex && styles.cardPaginationDotActive,
                    ]}
                  />
                ))}
              </View>
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
                      <Text style={styles.playIcon}>▶</Text>
                      <Text style={styles.topBannerCtaText}>{banner.ctaText}</Text>
                    </View>
                  </View>
                  <View style={styles.topBannerArt}>
                    <View style={styles.topBannerPhone}>
                      <Text style={styles.topBannerPlay}>▷</Text>
                      <Text style={styles.prizeText}>R$ 5.000</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.topBannerDots}>
              <View style={[styles.topBannerDot, styles.topBannerDotActive]} />
            </View>
          </View>

          <View style={styles.servicesModule}>
            {HOME_SECTIONS.map((section) => (
              <View key={section.title} style={styles.serviceSection}>
                <SectionTitle style={styles.serviceSectionTitle} title={section.title} />
                <View style={styles.serviceRows}>
                  {section.items.map((item) => {
                    const isPrimary = [1, 7, 8, 10].includes(item.key);
                    return (
                      <View key={item.key} style={styles.serviceItemWrapper}>
                        <ServiceCard
                          icon={<Text style={styles.serviceIcon}>{item.symbol}</Text>}
                          label={item.label}
                          onPress={item.key === 1
                            ? () => navigation.navigate('Pix')
                            : item.key === 7
                              ? () => navigation.navigate('Transfers')
                              : item.key === 8
                                ? () => navigation.navigate('Payments')
                                : item.key === 10
                                  ? () => navigation.navigate('Statement')
                                  : undefined}
                          style={[
                            styles.serviceItem,
                            isPrimary && styles.serviceItemPrimary,
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.favoriteTriggers}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setFavoritesCircleVisible(true)}
                style={styles.favoriteTriggerButton}
              >
                <Text style={styles.favoriteTriggerIcon}>＋</Text>
                <Text style={styles.favoriteTriggerText}>Gerenciar Favoritos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Organizar favoritos"
                activeOpacity={0.75}
                onPress={() => setFavoritesSquareVisible(true)}
                style={styles.favoriteSquareTrigger}
              >
                <Text style={styles.favoriteSquareTriggerIcon}>★</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setMoreServicesVisible(true)}
              >
                <Text style={styles.moreServicesTrigger}>Mais serviços</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            bounces
            decelerationRate="fast"
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            snapToInterval={width * 0.85}
            contentContainerStyle={styles.promotionScrollContent}
            style={styles.promotionModule}
          >
            {visiblePromotionCards.map((promotion) => (
              <TouchableOpacity
                key={promotion.id}
                accessibilityLabel={promotion.title}
                activeOpacity={0.9}
                style={[styles.promotionCard, { width: width * 0.8 }]}
              >
                <View style={styles.promotionImageArea}>
                  <Image
                    source={promotion.image}
                    resizeMode="cover"
                    style={styles.promotionImage}
                  />
                </View>
                <View style={styles.promotionContent}>
                  <Text numberOfLines={2} style={styles.promotionTitle}>
                    {promotion.title}
                  </Text>
                  <Text numberOfLines={3} style={styles.promotionText}>
                    {promotion.text}
                  </Text>
                  <View style={styles.promotionButton}>
                    <Text style={styles.promotionButtonText}>
                      {promotion.buttonText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ScrollView>
        <BottomTabBar
          activeKey="home"
          onTabPress={(tab) => {
            if (tab.key === 'pix') navigation.navigate('Pix');
            if (tab.key === 'cards') navigation.navigate('Cards');
            if (tab.key === 'services') navigation.navigate('Services');
            if (tab.key === 'profile') navigation.navigate('Profile');
          }}
          renderIcon={(tab, active) => (
            <Text style={[styles.tabIcon, active && styles.tabIconActive]}>
              {{ home: '⌂', cards: '▱', services: '▦', pix: '◆', profile: '○' }[tab.key]}
            </Text>
          )}
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
              <ServiceGrid items={HOME_MODAL_ITEMS} />
            </View>
          </ScrollView>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  header: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    backgroundColor: COLORS.dark,
    borderBottomColor: COLORS.accent,
    borderBottomWidth: 0.3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: COLORS.card,
    fontSize: 28,
    lineHeight: 32,
  },
  logo: {
    width: 142,
    height: 43,
  },
  notificationIcon: {
    color: COLORS.card,
    fontSize: 29,
    lineHeight: 31,
    transform: [{ rotate: '45deg' }],
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  content: {
    paddingBottom: 24,
  },
  balanceCarousel: {
    marginTop: 0,
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  balanceCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderColor: '#E2F0E8',
    borderWidth: 1,
    elevation: 3,
    marginBottom: 6,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  balanceTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDF9F2',
    borderRadius: 12,
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  valueRow: {
    minHeight: 29,
    alignItems: 'center',
    flexDirection: 'row',
  },
  balanceValue: {
    color: '#13251C',
    fontSize: 21,
    fontWeight: '700',
  },
  hiddenValue: {
    height: 29,
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
  },
  hiddenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginRight: 5,
  },
  eyeButton: {
    marginLeft: 8,
    padding: 2,
  },
  eyeIcon: {
    color: COLORS.accent,
    fontSize: 17,
    fontWeight: '700',
  },
  statementButton: {
    backgroundColor: '#F4F8F6',
    borderColor: '#E1EEE7',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  statementText: {
    color: '#335245',
    fontSize: 10,
    fontWeight: '700',
  },
  blockedRow: {
    borderTopColor: '#E8F2EC',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
  },
  blockedLabel: {
    color: '#6D7D74',
    fontSize: 11,
  },
  blockedValue: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '700',
  },
  pagination: {
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8E5DD',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    width: 15,
    backgroundColor: COLORS.accent,
  },
  cardsModule: {
    backgroundColor: COLORS.page,
    paddingTop: 18,
    paddingBottom: 15,
  },
  cardsPanel: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E7F1EB',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  moduleTitleRow: {
    paddingHorizontal: 15,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleTitleIcon: {
    color: '#666666',
    fontSize: 12,
    marginRight: 8,
    opacity: 0.6,
  },
  moduleTitle: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  cardsScrollContent: {
    paddingLeft: 15,
    paddingRight: 3,
  },
  financialCard: {
    width: '95%',
    height: 142,
    backgroundColor: '#171A21',
    borderRadius: 18,
    padding: 15,
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginRight: 12,
  },
  cardWatermark: {
    position: 'absolute',
    right: -28,
    bottom: -30,
    opacity: 0.08,
  },
  cardWatermarkText: {
    color: '#FFFFFF',
    fontSize: 150,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardLogo: {
    width: 48,
    height: 28,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolderArea: {
    flex: 1,
    paddingRight: 10,
  },
  cardMetaLabel: {
    color: '#8F98A6',
    fontSize: 9,
    fontWeight: '700',
  },
  cardMetaValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  transportCard: {
    width: '95%',
    height: 142,
    backgroundColor: '#0B8A7D',
    borderRadius: 18,
    padding: 15,
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginRight: 12,
  },
  transportTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topLogo: {
    width: 48,
    height: 28,
  },
  transportBalanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportBalanceLabel: {
    color: '#D9FFF0',
    fontSize: 11,
    fontWeight: '700',
  },
  transportEye: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  transportEyeText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  transportBalance: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 1,
  },
  transportFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transportNumber: {
    color: '#E9FFF6',
    fontSize: 14,
    letterSpacing: 1,
  },
  rechargeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rechargeText: {
    color: '#087565',
    fontSize: 12,
    fontWeight: '700',
  },
  cardPagination: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 8,
  },
  cardPaginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8E5DD',
    marginHorizontal: 3,
  },
  cardPaginationDotActive: {
    width: 18,
    backgroundColor: COLORS.accent,
  },
  topBannerModule: {
    width: '100%',
    backgroundColor: COLORS.page,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topBannerShadow: {
    marginHorizontal: 20,
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  topBannerCard: {
    height: 192,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#166B64',
  },
  topBannerContent: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  topBannerEyebrow: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  topBannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '800',
    marginBottom: 7,
  },
  topBannerSubtitle: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  topBannerCta: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#00D2C4',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playIcon: {
    color: '#0E1318',
    fontSize: 11,
    marginRight: 4,
  },
  topBannerCtaText: {
    color: '#0E1318',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  topBannerArt: {
    width: 105,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,210,196,0.12)',
  },
  topBannerPhone: {
    width: 78,
    height: 112,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
  },
  topBannerPlay: {
    color: '#00D2C4',
    fontSize: 44,
  },
  prizeText: {
    color: '#0E1318',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
  topBannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  topBannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBDAD4',
    marginHorizontal: 3,
  },
  topBannerDotActive: {
    width: 18,
    backgroundColor: '#168874',
  },
  servicesModule: {
    width: '100%',
    backgroundColor: COLORS.page,
  },
  serviceSection: {
    width: '100%',
    marginTop: 6,
    marginBottom: 2,
  },
  serviceSectionTitle: {
    color: '#2E2E2E',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  serviceRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: 14,
  },
  serviceItemWrapper: {
    width: '25%',
    alignItems: 'center',
  },
  serviceItem: {
    width: '92%',
    height: 78,
    borderWidth: 1,
    borderColor: '#E1ECE6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  serviceItemPrimary: {
    backgroundColor: '#F1F8F3',
    borderColor: '#BFE2CF',
    shadowOpacity: 0.09,
    elevation: 3,
  },
  serviceIconContainer: {
    minHeight: 34,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconContainerPrimary: {
    backgroundColor: 'rgba(45,164,99,0.10)',
    borderRadius: 14,
    minWidth: 38,
  },
  serviceIcon: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  serviceItemText: {
    fontSize: 9.4,
    lineHeight: 11,
    textAlign: 'center',
    color: '#2E2E2E',
    width: '100%',
    minHeight: 22,
  },
  serviceItemTextPrimary: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  favoriteTriggers: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 40,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  favoriteTriggerButton: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 14,
  },
  favoriteTriggerIcon: {
    color: COLORS.accent,
    fontSize: 16,
    marginRight: 4,
  },
  favoriteTriggerText: {
    color: '#2E2E2E',
    fontSize: 11,
  },
  favoriteSquareTrigger: {
    marginRight: 14,
    padding: 2,
  },
  favoriteSquareTriggerIcon: {
    color: '#CDBE28',
    fontSize: 21,
  },
  moreServicesTrigger: {
    color: '#000000',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalSafeArea: {
    flex: 1,
  },
  circleModalBackground: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  circleModalContent: {
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: 10,
  },
  modalCloseRow: {
    alignItems: 'flex-end',
    marginRight: 15,
    width: '95%',
  },
  modalCloseButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  modalCloseIcon: {
    color: COLORS.accent,
    fontSize: 31,
    fontWeight: '300',
    lineHeight: 31,
  },
  modalCloseIconLight: {
    color: '#FFFFFF',
  },
  circleModalTitle: {
    color: '#2E2E2E',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  circleModalSubtitle: {
    color: '#2E2E2E',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  circleModalSection: {
    marginBottom: 40,
    marginTop: 40,
    width: '90%',
  },
  circleModalSectionTitle: {
    color: '#2E2E2E',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 20,
  },
  circleModalDivider: {
    borderColor: COLORS.accent,
    borderTopWidth: 0.3,
    width: '100%',
  },
  favoriteListRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    width: '95%',
  },
  favoriteListIconArea: {
    alignItems: 'center',
    width: '20%',
  },
  favoriteListIcon: {
    color: COLORS.accent,
    fontSize: 25,
    fontWeight: '700',
  },
  favoriteListTextArea: {
    width: '70%',
  },
  favoriteListText: {
    color: '#2E2E2E',
    fontSize: 14,
  },
  favoriteListActionArea: {
    alignItems: 'center',
    width: '10%',
  },
  favoriteListRemove: {
    color: '#E74F4F',
    fontSize: 23,
  },
  favoriteListAdd: {
    color: '#68D765',
    fontSize: 23,
  },
  modalSaveButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 5,
    height: 35,
    justifyContent: 'center',
    width: 150,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalBottomSpace: {
    height: 10,
  },
  darkModalBackground: {
    backgroundColor: COLORS.dark,
    flex: 1,
  },
  darkModalContent: {
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: 10,
  },
  darkModalTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    margin: 10,
    textAlign: 'center',
  },
  darkModalSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    width: '80%',
  },
  darkModalDivider: {
    borderColor: '#FFFFFF',
    borderTopWidth: 0.3,
    width: '100%',
  },
  squareModalSectionPrimary: {
    marginBottom: 20,
    marginTop: 10,
    width: '100%',
  },
  squareModalSectionSecondary: {
    marginBottom: 20,
    marginTop: 5,
    width: '100%',
  },
  darkModalSectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  darkModalSectionTitleSecondary: {
    color: '#FFFFFF',
    fontSize: 14,
    margin: 10,
    textAlign: 'center',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: '5%',
    width: '100%',
  },
  modalGridItemWrapper: {
    alignItems: 'center',
    marginVertical: 7,
    width: '33.333%',
  },
  modalGridItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    elevation: 2,
    height: 95,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    width: '88%',
  },
  gridRemoveIcon: {
    color: '#E74F4F',
    fontSize: 27,
    position: 'absolute',
    right: -5,
    top: -9,
    zIndex: 2,
  },
  gridAddIcon: {
    color: '#68D765',
    fontSize: 27,
    position: 'absolute',
    right: -5,
    top: -9,
    zIndex: 2,
  },
  modalGridIconArea: {
    alignItems: 'center',
    height: 25,
    marginTop: 10,
  },
  modalGridIcon: {
    color: COLORS.accent,
    fontSize: 25,
    fontWeight: '700',
  },
  modalGridText: {
    color: '#000000',
    fontSize: 13,
    paddingHorizontal: 3,
    textAlign: 'center',
  },
  moreServicesModalSection: {
    marginBottom: 20,
    marginTop: 10,
    width: '100%',
  },
  promotionModule: {
    backgroundColor: COLORS.page,
  },
  promotionScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  promotionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginRight: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7F1EB',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  promotionImageArea: {
    width: '100%',
    height: 124,
  },
  promotionImage: {
    width: '100%',
    height: '100%',
  },
  promotionContent: {
    padding: 15,
  },
  promotionTitle: {
    color: '#333333',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  promotionText: {
    color: '#666666',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
    height: 48,
  },
  promotionButton: {
    backgroundColor: '#F1F8F3',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDEFE4',
  },
  promotionButtonText: {
    color: COLORS.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  screenContent: { paddingHorizontal: 0 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: colors.navy900,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  greeting: { ...typography.heading2, color: colors.textPrimary },
  greetingSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  headerAction: {
    alignItems: 'center',
    backgroundColor: colors.whiteAlpha08,
    borderColor: colors.borderSubtle,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  notificationIcon: { color: colors.ice, fontSize: 25, transform: [{ rotate: '45deg' }] },
  notificationDot: { backgroundColor: colors.orange500, borderRadius: 4, height: 7, position: 'absolute', right: 6, top: 6, width: 7 },
  scrollView: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: spacing.xxl },
  balanceCarousel: { marginTop: spacing.lg },
  slide: { alignItems: 'center', paddingHorizontal: spacing.xl },
  balanceCard: { minHeight: 156, width: '100%' },
  blockedRow: { backgroundColor: colors.whiteAlpha08, borderRadius: radii.md, flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.md, marginTop: -46, padding: spacing.md },
  blockedLabel: { ...typography.caption, color: colors.textSecondary },
  blockedValue: { ...typography.label, color: colors.orange400 },
  pagination: { alignSelf: 'center', flexDirection: 'row', marginTop: spacing.md },
  paginationDot: { backgroundColor: colors.borderStrong, borderRadius: 3, height: 6, marginHorizontal: 3, width: 6 },
  paginationDotActive: { backgroundColor: colors.purple500, width: 20 },
  cardsModule: { backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  cardsPanel: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: radii.xl, borderWidth: 1, paddingVertical: spacing.lg, ...shadows.card },
  moduleTitleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  moduleTitleIcon: { color: colors.purple400, fontSize: 17, marginRight: spacing.sm },
  moduleTitle: { ...typography.heading3, color: colors.textPrimary },
  cardsScrollContent: { paddingLeft: spacing.lg, paddingRight: spacing.xs },
  financialCard: { backgroundColor: '#111D30', borderColor: colors.borderStrong, borderRadius: radii.xl, borderWidth: 1, height: 158, justifyContent: 'space-between', marginRight: spacing.md, overflow: 'hidden', padding: spacing.lg, width: '95%' },
  transportCard: { backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, height: 158, justifyContent: 'space-between', marginRight: spacing.md, overflow: 'hidden', padding: spacing.lg, width: '95%' },
  cardType: { ...typography.label, color: colors.textPrimary },
  transportTitle: { ...typography.label, color: colors.textPrimary },
  cardNumber: { color: colors.textPrimary, fontSize: 15, letterSpacing: 2 },
  cardMetaLabel: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  cardMetaValue: { ...typography.label, color: colors.textPrimary },
  transportBalanceLabel: { ...typography.caption, color: colors.textSecondary },
  transportBalance: { ...typography.heading1, color: colors.textPrimary, marginTop: 2 },
  transportNumber: { color: colors.textSecondary, fontSize: 14, letterSpacing: 1 },
  transportEye: { alignItems: 'center', backgroundColor: colors.whiteAlpha08, borderRadius: radii.pill, height: 28, justifyContent: 'center', marginLeft: spacing.sm, width: 28 },
  transportEyeText: { color: colors.textPrimary, fontSize: 14 },
  rechargeButton: { backgroundColor: colors.orange500, borderRadius: radii.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rechargeText: { ...typography.label, color: colors.white },
  cardPaginationDot: { backgroundColor: colors.borderStrong, borderRadius: 3, height: 6, marginHorizontal: 3, width: 6 },
  cardPaginationDotActive: { backgroundColor: colors.purple500, width: 18 },
  topBannerModule: { backgroundColor: colors.background, paddingVertical: spacing.xl },
  topBannerShadow: { borderRadius: radii.xl, marginHorizontal: spacing.xl, ...shadows.card },
  topBannerCard: { backgroundColor: colors.navy700, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, flexDirection: 'row', height: 192, overflow: 'hidden', padding: spacing.lg },
  topBannerEyebrow: { ...typography.label, color: colors.orange400, letterSpacing: 0.8, marginBottom: spacing.xs, textTransform: 'uppercase' },
  topBannerTitle: { ...typography.heading2, color: colors.textPrimary, marginBottom: spacing.sm },
  topBannerSubtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, marginBottom: spacing.md },
  topBannerCta: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.purple500, borderRadius: radii.pill, flexDirection: 'row', minHeight: 34, paddingHorizontal: spacing.md },
  playIcon: { color: colors.white, fontSize: 11, marginRight: spacing.xs },
  topBannerCtaText: { ...typography.label, color: colors.white, fontSize: 10 },
  topBannerArt: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: radii.xl, justifyContent: 'center', overflow: 'hidden', width: 105 },
  topBannerPhone: { alignItems: 'center', backgroundColor: colors.whiteAlpha14, borderColor: colors.borderStrong, borderRadius: radii.xl, borderWidth: 1, height: 112, justifyContent: 'center', width: 78 },
  topBannerPlay: { color: colors.orange400, fontSize: 44 },
  prizeText: { ...typography.label, color: colors.textPrimary, marginTop: spacing.sm },
  topBannerDot: { backgroundColor: colors.borderStrong, borderRadius: 3, height: 6, marginHorizontal: 3, width: 6 },
  topBannerDotActive: { backgroundColor: colors.purple500, width: 18 },
  servicesModule: { backgroundColor: colors.background, paddingTop: spacing.sm },
  serviceSection: { marginBottom: spacing.md, width: '100%' },
  serviceSectionTitle: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  serviceRows: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, width: '100%' },
  serviceItemWrapper: { alignItems: 'center', padding: spacing.xs, width: '25%' },
  serviceItem: { minHeight: 92, paddingHorizontal: spacing.xs, width: '100%' },
  serviceItemPrimary: { backgroundColor: colors.surfaceElevated, borderColor: colors.purpleAlpha45 },
  serviceIcon: { color: colors.purple300, fontSize: 21, fontWeight: '700' },
  favoriteTriggers: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', minHeight: 44, paddingHorizontal: spacing.xl },
  favoriteTriggerIcon: { color: colors.purple400, fontSize: 18, marginRight: spacing.xs },
  favoriteTriggerText: { ...typography.caption, color: colors.textSecondary },
  favoriteSquareTriggerIcon: { color: colors.orange400, fontSize: 20 },
  moreServicesTrigger: { ...typography.bodyMedium, color: colors.purple300 },
  promotionModule: { backgroundColor: colors.background },
  promotionScrollContent: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  promotionCard: { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: radii.xl, borderWidth: 1, marginRight: spacing.lg, overflow: 'hidden', ...shadows.card },
  promotionContent: { padding: spacing.lg },
  promotionTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.xs },
  promotionText: { ...typography.caption, color: colors.textSecondary, height: 48, lineHeight: 16, marginBottom: spacing.md },
  promotionButton: { alignItems: 'center', backgroundColor: colors.purple500, borderRadius: radii.md, paddingVertical: spacing.sm },
  promotionButtonText: { ...typography.label, color: colors.white },
  circleModalContent: { flexGrow: 1, paddingBottom: spacing.sm },
  circleModalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  circleModalSection: { marginBottom: spacing.xl, width: '100%' },
  circleModalSectionTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.lg },
  circleModalDivider: { backgroundColor: colors.borderSubtle, height: 1, marginBottom: spacing.xl, width: '100%' },
  favoriteListRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.sm, minHeight: 58, width: '100%' },
  favoriteListIcon: { color: colors.purple300, fontSize: 22 },
  favoriteListText: { ...typography.bodyMedium, color: colors.textPrimary },
  darkModalContent: { flexGrow: 1, paddingBottom: spacing.sm },
  darkModalSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  darkModalDivider: { backgroundColor: colors.borderSubtle, height: 1, width: '100%' },
  darkModalSectionTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  darkModalSectionTitleSecondary: { ...typography.heading3, color: colors.textPrimary, margin: spacing.md, textAlign: 'center' },
  modalGridItem: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, height: 95, justifyContent: 'center', width: '88%' },
  modalGridIcon: { color: colors.purple300, fontSize: 24, fontWeight: '700' },
  modalGridText: { ...typography.caption, color: colors.textPrimary, paddingHorizontal: spacing.xs, textAlign: 'center' },
  gridRemoveIcon: { color: colors.danger, fontSize: 27, position: 'absolute', right: -5, top: -9, zIndex: 2 },
  gridAddIcon: { color: colors.success, fontSize: 27, position: 'absolute', right: -5, top: -9, zIndex: 2 },
  tabIcon: { color: colors.slate300, fontSize: 18 },
  tabIconActive: { color: colors.purple400 },
});
