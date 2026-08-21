import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthLayout from '../../components/auth/AuthLayout';
import { FormField, Icon, PrimaryButton } from '../../components/ui';
import { confirmCustomerPasswordReset } from '../../services/customerAuthClient';
import { colors, radii, spacing, typography } from '../../theme';

const backgroundSource = require('../../../assets/ctbx-onboarding-background.png');

// Destino real do botão "REDEFINIR MINHA SENHA" enviado pelo Resend
// (resetPasswordTemplate.ts, backend). Tela standalone — renderizada fora
// de NavigationContainer/SessionProvider, mesmo padrão de VerifyEmailScreen
// (ver App.js: window.location.pathname.startsWith('/reset-password')) —
// porque é alcançada por um link de e-mail, nunca por navegação dentro do
// app. NÃO é o "Esqueci minha senha" do fluxo SANDBOX existente
// (src/screens/auth/ForgotPasswordScreen.js, mock sem backend) — este
// fala com /v1/customers/password/*, a recuperação real.
function readTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

export default function ResetPasswordScreen() {
  const token = readTokenFromUrl();
  const [state, setState] = useState(token ? 'form' : 'error'); // form | submitting | success | error
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [connectivityIssue, setConnectivityIssue] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordLongEnough = password.length >= 8;

  const handleSubmit = async () => {
    if (!token || !passwordLongEnough || !passwordsMatch) return;
    setState('submitting');
    try {
      await confirmCustomerPasswordReset(token, password);
      setState('success');
    } catch (error) {
      // Mesma distinção de VerifyEmailScreen: erro de rede/servidor é uma
      // mensagem diferente de "link inválido" (nenhuma das duas revela
      // nada sobre a conta), mas token errado/expirado/já usado (o
      // backend sempre devolve o mesmo código pros três) cai na mesma
      // mensagem genérica de sempre.
      setConnectivityIssue(error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || (error.status && error.status >= 500));
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Você já pode entrar com sua nova senha." title="Senha redefinida com sucesso">
        <View style={styles.notice}>
          <Icon color={colors.purple400} name="checkmark-circle" size={40} />
        </View>
        <PrimaryButton backgroundColor={colors.orange500} onPress={() => { window.location.href = '/'; }} style={styles.action}>IR PARA O LOGIN</PrimaryButton>
      </AuthLayout>
    );
  }

  if (state === 'error') {
    return (
      <AuthLayout
        backgroundSource={backgroundSource}
        footer={false}
        subtitle={connectivityIssue ? 'Não foi possível redefinir agora. Verifique sua conexão e tente novamente mais tarde.' : 'Este link é inválido ou expirou.'}
        title="Não foi possível redefinir"
      >
        <TouchableOpacity onPress={() => { window.location.href = '/'; }} style={styles.backToLogin}><Text style={styles.backToLoginText}>Voltar ao login</Text></TouchableOpacity>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Escolha uma nova senha para sua conta." title="Redefinir sua senha">
      <FormField autoCapitalize="none" autoCorrect={false} label="Nova senha" onChangeText={setPassword} placeholder="Mínimo de 8 caracteres" secureTextEntry value={password} />
      <FormField autoCapitalize="none" autoCorrect={false} label="Confirme a nova senha" onChangeText={setConfirmPassword} placeholder="Repita a nova senha" secureTextEntry value={confirmPassword} />
      {password.length > 0 && !passwordLongEnough ? <Text style={styles.hint}>A senha precisa ter pelo menos 8 caracteres.</Text> : null}
      {confirmPassword.length > 0 && !passwordsMatch ? <Text style={styles.hint}>As senhas não coincidem.</Text> : null}
      <PrimaryButton backgroundColor={colors.orange500} disabled={!passwordLongEnough || !passwordsMatch || state === 'submitting'} loading={state === 'submitting'} onPress={handleSubmit} style={styles.action}>REDEFINIR MINHA SENHA</PrimaryButton>
      <TouchableOpacity onPress={() => { window.location.href = '/'; }} style={styles.backToLogin}><Text style={styles.backToLoginText}>Voltar ao login</Text></TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  hint: { ...typography.caption, color: colors.orange400, marginBottom: spacing.sm, marginTop: -spacing.xs },
  action: { marginTop: spacing.xl },
  backToLogin: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  backToLoginText: { ...typography.bodyMedium, color: colors.purple300 },
});
