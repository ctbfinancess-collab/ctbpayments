import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppHeader, Card, Screen, SectionTitle, ServiceCard } from '../components/ui';
import { colors, radii, shadows, spacing, typography } from '../theme';

// Rotas/acoes originais recuperadas do Modulo_BotoesChaves. Nesta primeira
// etapa os subfluxos permanecem intencionalmente sem implementacao.
const PAY_OPTIONS = [
  { id: 'qr_code', label: 'QR Code', symbol: '▦', originalAction: 'abrirModal(1)' },
  { id: 'cpf', label: 'CPF', symbol: '●', originalAction: 'abrirModal(2)' },
  { id: 'cnpj', label: 'CNPJ', symbol: '▣', originalAction: 'abrirModal(3)' },
  { id: 'phone', label: 'Celular', symbol: '▯', originalAction: 'abrirModal(4)' },
  { id: 'email', label: 'E-mail', symbol: '✉', originalAction: 'abrirModal(5)' },
  {
    id: 'random_key',
    label: 'Chave Aleatória',
    symbol: '⚿',
    originalAction: 'abrirModal(6)',
  },
  {
    id: 'copy_paste',
    label: 'Copia\ne Cola',
    symbol: '▤',
    originalAction: 'abrirModal(7)',
  },
  { id: 'agency_account', label: 'Agência e Conta', symbol: '▥', originalAction: 'abrirModal(8)' },
  { id: 'favorites', label: 'Favoritos', symbol: '☷', originalAction: 'abrirModal(10)' },
];

const RECEIVE_OPTIONS = [
  {
    id: 'generate_qr',
    label: 'Gerar QR Code',
    symbol: '▦',
    originalAction: 'abrirModal(0)',
  },
  {
    id: 'my_keys',
    label: 'Minhas Chaves',
    symbol: '⚿',
    originalAction: 'abrirModal(9)',
  },
];

function PixOption({ item, cardWidth, onPress }) {
  return (
    <ServiceCard
      accessibilityHint={`Ação original: ${item.originalAction}`}
      icon={<Text style={styles.optionIcon}>{item.symbol}</Text>}
      label={item.label}
      onPress={onPress}
      style={[styles.optionCard, { width: cardWidth }]}
    />
  );
}

export default function PixScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 60) / 3;

  const openPayOption = (item) => {
    if (item.id === 'qr_code') {
      navigation.navigate('PixQrScanner');
    } else if (item.id === 'favorites') {
      navigation.navigate('PixFavorites');
    } else if (item.id === 'agency_account') {
      navigation.navigate('PixAgencyAccount');
    } else {
      navigation.navigate('PixKeyEntry', { type: item.id });
    }
  };

  const openReceiveOption = (item) => {
    navigation.navigate(item.id === 'generate_qr' ? 'PixReceive' : 'PixKeys');
  };

  return (
    <Screen contentContainerStyle={styles.screenContent} gradient>
      <AppHeader
        leftContent={<Text style={styles.backIcon}>‹</Text>}
        onLeftPress={() => navigation.goBack()}
        title="PIX"
      />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pixContainer}>
          <Card style={styles.heroCard}>
            <View style={styles.heroIcon}><Text style={styles.heroIconText}>◆</Text></View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Pix CTBX</Text>
              <Text style={styles.heroSubtitle}>Transfira e receba em poucos segundos.</Text>
            </View>
          </Card>
          <View style={styles.paySection}>
            <SectionTitle style={styles.sectionTitle} title="Pagar" />
            <View style={styles.optionsGrid}>
              {PAY_OPTIONS.map((item) => (
                <PixOption
                  key={item.id}
                  cardWidth={cardWidth}
                  item={item}
                  onPress={() => openPayOption(item)}
                />
              ))}
            </View>
          </View>

          <View style={styles.receiveSection}>
            <SectionTitle style={styles.sectionTitle} title="Receber" />
            <View style={styles.receiveRow}>
              {RECEIVE_OPTIONS.map((item) => (
                <PixOption
                  key={item.id}
                  cardWidth={cardWidth}
                  item={item}
                  onPress={() => openReceiveOption(item)}
                />
              ))}
            </View>
          </View>

          <View style={styles.helpSection}>
            <SectionTitle style={styles.helpTitle} title="Ajuda" />
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => Alert.alert('Via e-mail', 'O endereço de atendimento depende da configuração original do banco.')}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>Via e-mail</Text>
              <Text style={styles.helpChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => Alert.alert('Banco Central', 'A abertura do endereço externo será conectada na etapa de integrações.')}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>
                Registrar reclamação no Banco Central
              </Text>
              <Text style={styles.helpChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0 },
  navigationBar: {
    alignItems: 'center',
    backgroundColor: colors.navy900,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 38,
  },
  navigationTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  navigationSpacer: {
    width: 40,
  },
  content: { backgroundColor: 'transparent', flexGrow: 1 },
  pixContainer: {
    backgroundColor: 'transparent',
    borderBottomEndRadius: 20,
    borderBottomStartRadius: 20,
    paddingBottom: spacing.xxl,
  },
  heroCard: { alignItems: 'center', flexDirection: 'row', margin: spacing.xl, marginBottom: spacing.md, padding: spacing.xl },
  heroIcon: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: radii.lg, height: 56, justifyContent: 'center', width: 56 },
  heroIconText: { color: colors.purple300, fontSize: 26 },
  heroCopy: { flex: 1, marginLeft: spacing.lg },
  heroTitle: { ...typography.heading2, color: colors.textPrimary },
  heroSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  paySection: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 15,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 5,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 104,
    justifyContent: 'center',
    margin: 5,
    ...shadows.soft,
  },
  optionIconContainer: {
    alignItems: 'center',
    backgroundColor: '#F1F8F3',
    borderColor: '#DDEFE4',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginBottom: 7,
    padding: 8,
    width: 38,
  },
  optionIcon: {
    color: colors.purple300,
    fontSize: 20,
    fontWeight: '700',
  },
  optionLabel: {
    color: '#2E2E2E',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  receiveSection: {
    marginBottom: 10,
    marginTop: 25,
    paddingHorizontal: spacing.lg,
  },
  receiveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 5,
  },
  helpSection: {
    marginTop: 20,
    paddingHorizontal: spacing.xl,
  },
  helpTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  helpButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 15,
    width: '100%',
  },
  helpButtonText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  helpChevron: {
    color: colors.purple300,
    fontSize: 20,
    marginLeft: 8,
  },
});
