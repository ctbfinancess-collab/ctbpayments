import React, { useState } from 'react'; import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; import CardScreenLayout from '../../components/cards/CardScreenLayout'; import FinancialCard, { CARD_COLOR_ASSETS } from '../../components/cards/FinancialCard'; import { Card, ConfirmationButton, EmptyState, ErrorState, Icon, LoadingState } from '../../components/ui'; import { getCards, requestCard } from '../../services/cardService'; import useAsyncResource from '../../hooks/useAsyncResource'; import { colors, radii, spacing, typography } from '../../theme';


const CARD_COLOR_OPTIONS = [
  { id: 'blue', label: 'Azul' },
  { id: 'orange', label: 'Laranja' },
  { id: 'green', label: 'Verde' },
  { id: 'purple', label: 'Roxo' },
  { id: 'black', label: 'Preto' },
];
const PAYMENT_CARD_ASPECT_RATIO = 1638 / 960;

export default function CardRequestScreen({ navigation }) {
  const [colorId, setColorId] = useState('blue');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: cards, error, loading, retry } = useAsyncResource(getCards, []);
  const selectedLabel = CARD_COLOR_OPTIONS.find((item) => item.id === colorId)?.label;
  const submit = async () => {
    if (!accepted) return Alert.alert('Aceite os termos', 'Marque a caixa de aceite dos termos do cartão para continuar.');
    try {
      setSubmitting(true);
      const result = await requestCard({ color: selectedLabel });
      navigation.replace('CardRequestReceipt', {
        request: {
          colorId,
          colorLabel: selectedLabel,
          holderName: cards[0]?.holder || 'CLIENTE DEMONSTRAÇÃO',
          protocol: result?.protocol || result?.id || `DEMO-CARD-${Date.now()}`,
        },
      });
    } catch (submitError) {
      Alert.alert('Serviço indisponível', submitError?.message || 'A solicitação de cartão ainda não está configurada.');
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <CardScreenLayout navigation={navigation} title="Solicitar cartão"><LoadingState /></CardScreenLayout>;
  if (error) return <CardScreenLayout navigation={navigation} title="Solicitar cartão"><ErrorState message="Não foi possível carregar os dados do cartão." onRetry={retry} /></CardScreenLayout>;
  const card = cards[0];
  if (!card) return <CardScreenLayout navigation={navigation} title="Solicitar cartão"><EmptyState message="Dados do cartão indisponíveis." /></CardScreenLayout>;
  return (
    <CardScreenLayout navigation={navigation} title="Solicitar cartão">
      <View style={styles.wrap}>
        <Text style={styles.copy}>Escolha a cor, consulte a tarifa e aceite o termo do cartão.</Text>
        <FinancialCard card={card} color={colorId} />
        <Card elevated={false} style={styles.card}>
          <Text style={styles.title}>Cor do cartão</Text>
          <View style={styles.colors}>
            {CARD_COLOR_OPTIONS.map((item) => {
              const selected = item.id === colorId;
              return (
                <TouchableOpacity accessibilityRole="button" key={item.id} onPress={() => setColorId(item.id)} style={[styles.choice, selected && styles.choiceSelected]}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <Image resizeMode="cover" source={CARD_COLOR_ASSETS[item.id]} style={styles.thumb} />
                  <Text style={styles.choiceText}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted((current) => !current)} style={styles.termsRow}>
            <Icon color={accepted ? colors.purple400 : colors.textMuted} name={accepted ? 'checkbox' : 'square-outline'} size={16} />
            <Text style={styles.terms}>Li e aceito os termos do cartão. Tarifa e disponibilidade dependem da API original.</Text>
          </TouchableOpacity>
        </Card>
        <ConfirmationButton disabled={submitting} loading={submitting} onPress={submit}>Solicitar cartão</ConfirmationButton>
      </View>
    </CardScreenLayout>
  );
}
const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, padding: spacing.lg },
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  copy: { ...typography.body, color: colors.textSecondary },
  title: { ...typography.heading3, color: colors.textPrimary },
  colors: { gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  choice: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', padding: spacing.sm },
  choiceSelected: { borderColor: colors.purple500, ...{ shadowColor: '#5946C8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 3 } },
  radio: { alignItems: 'center', borderColor: colors.borderStrong, borderRadius: 10, borderWidth: 1.5, height: 20, justifyContent: 'center', marginRight: spacing.md, width: 20 },
  radioSelected: { borderColor: colors.purple400 },
  radioDot: { backgroundColor: colors.purple400, borderRadius: 5, height: 10, width: 10 },
  thumb: { borderRadius: radii.sm, height: 88 / PAYMENT_CARD_ASPECT_RATIO, marginRight: spacing.md, width: 88 },
  choiceText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  termsRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs },
  terms: { ...typography.caption, color: colors.textSecondary, flex: 1 },
});
