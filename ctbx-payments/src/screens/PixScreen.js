import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppHeader, Card, Icon, Screen, SectionTitle, ServiceCard } from '../components/ui';
import useAppWidth from '../hooks/useAppWidth';
import { colors, radii, spacing, typography } from '../theme';

// Rotas/acoes originais recuperadas do Modulo_BotoesChaves.
// `icon` usa nomes do conjunto Ionicons (ver src/components/ui/Icon.js).
// Arquitetura revisada: "Favoritos"/"Recentes" saíram da grade de métodos de
// envio (viraram atalhos rápidos no topo de "Enviar") e "Minhas Chaves"
// passou a viver em "Gerenciar Pix", junto de Agendamentos/Limites/
// Comprovantes — a mesma tela recuperada, só organizada em menos níveis.
const QUICK_SEND_OPTIONS = [
  { id: 'favorites', label: 'Favoritos', icon: 'star-outline', route: 'PixFavorites' },
  { id: 'recent', label: 'Recentes', icon: 'time-outline', route: 'PixRecent' },
];

const PAY_OPTIONS = [
  { id: 'qr_code', label: 'QR Code', icon: 'qr-code-outline', originalAction: 'abrirModal(1)' },
  { id: 'cpf', label: 'CPF', icon: 'person-outline', originalAction: 'abrirModal(2)' },
  { id: 'cnpj', label: 'CNPJ', icon: 'briefcase-outline', originalAction: 'abrirModal(3)' },
  { id: 'phone', label: 'Celular', icon: 'call-outline', originalAction: 'abrirModal(4)' },
  { id: 'email', label: 'E-mail', icon: 'mail-outline', originalAction: 'abrirModal(5)' },
  {
    id: 'random_key',
    label: 'Chave Aleatória',
    icon: 'key-outline',
    originalAction: 'abrirModal(6)',
  },
  {
    id: 'copy_paste',
    label: 'Copia\ne Cola',
    icon: 'copy-outline',
    originalAction: 'abrirModal(7)',
  },
  { id: 'agency_account', label: 'Agência e Conta', icon: 'business-outline', originalAction: 'abrirModal(8)' },
];

const RECEIVE_OPTIONS = [
  { id: 'my_qr', label: 'Meu QR Code', icon: 'qr-code-outline', originalAction: 'abrirModal(0)' },
  { id: 'copy_paste_receive', label: 'Copia e Cola', icon: 'copy-outline', originalAction: 'abrirModal(0)' },
];

const MANAGE_OPTIONS = [
  { id: 'my_keys', label: 'Minhas Chaves', icon: 'key-outline', route: 'PixKeys' },
  { id: 'scheduled', label: 'Agendamentos', icon: 'calendar-outline', route: 'PixScheduled' },
  { id: 'limits', label: 'Limites Pix', icon: 'speedometer-outline', route: 'PixLimits' },
  { id: 'receipts', label: 'Comprovantes', icon: 'receipt-outline', route: 'PixReceiptsList' },
];

function PixOption({ item, cardWidth, onPress }) {
  return (
    <ServiceCard
      accessibilityHint={item.originalAction ? `Ação original: ${item.originalAction}` : undefined}
      icon={<Icon color={colors.purple300} name={item.icon} size={20} />}
      label={item.label}
      onPress={onPress}
      style={[styles.optionCard, { width: cardWidth }]}
    />
  );
}

export default function PixScreen({ navigation }) {
  const width = useAppWidth();
  const cardWidth = (width - 60) / 2;

  const openPayOption = (item) => {
    if (item.id === 'qr_code') {
      navigation.navigate('PixQrScanner');
    } else if (item.id === 'agency_account') {
      navigation.navigate('PixAgencyAccount');
    } else {
      navigation.navigate('PixKeyEntry', { type: item.id });
    }
  };

  return (
    <Screen atmospheric backgroundSource={require('../../assets/ctbx-pix-background.png')} contentContainerStyle={styles.screenContent} gradient={false}>
      <AppHeader
        leftContent={<Icon color={colors.textPrimary} name="chevron-back" size={24} />}
        onLeftPress={() => navigation.goBack()}
        title="PIX"
      />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pixContainer}>
          <Card elevated={false} style={styles.heroCard}>
            <View style={styles.heroIcon}><Icon color={colors.purple300} name="flash-outline" size={26} /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Pix CTBX</Text>
              <Text style={styles.heroSubtitle}>Transfira e receba em poucos segundos.</Text>
            </View>
          </Card>

          <View style={styles.paySection}>
            <SectionTitle style={styles.sectionTitle} title="Enviar" />
            <View style={styles.quickRow}>
              {QUICK_SEND_OPTIONS.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => navigation.navigate(item.route)} style={styles.quickChip}>
                  <Icon color={colors.purple300} name={item.icon} size={16} />
                  <Text style={styles.quickChipText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subheading}>Como deseja enviar?</Text>
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
            <View style={styles.optionsGrid}>
              {RECEIVE_OPTIONS.map((item) => (
                <PixOption
                  key={item.id}
                  cardWidth={cardWidth}
                  item={item}
                  onPress={() => navigation.navigate('PixReceive')}
                />
              ))}
            </View>
          </View>

          <View style={styles.receiveSection}>
            <SectionTitle style={styles.sectionTitle} title="Gerenciar Pix" />
            <View style={styles.optionsGrid}>
              {MANAGE_OPTIONS.map((item) => (
                <PixOption
                  key={item.id}
                  cardWidth={cardWidth}
                  item={item}
                  onPress={() => navigation.navigate(item.route)}
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
              <Icon color={colors.purple300} name="chevron-forward" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => Alert.alert('Banco Central', 'A abertura do endereço externo será conectada na etapa de integrações.')}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>
                Registrar reclamação no Banco Central
              </Text>
              <Icon color={colors.purple300} name="chevron-forward" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0 },
  content: { backgroundColor: 'transparent', flexGrow: 1 },
  pixContainer: {
    backgroundColor: 'transparent',
    borderBottomEndRadius: 20,
    borderBottomStartRadius: 20,
    paddingBottom: spacing.xxl,
  },
  heroCard: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(99, 102, 241, 0.35)', borderWidth: 1, flexDirection: 'row', margin: spacing.xl, marginBottom: spacing.md, padding: spacing.xl, shadowColor: '#5946C8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 6 },
  heroIcon: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: radii.lg, height: 56, justifyContent: 'center', width: 56 },
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
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickChip: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(99, 102, 241, 0.35)', borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  quickChipText: { color: colors.purple300, fontSize: 12, fontWeight: '700' },
  subheading: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 5,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 43, 76, 0.72)',
    borderColor: 'rgba(92, 142, 220, 0.10)',
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 88,
    justifyContent: 'center',
    margin: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 4,
  },
  receiveSection: {
    marginBottom: 10,
    marginTop: 25,
    paddingHorizontal: spacing.lg,
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
    backgroundColor: 'rgba(12, 43, 76, 0.6)',
    borderColor: 'rgba(92, 142, 220, 0.10)',
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
});
