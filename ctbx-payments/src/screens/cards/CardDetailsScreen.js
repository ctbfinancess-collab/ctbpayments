import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import FinancialCard from '../../components/cards/FinancialCard';
import { Card, Divider, EmptyState, ErrorState, LoadingState, OutlineButton, PrimaryButton } from '../../components/ui';
import useAsyncResource from '../../hooks/useAsyncResource';
import { getCard } from '../../services/cardService';
import { colors, spacing, typography } from '../../theme';

const Row = ({ label, value }) => <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
export default function CardDetailsScreen({ navigation }) {
  const { data: card, error, loading, retry } = useAsyncResource(getCard);
  if (loading) return <CardScreenLayout navigation={navigation} title="Detalhes do cartão"><LoadingState /></CardScreenLayout>;
  if (error) return <CardScreenLayout navigation={navigation} title="Detalhes do cartão"><ErrorState message="Não foi possível carregar o cartão." onRetry={retry} /></CardScreenLayout>;
  if (!card) return <CardScreenLayout navigation={navigation} title="Detalhes do cartão"><EmptyState message="Cartão não encontrado." /></CardScreenLayout>;
  return <CardScreenLayout navigation={navigation} title="Detalhes do cartão"><View style={styles.wrap}><FinancialCard card={card} /><Card elevated={false} style={styles.info}><Row label="Status" value={card.status} /><Divider /><Row label="Bandeira" value={card.brand} /><Divider /><Row label="Final" value={card.lastFour} /></Card><PrimaryButton onPress={() => navigation.navigate('CardStatement', { cardId: card.id })}>Ver extrato</PrimaryButton><OutlineButton onPress={() => navigation.navigate('CardReceipts', { cardId: card.id })}>Comprovantes</OutlineButton></View></CardScreenLayout>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.md, padding: spacing.lg }, info: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, gap: spacing.md, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, label: { ...typography.body, color: colors.textSecondary }, value: { ...typography.body, color: colors.textPrimary, fontWeight: '700' } });
