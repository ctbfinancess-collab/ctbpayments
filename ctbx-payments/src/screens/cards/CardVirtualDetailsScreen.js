import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import VirtualCard from '../../components/cards/VirtualCard';
import { Card, Divider, EmptyState, ErrorState, Icon, LoadingState, OutlineButton, PrimaryButton } from '../../components/ui';
import useAsyncResource from '../../hooks/useAsyncResource';
import {
  blockVirtualCard, cancelVirtualCard, getVirtualCard, recreateVirtualCard, revealVirtualCardData, setVirtualCardLimit, unblockVirtualCard,
} from '../../services/cardService';
import { colors, spacing, typography } from '../../theme';
import { validMoney } from '../../utils/cardUtils';

// Dados revelados somem sozinhos depois de um tempo, mesmo sem o usuário
// tocar em nada — "após timeout, voltar a mascarar automaticamente".
const REVEAL_TIMEOUT_MS = 20_000;

const Row = ({ label, value }) => <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;

export default function CardVirtualDetailsScreen({ navigation, route }) {
  const cardId = route.params?.cardId;
  const loader = React.useCallback(() => getVirtualCard(cardId), [cardId]);
  const { data: card, error, loading, retry } = useAsyncResource(loader);
  const [limitDraft, setLimitDraft] = useState('');
  const [editingLimit, setEditingLimit] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [recreating, setRecreating] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState(null); // { number, cvv } | null
  const revealTimer = useRef(null);

  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

  if (loading) return <CardScreenLayout navigation={navigation} title="Detalhes do cartão"><LoadingState /></CardScreenLayout>;
  if (error) return <CardScreenLayout navigation={navigation} title="Detalhes do cartão"><ErrorState message="Não foi possível carregar o cartão virtual." onRetry={retry} /></CardScreenLayout>;
  if (!card) return <CardScreenLayout navigation={navigation} title="Detalhes do cartão"><EmptyState message="Cartão virtual não encontrado." /></CardScreenLayout>;

  const hideData = () => {
    if (revealTimer.current) { clearTimeout(revealTimer.current); revealTimer.current = null; }
    setRevealed(null);
  };
  const toggleReveal = async () => {
    if (revealed) return hideData();
    try {
      setRevealing(true);
      const data = await revealVirtualCardData(card.id);
      setRevealed({ number: data.number, cvv: data.cvv });
      revealTimer.current = setTimeout(hideData, REVEAL_TIMEOUT_MS);
    } catch (submitError) {
      Alert.alert('Não foi possível revelar os dados', submitError?.message || 'Tente novamente em instantes.');
    } finally {
      setRevealing(false);
    }
  };

  const startEditLimit = () => { setLimitDraft(''); setEditingLimit(true); };
  const saveLimit = async () => {
    if (!validMoney(limitDraft)) return Alert.alert('Limite inválido', 'Informe um limite maior que zero.');
    try {
      setSavingLimit(true);
      await setVirtualCardLimit(card.id, limitDraft);
      setEditingLimit(false);
      retry();
    } catch (submitError) {
      Alert.alert('Não foi possível ajustar o limite', submitError?.message || 'Tente novamente em instantes.');
    } finally {
      setSavingLimit(false);
    }
  };

  const toggleBlocked = async () => {
    try {
      setBlocking(true);
      if (card.statusKey === 'BLOCKED') await unblockVirtualCard(card.id);
      else await blockVirtualCard(card.id);
      retry();
    } catch (submitError) {
      Alert.alert('Não foi possível atualizar o cartão', submitError?.message || 'Tente novamente em instantes.');
    } finally {
      setBlocking(false);
    }
  };

  const confirmRecreate = () => Alert.alert(
    'Recriar cartão virtual',
    'Isso gera um número, CVV e validade novos pra este cartão — os dados atuais deixam de funcionar. O limite e o apelido continuam os mesmos. Deseja continuar?',
    [{ text: 'Voltar', style: 'cancel' }, { text: 'Recriar cartão', onPress: doRecreate }],
  );
  const doRecreate = async () => {
    try {
      setRecreating(true);
      hideData();
      await recreateVirtualCard(card.id);
      retry();
      Alert.alert('Cartão recriado', 'O cartão tem dados novos agora — o número anterior não funciona mais.');
    } catch (submitError) {
      Alert.alert('Não foi possível recriar o cartão', submitError?.message || 'Tente novamente em instantes.');
    } finally {
      setRecreating(false);
    }
  };

  const confirmCancel = () => Alert.alert(
    'Excluir cartão virtual',
    'Esta ação cancela o cartão de vez — não é possível desfazer. Deseja continuar?',
    [{ text: 'Voltar', style: 'cancel' }, { text: 'Excluir cartão', style: 'destructive', onPress: doCancel }],
  );
  const doCancel = async () => {
    try {
      setCancelling(true);
      await cancelVirtualCard(card.id);
      navigation.goBack();
    } catch (submitError) {
      Alert.alert('Não foi possível excluir o cartão', submitError?.message || 'Tente novamente em instantes.');
    } finally {
      setCancelling(false);
    }
  };

  const cancelled = card.statusKey === 'CANCELLED';
  const displayCard = revealed ? { ...card, number: revealed.number } : card;

  return (
    <CardScreenLayout navigation={navigation} title="Detalhes do cartão">
      <View style={styles.wrap}>
        <VirtualCard card={displayCard} revealed={Boolean(revealed)} />
        <OutlineButton disabled={cancelled || revealing} loading={revealing} onPress={toggleReveal}>
          {revealed ? 'Ocultar dados do cartão' : 'Mostrar dados do cartão'}
        </OutlineButton>
        {revealed ? (
          <Card elevated={false} style={styles.info}>
            <Row label="CVV" value={revealed.cvv} />
            <Text style={styles.revealNote}>Os dados ficam visíveis por um tempo curto e depois voltam a ficar ocultos automaticamente.</Text>
          </Card>
        ) : (
          <View style={styles.hintRow}>
            <Icon color={colors.textMuted} name="eye-off-outline" size={14} />
            <Text style={styles.hint}>Para sua segurança, seus dados ficam ocultos até você visualizá-los.</Text>
          </View>
        )}
        <Card elevated={false} style={styles.info}>
          {card.nickname ? <><Row label="Apelido" value={card.nickname} /><Divider /></> : null}
          <Row label="Status" value={card.status} />
          <Divider />
          <Row label="Limite do cartão" value={card.limit} />
          <Divider />
          <Row label="Limite utilizado" value={card.used} />
          <Divider />
          <Row label="Limite disponível" value={card.balance} />
        </Card>
        {editingLimit ? (
          <Card elevated={false} style={styles.info}>
            <Text style={styles.editLabel}>Novo limite</Text>
            <TextInput keyboardType="decimal-pad" onChangeText={setLimitDraft} placeholder="R$ 0,00" placeholderTextColor={colors.textMuted} style={styles.input} value={limitDraft} />
            <View style={styles.editActions}>
              <OutlineButton onPress={() => setEditingLimit(false)}>Cancelar</OutlineButton>
              <PrimaryButton disabled={savingLimit} loading={savingLimit} onPress={saveLimit}>Salvar limite</PrimaryButton>
            </View>
          </Card>
        ) : null}
        <PrimaryButton onPress={() => navigation.navigate('CardVirtualTransactions', { cardId: card.id })}>Ver transações</PrimaryButton>
        <OutlineButton disabled={cancelled || editingLimit} onPress={startEditLimit}>Ajustar limite</OutlineButton>
        <OutlineButton disabled={cancelled || blocking} loading={blocking} onPress={toggleBlocked}>{card.statusKey === 'BLOCKED' ? 'Desbloquear cartão' : 'Bloquear cartão'}</OutlineButton>
        <OutlineButton disabled={cancelled || recreating} loading={recreating} onPress={confirmRecreate}>Recriar cartão</OutlineButton>
        <OutlineButton disabled={cancelled || cancelling} loading={cancelling} onPress={confirmCancel}>Excluir cartão</OutlineButton>
      </View>
    </CardScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, padding: spacing.lg },
  info: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, gap: spacing.md, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.body, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  editLabel: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '700' },
  input: { backgroundColor: 'rgba(16, 51, 85, 0.72)', borderColor: 'rgba(92, 142, 220, 0.08)', borderRadius: 14, borderWidth: 1, color: colors.textPrimary, padding: spacing.md },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  revealNote: { ...typography.caption, color: colors.textMuted },
  hintRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xs },
  hint: { ...typography.caption, color: colors.textMuted, flex: 1 },
});
