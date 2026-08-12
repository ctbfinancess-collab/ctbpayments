import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import TransferLayout from '../../components/transfers/TransferLayout';
import { TransferField, TransferInfoRow, TransferToggle } from '../../components/transfers/TransferForm';
import { BalanceCard, Card, MissingDataState, PrimaryButton } from '../../components/ui';
import { getTransferDetailsData } from '../../services/transferService'; import useAsyncResource from '../../hooks/useAsyncResource';
import { colors, spacing, typography } from '../../theme';
import { transferCurrencyToNumber, validateScheduleDate } from '../../utils/transferValidation';

export default function TransferDetailsScreen({ navigation, route }) {
  const {data: detailsData} = useAsyncResource(getTransferDetailsData, {balance: '', fee: '0,00', purposes: ['Outros']}); const beneficiary = route.params?.beneficiary; const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const [purpose, setPurpose] = useState('Outros'); const [favorite, setFavorite] = useState(false); const [scheduled, setScheduled] = useState(false); const [date, setDate] = useState(''); const [showBalance, setShowBalance] = useState(false);
  if (!beneficiary) return <MissingDataState navigation={navigation} title="Transferência" />;
  const continueFlow = () => { if (transferCurrencyToNumber(amount) <= 0) return Alert.alert('Digite o valor da transferência'); if (scheduled && !validateScheduleDate(date)) return Alert.alert('Informe uma data válida no formato DD/MM/AAAA'); navigation.navigate('TransferReview', { transfer: { id: `DEMO-TR-${Date.now()}`, beneficiary, amount, description, purpose, favorite, scheduled, date, fee: detailsData.fee } }); };
  return <TransferLayout navigation={navigation} title="Dados da transferência">
    <BalanceCard label="Saldo digital" onToggleVisibility={() => setShowBalance((v) => !v)} style={styles.balance} value={detailsData.balance} variant="blue" visible={showBalance} />
    <Card style={styles.person}><TransferInfoRow label="Favorecido" value={beneficiary.name} /><TransferInfoRow label="Instituição" value={beneficiary.bank} last /></Card>
    <TransferField keyboardType="decimal-pad" label="Quanto quer transferir?" onChangeText={setAmount} placeholder="R$ 0,00" value={amount} />
    <TransferField label="Finalidade" onChangeText={setPurpose} value={purpose} />
    <TransferField label="Descrição" multiline onChangeText={setDescription} value={description} />
    <TransferToggle label="Salvar favorecido" onPress={() => setFavorite((v) => !v)} selected={favorite} />
    <TransferToggle label="Agendar transferência" onPress={() => setScheduled((v) => !v)} selected={scheduled} />
    {scheduled ? <TransferField keyboardType="numeric" label="Data da transferência" onChangeText={setDate} placeholder="DD/MM/AAAA" value={date} /> : null}
    <PrimaryButton onPress={continueFlow}>Continuar</PrimaryButton><Text style={styles.fee}>Tarifa simulada: R$ {detailsData.fee}</Text>
  </TransferLayout>;
}
const styles = StyleSheet.create({ balance: { marginBottom: spacing.lg }, person: { marginBottom: spacing.xl, padding: spacing.lg }, fee: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' } });
