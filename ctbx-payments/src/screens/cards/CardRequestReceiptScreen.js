import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import { CARD_COLOR_ASSETS } from '../../components/cards/FinancialCard';
import { Card, ConfirmationButton, Icon, MissingDataState } from '../../components/ui';
import { isSandboxMode } from '../../config';
import { colors, radii, spacing, typography } from '../../theme';

const PAYMENT_CARD_ASPECT_RATIO = 1638 / 960;

export default function CardRequestReceiptScreen({ navigation, route }) {
  const request = route.params?.request;
  if (!request) return <MissingDataState navigation={navigation} title="Cartão solicitado" />;

  return (
    <CardScreenLayout navigation={navigation} title="Cartão solicitado">
      <View style={styles.wrap}>
        <View style={styles.successArea}>
          <Icon color={colors.purple400} name="checkmark-circle" size={52} />
          <Text style={styles.title}>Cartão solicitado com sucesso!</Text>
          
        </View>

        <View style={styles.previewFrame}>
          <Image resizeMode="cover" source={CARD_COLOR_ASSETS[request.colorId] || CARD_COLOR_ASSETS.blue} style={styles.preview} />
        </View>

        <Card elevated={false} style={styles.card}>
          <Row label="Cor escolhida" value={request.colorLabel} />
          <Row label="Titular" value={request.holderName} />
          <Row label="Protocolo" value={request.protocol} last />
        </Card>

        <Text style={styles.note}>Tarifa, prazo de entrega e disponibilidade dependem da API original.</Text>

        <ConfirmationButton onPress={() => navigation.navigate('Cards')}>Voltar aos cartões</ConfirmationButton>
      </View>
    </CardScreenLayout>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, padding: spacing.lg },
  successArea: { alignItems: 'center', marginTop: spacing.md },
  title: { ...typography.heading2, color: colors.textPrimary, marginTop: spacing.sm, textAlign: 'center' },
  demo: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  previewFrame: { aspectRatio: PAYMENT_CARD_ASPECT_RATIO, borderRadius: radii.xl, overflow: 'hidden', width: '100%' },
  preview: { height: '100%', width: '100%' },
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  row: { borderBottomColor: 'rgba(92, 142, 220, 0.10)', borderBottomWidth: 1, paddingVertical: spacing.sm },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { ...typography.caption, color: colors.textSecondary },
  rowValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 3 },
  note: { ...typography.caption, color: colors.orange500, textAlign: 'center' },
});
