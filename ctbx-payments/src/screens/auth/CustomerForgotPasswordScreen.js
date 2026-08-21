import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthLayout from '../../components/auth/AuthLayout';
import { FormField, PrimaryButton } from '../../components/ui';
import { requestCustomerPasswordReset } from '../../services/customerAuthClient';
import { colors, radii, spacing, typography } from '../../theme';
import { isValidEmail } from '../../utils/pixValidation';

const backgroundSource = require('../../../assets/ctbx-onboarding-background.png');

// Pedido real de recuperação de senha (Customer Identity) — fala com
// /v1/customers/password/forgot, diferente do mock em
// src/screens/auth/ForgotPasswordScreen.js (fluxo SANDBOX, sem backend,
// preso à navegação do login sandbox). Tela standalone, mesmo padrão de
// VerifyEmailScreen/ResetPasswordScreen (fora de NavigationContainer/
// SessionProvider), alcançada em /forgot-password.
export default function CustomerForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('form'); // form | sending | sent

  const handleSubmit = async () => {
    if (!isValidEmail(email)) return;
    setState('sending');
    // Sempre a mesma resposta genérica, sem revelar se o e-mail existe —
    // mesmo se a chamada falhar por rede, a mensagem exibida é a mesma
    // (nunca "e-mail não encontrado" nem nada equivalente).
    await requestCustomerPasswordReset(email).catch(() => undefined);
    setState('sent');
  };

  if (state === 'sent') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha." title="Verifique seu e-mail">
        <View style={styles.notice}>
          <Text style={styles.noticeText}>O link é válido por 30 minutos e pode ser usado apenas uma vez.</Text>
        </View>
        <TouchableOpacity onPress={() => { window.location.href = '/'; }} style={styles.backToLogin}><Text style={styles.backToLoginText}>Voltar ao login</Text></TouchableOpacity>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Informe o e-mail da sua conta para receber um link de redefinição." title="Esqueci minha senha">
      <FormField autoCapitalize="none" autoComplete="off" autoCorrect={false} keyboardType="email-address" label="E-mail" onChangeText={setEmail} placeholder="seu@email.com" value={email} />
      <PrimaryButton backgroundColor={colors.orange500} disabled={!isValidEmail(email) || state === 'sending'} loading={state === 'sending'} onPress={handleSubmit} style={styles.action}>ENVIAR LINK DE REDEFINIÇÃO</PrimaryButton>
      <TouchableOpacity onPress={() => { window.location.href = '/'; }} style={styles.backToLogin}><Text style={styles.backToLoginText}>Voltar ao login</Text></TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  noticeText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  action: { marginTop: spacing.xl },
  backToLogin: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  backToLoginText: { ...typography.bodyMedium, color: colors.purple300 },
});
