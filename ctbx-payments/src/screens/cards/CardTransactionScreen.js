import React, { useCallback } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import { Card, Divider, ErrorState, LoadingState, MissingDataState, OutlineButton } from '../../components/ui';
import useAsyncResource from '../../hooks/useAsyncResource';
import { getCardTransaction } from '../../services/cardService';
import { colors, spacing, typography } from '../../theme';

const Row = ({ a, b }) => <View style={styles.row}><Text style={styles.label}>{a}</Text><Text style={styles.value}>{b}</Text></View>;

export default function CardTransactionScreen({ navigation, route }) {
  const transaction = route.params?.transaction;
  const load = useCallback(() => getCardTransaction(transaction), [transaction]);
  const { data: item, error, loading, retry } = useAsyncResource(load);
  if (!transaction) return <MissingDataState navigation={navigation} title="Detalhe da compra" />;
  if (loading) return <CardScreenLayout navigation={navigation} title="Detalhe da compra"><LoadingState /></CardScreenLayout>;
  if (error?.status === 404) return <MissingDataState navigation={navigation} title="Transação não encontrada" />;
  if (error) return <CardScreenLayout navigation={navigation} title="Detalhe da compra"><ErrorState message="Não foi possível carregar a transação." onRetry={retry} /></CardScreenLayout>;
  if (!item) return <MissingDataState navigation={navigation} title="Transação não encontrada" />;
  return <CardScreenLayout navigation={navigation} title="Detalhe da compra"><View style={styles.wrap}><Card><Text style={styles.status}>{item.status}</Text><Text style={styles.amount}>{item.value}</Text><Divider /><Row a="Estabelecimento" b={item.title || '—'} /><Row a="Data e hora" b={item.date || '—'} /><Row a="Autorização" b={item.authorization || '—'} /><Row a="Cartão" b={`•••• ${item.cardId ? '4821' : '—'}`} /></Card><OutlineButton title="Compartilhar dados" onPress={() => Share.share({ message: `${item.title}\n${item.value}\n${item.authorization}` })} /></View></CardScreenLayout>;
}

const styles = StyleSheet.create({ wrap: { gap: spacing.lg, padding: spacing.lg }, status: { color: colors.success, fontWeight: '800', textAlign: 'center' }, amount: { ...typography.display, color: colors.textPrimary, marginVertical: spacing.lg, textAlign: 'center' }, row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }, label: { color: colors.textSecondary }, value: { color: colors.textPrimary, fontWeight: '600', maxWidth: '58%', textAlign: 'right' } });
