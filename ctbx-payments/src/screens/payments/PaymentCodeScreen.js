import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import PaymentLayout from '../../components/payments/PaymentLayout';
import { PaymentField } from '../../components/payments/PaymentForm';
import { PrimaryButton } from '../../components/ui';
import { buildMockBill } from '../../data/paymentMockData';
import { colors, spacing, typography } from '../../theme';
import { onlyPaymentDigits, validatePaymentCode } from '../../utils/paymentValidation';
export default function PaymentCodeScreen({ navigation, route }) { const [code, setCode] = useState(route.params?.code || ''); const submit = () => { if (!validatePaymentCode(code)) return Alert.alert('Código de barras inválido', 'Informe uma linha digitável válida.'); navigation.navigate('PaymentDetails', { bill: buildMockBill(onlyPaymentDigits(code)), installment: Boolean(route.params?.installment) }); }; return <PaymentLayout navigation={navigation} title="Código de barras"><Text style={styles.title}>Digite o código de barras</Text><Text style={styles.subtitle}>Informe a linha digitável com atenção.</Text><PaymentField keyboardType="numeric" label="Linha digitável" multiline onChangeText={setCode} value={code} /><PrimaryButton onPress={() => setCode('')} style={styles.clear}>Limpar</PrimaryButton><PrimaryButton onPress={submit} style={styles.continue}>Continuar</PrimaryButton><Text style={styles.mock}>A consulta do boleto será simulada após a validação local.</Text></PaymentLayout>; }
const styles = StyleSheet.create({ title: { ...typography.heading2, color: colors.textPrimary }, subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl, marginTop: spacing.sm }, clear: { marginBottom: spacing.sm }, continue: { marginTop: spacing.sm }, mock: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' } });
