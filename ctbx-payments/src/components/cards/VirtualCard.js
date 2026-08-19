import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../ui';
import { colors, radii, spacing, typography } from '../../theme';

// Fundos por cor — mesmo padrão de CARD_COLOR_ASSETS em FinancialCard.js,
// mas com arte própria pro cartão virtual. "Roxo" é a cor padrão (mesma
// convenção do seletor de cor na criação).
export const VIRTUAL_CARD_COLOR_ASSETS = {
  Roxo: require('../../../assets/ctbx-card-virtual-purple.png'),
  Verde: require('../../../assets/ctbx-card-virtual-green.png'),
  Preto: require('../../../assets/ctbx-card-virtual-black.png'),
  Dourado: require('../../../assets/ctbx-card-virtual-gold.png'),
  Azul: require('../../../assets/ctbx-card-virtual-blue.png'),
};
export const VIRTUAL_CARD_ASPECT_RATIO = 1536 / 1024;

// Overlay aplicado sobre o cartão pra estados diferentes de "ativo" — a cor
// de fundo já muda a identidade do cartão, então "bloqueado"/"cancelado"
// usam o mesmo escurecimento + ícone central, igual à referência visual.
const STATUS_OVERLAY = {
  BLOCKED: { icon: 'lock-closed', label: 'Bloqueado temporariamente' },
  CANCELLED: { icon: 'close-circle', label: 'Cancelado' },
};

// number completo só existe depois da etapa de "revelar dados" (challenge) —
// até lá, revealed nunca vem true e o cartão mostra só o final mascarado.
export default function VirtualCard({ card, revealed = false }) {
  const overlay = STATUS_OVERLAY[card.statusKey];
  const maskedNumber = revealed && card.number
    ? card.number.replace(/(.{4})/g, '$1 ').trim()
    : `•••• •••• •••• ${card.lastFour}`;
  return (
    <View style={styles.card}>
      <Image resizeMode="cover" source={VIRTUAL_CARD_COLOR_ASSETS[card.color] || VIRTUAL_CARD_COLOR_ASSETS.Roxo} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Icon color={colors.textPrimary} name="diamond-outline" size={11} />
            <Text style={styles.badgeText}>Virtual</Text>
          </View>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>CTBX</Text>
            <Text style={styles.brandSub}>PAYMENTS</Text>
          </View>
        </View>
        <View style={styles.middleRow}>
          <Icon color={colors.textPrimary} name="hardware-chip-outline" size={26} />
          <Icon color={colors.textPrimary} name="wifi-outline" size={18} style={styles.contactless} />
        </View>
        <Text numberOfLines={1} style={styles.number}>{maskedNumber}</Text>
        <View style={styles.bottomRow}>
          <View>
            <Text numberOfLines={1} style={styles.holder}>{card.holder}</Text>
            <Text style={styles.expiry}>Válido até {card.expiry}</Text>
          </View>
          <View style={styles.visaBlock}>
            <Text style={styles.visa}>VISA</Text>
            <Text style={styles.visaSub}>Virtual</Text>
          </View>
        </View>
      </View>
      {overlay ? (
        <View style={styles.overlay}>
          <Icon color={colors.textPrimary} name={overlay.icon} size={26} />
          <Text style={styles.overlayText}>{overlay.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: VIRTUAL_CARD_ASPECT_RATIO, backgroundColor: colors.navy800, borderColor: colors.purple400, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', width: '100%' },
  image: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  topRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  badge: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: radii.pill, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { ...typography.caption, color: colors.textPrimary, fontSize: 11 },
  brandBlock: { alignItems: 'flex-end' },
  brand: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  brandSub: { color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, marginTop: -2 },
  middleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  contactless: { transform: [{ rotate: '90deg' }] },
  number: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', letterSpacing: 1 },
  bottomRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  holder: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '700', maxWidth: 180 },
  expiry: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  visaBlock: { alignItems: 'flex-end' },
  visa: { color: colors.textPrimary, fontSize: 18, fontStyle: 'italic', fontWeight: '800' },
  visaSub: { color: colors.textSecondary, fontSize: 10, marginTop: -2 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', backgroundColor: 'rgba(7, 20, 38, 0.68)', gap: spacing.xs, justifyContent: 'center' },
  overlayText: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '700' },
});
