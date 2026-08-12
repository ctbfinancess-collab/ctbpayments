import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import TransferLayout from '../../components/transfers/TransferLayout';
import { TransferField } from '../../components/transfers/TransferForm';
import { ConfirmationButton, MissingDataState, OutlineButton } from '../../components/ui';
import useAsyncAction from '../../hooks/useAsyncAction';
import { authorizeTransfer, scheduleTransfer } from '../../services/transferService';
import { colors, spacing, typography } from '../../theme';

export default function TransferAuthorizationScreen({ navigation, route }) {
  const transfer = route.params?.transfer; const [password, setPassword] = useState(''); const [otp, setOtp] = useState(''); const [requested, setRequested] = useState(false);
  const { execute: submitTransfer, loading } = useAsyncAction(transfer?.scheduled ? scheduleTransfer : authorizeTransfer);
  if (!transfer) return <MissingDataState navigation={navigation} title="Autorizar transferência" />;
  const request = () => { setRequested(true); Alert.alert('Token de demonstração', 'Digite qualquer código de 6 dígitos.'); };
  const authorize = async () => { if (password.length < 4) return Alert.alert('Digite sua senha'); if (!requested) return request(); if (!/^\d{6}$/.test(otp)) return Alert.alert('Token inválido'); try { const authorizedTransfer = await submitTransfer(transfer); if (authorizedTransfer) navigation.replace('TransferReceipt', { transfer: authorizedTransfer }); } catch { Alert.alert('Serviço indisponível', 'Não foi possível autorizar a transferência agora.'); } };
  return <TransferLayout navigation={navigation} title="Autorizar transferência"><Text style={styles.value}>R$ {transfer.amount}</Text><Text style={styles.recipient}>Para {transfer.beneficiary.name}</Text><TransferField keyboardType="numeric" label="Senha de transferência" maxLength={6} onChangeText={setPassword} secureTextEntry value={password} />{requested ? <TransferField keyboardType="numeric" label="Token" maxLength={6} onChangeText={setOtp} value={otp} /> : <OutlineButton onPress={request}>Enviar token</OutlineButton>}<ConfirmationButton disabled={loading} loading={loading} onPress={authorize} style={styles.confirm}>Transferir</ConfirmationButton><Text style={styles.mock}>Senha, token, biometria e envio bancário simulados.</Text></TransferLayout>;
}
const styles = StyleSheet.create({ value: { ...typography.display, color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }, recipient: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xxl, marginTop: spacing.sm, textAlign: 'center' }, confirm: { marginTop: spacing.md }, mock: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' } });
