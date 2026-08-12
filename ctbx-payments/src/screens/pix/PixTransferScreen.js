import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { InfoRow, PixButton, PixField } from '../../components/pix/PixForm';
import { getPixTransferData, validateTransfer } from '../../services/pixService'; import useAsyncResource from '../../hooks/useAsyncResource';
import { parseCurrency } from '../../utils/pixValidation';
import { isTodayOrFutureDate } from '../../utils/dateValidation';
import { MissingDataState } from '../../components/ui';

export default function PixTransferScreen({ navigation, route }) {
  const {data: pixData} = useAsyncResource(getPixTransferData, {balance: ''}); const transfer = route.params?.transfer;
  const lockedAmount = Boolean(route.params?.lockedAmount);
  const [amount, setAmount] = useState(transfer?.amount || '');
  const [message, setMessage] = useState(transfer?.message || '');
  const [favorite, setFavorite] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const continueFlow = async () => {
    if (parseCurrency(amount) <= 0) {
      Alert.alert('Preencha o valor');
      return;
    }
    if (scheduled && !isTodayOrFutureDate(scheduleDate)) {
      Alert.alert('Informe a data no formato DD/MM/AAAA');
      return;
    }
    try { const validated = await validateTransfer({ ...transfer, amount, message, favorite, scheduled, scheduleDate }); navigation.navigate('PixAuthorization', { transfer: validated }); }
    catch (error) { Alert.alert('Não foi possível validar', error?.message || 'Confira os dados do PIX.'); }
  };

  if (!transfer) return <MissingDataState navigation={navigation} title="Pix" />;
  const beneficiary = transfer.beneficiary;

  return (
    <PixLayout navigation={navigation} title="Transferência via pix">
      <View style={styles.summaryCard}>
        <InfoRow label="Favorecido" value={beneficiary.name} />
        <InfoRow label="Banco" value={beneficiary.bank} />
        <InfoRow label="Agência e Conta" value={`${beneficiary.agency} | ${beneficiary.account}`} />
        <InfoRow label="Documento" value={beneficiary.document} />
        <InfoRow label="Chave Pix" value={transfer.key} />
      </View>
      <PixField
        editable={!lockedAmount}
        keyboardType="decimal-pad"
        label="Valor"
        onChangeText={setAmount}
        placeholder="R$ 00,00"
        value={amount}
      />
      <TouchableOpacity onPress={() => setShowBalance((current) => !current)} style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Saldo disponível</Text>
        <Text style={styles.balanceValue}>{showBalance ? `R$ ${pixData.balance}` : 'R$ *******'}</Text>
      </TouchableOpacity>
      <PixField label="Mensagem" multiline onChangeText={setMessage} value={message} />
      <TouchableOpacity onPress={() => setFavorite((current) => !current)} style={styles.favoriteRow}>
        <View style={[styles.checkbox, favorite && styles.checkboxChecked]}>
          <Text style={styles.checkmark}>{favorite ? '✓' : ''}</Text>
        </View>
        <Text style={styles.favoriteText}>Salvar favorito</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setScheduled((current) => !current)} style={styles.favoriteRow}>
        <View style={[styles.checkbox, scheduled && styles.checkboxChecked]}>
          <Text style={styles.checkmark}>{scheduled ? '✓' : ''}</Text>
        </View>
        <Text style={styles.favoriteText}>Agendar Pix</Text>
      </TouchableOpacity>
      {scheduled ? (
        <PixField
          keyboardType="numeric"
          label="Data do agendamento"
          onChangeText={setScheduleDate}
          placeholder="DD/MM/AAAA"
          value={scheduleDate}
        />
      ) : null}
      <PixButton confirmation onPress={continueFlow}>TRANSFERIR</PixButton>
      <PixButton onPress={() => navigation.goBack()} secondary>CANCELAR</PixButton>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.border, borderRadius: 16, borderWidth: 1, marginBottom: 20, padding: 15 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 4 },
  balanceLabel: { color: PIX_COLORS.secondary, fontSize: 12 },
  balanceValue: { color: PIX_COLORS.text, fontSize: 13, fontWeight: '700' },
  favoriteRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  checkbox: { alignItems: 'center', borderColor: PIX_COLORS.accent, borderRadius: 3, borderWidth: 1, height: 20, justifyContent: 'center', marginRight: 9, width: 20 },
  checkboxChecked: { backgroundColor: PIX_COLORS.accent },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  favoriteText: { color: PIX_COLORS.text, fontSize: 13 },
});
