import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import CardScreenLayout from '../../components/cards/CardScreenLayout';
import { Card, ConfirmationButton, PrimaryButton } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';
import { validCardCode, validCardPassword } from '../../utils/cardUtils';
import { activateCard } from '../../services/cardService';

export default function CardActivationScreen({ navigation }) {
  const [step, setStep] = useState(0); const [value, setValue] = useState(''); const [otp, setOtp] = useState(''); const [pass, setPass] = useState(''); const [confirm, setConfirm] = useState(''); const [loading, setLoading] = useState(false);
  const next = async () => {
    if (step < 2 && !validCardCode(value)) return Alert.alert('Confira os dados', 'Digite o código solicitado.');
    if (step === 1) setOtp(value);
    if (step === 2 && (!validCardPassword(pass) || pass !== confirm)) return Alert.alert('Confira a senha', 'Use 4 números iguais nos dois campos.');
    if (step === 2) { try { setLoading(true); await activateCard({}, otp); setStep(3); } catch (error) { Alert.alert('Serviço indisponível', error?.message || 'A ativação não foi concluída.'); } finally { setLoading(false); } return; }
    setValue(''); setStep(step + 1);
  };
  return <CardScreenLayout navigation={navigation} title="Ativar cartão"><View style={styles.wrap}><Text style={styles.step}>ETAPA {Math.min(step + 1, 4)} DE 4</Text><Card elevated={false} style={styles.card}><Text style={styles.title}>{['Confirme seus dados', 'Código por SMS', 'Crie a senha do cartão', 'Cartão ativado'][step]}</Text><Text style={styles.copy}>{['Enviaremos um código para o celular cadastrado.', 'Digite o código enviado por SMS.', 'A senha deve ter quatro números.', 'Cartão ativado com sucesso.'][step]}</Text>{step < 2 ? <TextInput value={value} onChangeText={setValue} keyboardType="number-pad" placeholder={step ? 'Código SMS' : '4 últimos dígitos'} placeholderTextColor={colors.textMuted} style={styles.input} /> : null}{step === 2 ? <><TextInput value={pass} onChangeText={setPass} secureTextEntry keyboardType="number-pad" placeholder="Nova senha" placeholderTextColor={colors.textMuted} style={styles.input} /><TextInput value={confirm} onChangeText={setConfirm} secureTextEntry keyboardType="number-pad" placeholder="Confirmar senha" placeholderTextColor={colors.textMuted} style={styles.input} /></> : null}</Card>{step < 3 ? <PrimaryButton disabled={loading} loading={loading} title="Continuar" onPress={next} /> : <ConfirmationButton title="Voltar aos cartões" onPress={() => navigation.navigate('Cards')} />}</View></CardScreenLayout>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.lg, padding: spacing.lg }, card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 }, step: { ...typography.caption, color: colors.purple400 }, title: { ...typography.heading2, color: colors.textPrimary }, copy: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.md }, input: { backgroundColor: 'rgba(16, 51, 85, 0.72)', borderColor: 'rgba(92, 142, 220, 0.08)', borderRadius: 14, borderWidth: 1, color: colors.textPrimary, marginTop: spacing.sm, padding: spacing.md } });
