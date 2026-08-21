import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import VirtualCard, { VIRTUAL_CARD_ASPECT_RATIO, VIRTUAL_CARD_COLOR_ASSETS } from '../../components/cards/VirtualCard';
import { Card, ConfirmationButton, Icon, PrimaryButton } from '../../components/ui';
import { createVirtualCard } from '../../services/cardService';
import { colors, radii, spacing, typography } from '../../theme';
import { validMoney } from '../../utils/cardUtils';

const COLOR_OPTIONS = [
  { id: 'Roxo', label: 'Roxo (padrão)' },
  { id: 'Verde', label: 'Verde' },
  { id: 'Preto', label: 'Preto' },
  { id: 'Dourado', label: 'Dourado' },
];

const CHECKLIST = [
  'Cartão válido para compras online e presenciais',
  'Você pode bloquear ou excluir a qualquer momento',
  'Os dados do cartão ficam ocultos até você visualizá-los',
];

export default function CardVirtualCreateScreen({ navigation }) {
  const [colorId, setColorId] = useState('Roxo');
  const [limit, setLimit] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const previewCard = { color: colorId, lastFour: '4587', holder: 'SEU NOME', expiry: '••/••', statusKey: 'ACTIVE' };

  const submit = async () => {
    if (!validMoney(limit)) return Alert.alert('Limite inválido', 'Informe um limite maior que zero.');
    try {
      setSubmitting(true);
      const card = await createVirtualCard({ color: colorId, nickname: nickname.trim(), limit });
      setCreated(card);
    } catch (error) {
      Alert.alert('Não foi possível criar o cartão', error?.message || 'Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <CardScreenLayout navigation={navigation} title="Criar cartão virtual">
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Icon color={colors.success} name="checkmark" size={32} /></View>
          <Text style={styles.successTitle}>Cartão criado com sucesso!</Text>
          <Text style={styles.successCopy}>Seu cartão virtual está pronto para usar.</Text>
          <PrimaryButton onPress={() => navigation.replace('Cards', { tab: 'virtual' })}>Ver meus cartões</PrimaryButton>
        </View>
      </CardScreenLayout>
    );
  }

  return (
    <CardScreenLayout navigation={navigation} title="Criar cartão virtual">
      <View style={styles.wrap}>
        <Text style={styles.headline}>Crie um cartão virtual</Text>
        <Text style={styles.copy}>Use para compras online, assinaturas e pagamentos recorrentes com mais segurança.</Text>
        <VirtualCard card={previewCard} />
        <Card elevated={false} style={styles.formCard}>
          <Text style={styles.label}>Limite do cartão</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setLimit} placeholder="R$ 0,00" placeholderTextColor={colors.textMuted} style={styles.input} value={limit} />
          <Text style={styles.label}>Apelido do cartão (opcional)</Text>
          <TextInput maxLength={60} onChangeText={setNickname} placeholder="Ex.: Assinaturas" placeholderTextColor={colors.textMuted} style={styles.input} value={nickname} />
          <Text style={styles.label}>Cor do cartão</Text>
          <View style={styles.colors}>
            {COLOR_OPTIONS.map((item) => {
              const selected = item.id === colorId;
              return (
                <TouchableOpacity accessibilityRole="button" key={item.id} onPress={() => setColorId(item.id)} style={[styles.choice, selected && styles.choiceSelected]}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <Image resizeMode="cover" source={VIRTUAL_CARD_COLOR_ASSETS[item.id]} style={styles.thumb} />
                  <Text style={styles.choiceText}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
        <Card elevated={false} style={styles.formCard}>
          <Text style={styles.label}>Importante</Text>
          {CHECKLIST.map((item) => (
            <View key={item} style={styles.checkRow}>
              <Icon color={colors.success} name="checkmark-circle" size={16} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </Card>
        <ConfirmationButton disabled={submitting} loading={submitting} onPress={submit}>Criar cartão virtual</ConfirmationButton>
      </View>
    </CardScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, padding: spacing.lg },
  headline: { ...typography.heading2, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary },
  formCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, gap: spacing.sm, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  label: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '700', marginTop: spacing.sm },
  input: { backgroundColor: 'rgba(16, 51, 85, 0.72)', borderColor: 'rgba(92, 142, 220, 0.08)', borderRadius: 14, borderWidth: 1, color: colors.textPrimary, padding: spacing.md },
  colors: { gap: spacing.sm, marginTop: spacing.xs },
  choice: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', padding: spacing.sm },
  choiceSelected: { borderColor: colors.purple500 },
  radio: { alignItems: 'center', borderColor: colors.borderStrong, borderRadius: 10, borderWidth: 1.5, height: 20, justifyContent: 'center', marginRight: spacing.md, width: 20 },
  radioSelected: { borderColor: colors.purple400 },
  radioDot: { backgroundColor: colors.purple400, borderRadius: 5, height: 10, width: 10 },
  thumb: { borderRadius: radii.sm, height: 88 / VIRTUAL_CARD_ASPECT_RATIO, marginRight: spacing.md, width: 88 },
  choiceText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  checkText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  successWrap: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl, paddingTop: spacing.xxxl },
  successIcon: { alignItems: 'center', backgroundColor: colors.successAlpha20, borderRadius: 999, height: 64, justifyContent: 'center', width: 64 },
  successTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: 'center' },
  successCopy: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
});
