import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthLayout from '../../components/auth/AuthLayout';
import { FormField, Icon, PrimaryButton } from '../../components/ui';
import { resendCustomerEmailVerification, verifyCustomerEmail } from '../../services/customerAuthClient';
import { colors, radii, spacing, typography } from '../../theme';
import { isValidEmail } from '../../utils/pixValidation';

const backgroundSource = require('../../../assets/ctbx-onboarding-background.png');

// Destino real do botão "VERIFICAR MEU E-MAIL" enviado pelo Resend
// (verifyEmailTemplate.ts, backend). Tela standalone — renderizada fora
// de NavigationContainer/SessionProvider, igual ao AdminApp (ver App.js:
// window.location.pathname.startsWith('/verify-email')) — porque é
// alcançada por um link de e-mail, nunca por navegação dentro do app.
// Por isso "voltar ao login" é um reload de página (window.location.href),
// não navigation.navigate.
function readTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

export default function VerifyEmailScreen() {
  const [state, setState] = useState('verifying'); // verifying | success | error
  const [resendEmail, setResendEmail] = useState('');
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent
  const [connectivityIssue, setConnectivityIssue] = useState(false);

  useEffect(() => {
    const token = readTokenFromUrl();
    if (!token) { setState('error'); return; }
    let cancelled = false;
    verifyCustomerEmail(token)
      .then(() => { if (!cancelled) setState('success'); })
      .catch((error) => {
        if (cancelled) return;
        // Erro de rede/servidor é uma mensagem diferente de "link inválido"
        // (nenhuma das duas revela nada sobre a conta — só distingue "seu
        // link" de "nosso serviço"), mas token errado/expirado/já usado
        // (o backend sempre devolve o mesmo código pros três) cai na
        // mesma mensagem genérica de sempre.
        setConnectivityIssue(error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || (error.status && error.status >= 500));
        setState('error');
      });
    return () => { cancelled = true; };
  }, []);

  const handleResend = async () => {
    if (!isValidEmail(resendEmail)) return;
    setResendState('sending');
    // Sempre a mesma resposta genérica, sem revelar se o e-mail existe,
    // já está verificado, ou está em cooldown — mesmo se a chamada
    // falhar por rede, a mensagem exibida é a mesma (nunca "e-mail não
    // encontrado" nem nada equivalente).
    await resendCustomerEmailVerification(resendEmail).catch(() => undefined);
    setResendState('sent');
  };

  if (state === 'verifying') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Aguarde um instante." title="Verificando seu e-mail…">
        <View style={styles.center}><ActivityIndicator color={colors.purple400} size="large" /></View>
      </AuthLayout>
    );
  }

  if (state === 'success') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Sua conta CTBX Payments está pronta." title="E-mail verificado com sucesso">
        <View style={styles.notice}>
          <Icon color={colors.purple400} name="checkmark-circle" size={40} />
        </View>
        <PrimaryButton backgroundColor={colors.orange500} onPress={() => { window.location.href = '/'; }} style={styles.action}>IR PARA O LOGIN</PrimaryButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      backgroundSource={backgroundSource}
      footer={false}
      subtitle={connectivityIssue ? 'Não foi possível verificar agora. Verifique sua conexão e tente novamente mais tarde.' : 'Este link é inválido ou expirou.'}
      title="Não foi possível verificar"
    >
      {!connectivityIssue ? (
        resendState === 'sent' ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Se este e-mail estiver cadastrado e ainda não verificado, um novo link foi enviado.</Text>
          </View>
        ) : (
          <View>
            <FormField autoCapitalize="none" autoComplete="off" autoCorrect={false} keyboardType="email-address" label="E-mail" onChangeText={setResendEmail} placeholder="seu@email.com" value={resendEmail} />
            <PrimaryButton backgroundColor={colors.orange500} disabled={!isValidEmail(resendEmail) || resendState === 'sending'} loading={resendState === 'sending'} onPress={handleResend} style={styles.action}>REENVIAR E-MAIL DE VERIFICAÇÃO</PrimaryButton>
          </View>
        )
      ) : null}
      <TouchableOpacity onPress={() => { window.location.href = '/'; }} style={styles.backToLogin}><Text style={styles.backToLoginText}>Voltar ao login</Text></TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xxl },
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  noticeText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  action: { marginTop: spacing.xl },
  backToLogin: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  backToLoginText: { ...typography.bodyMedium, color: colors.purple300 },
});
