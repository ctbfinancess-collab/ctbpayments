import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../../components/auth/AuthLayout';
import { Icon, PrimaryButton } from '../../components/ui';
import { confirmCustomerEmailChange } from '../../services/customerAuthClient';
import { colors, radii, spacing } from '../../theme';

const backgroundSource = require('../../../assets/ctbx-onboarding-background.png');

// Destino real do botão "CONFIRMAR NOVO E-MAIL" enviado pelo Resend
// (changeEmailTemplate.ts, backend). Tela standalone — renderizada fora
// de NavigationContainer/SessionProvider, mesmo padrão de
// VerifyEmailScreen/ResetPasswordScreen (ver App.js:
// window.location.pathname.startsWith('/confirm-email-change')) —
// alcançada por um link de e-mail (na caixa de entrada do NOVO endereço,
// possivelmente em outro dispositivo), nunca por navegação interna.
function readTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

export default function ConfirmEmailChangeScreen() {
  const [state, setState] = useState('verifying'); // verifying | success | error
  const [connectivityIssue, setConnectivityIssue] = useState(false);

  useEffect(() => {
    const token = readTokenFromUrl();
    if (!token) { setState('error'); return; }
    let cancelled = false;
    confirmCustomerEmailChange(token)
      .then(() => { if (!cancelled) setState('success'); })
      .catch((error) => {
        if (cancelled) return;
        // Mesma distinção de VerifyEmailScreen: erro de rede/servidor é
        // diferente de "link inválido".
        setConnectivityIssue(error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || (error.status && error.status >= 500));
        setState('error');
      });
    return () => { cancelled = true; };
  }, []);

  if (state === 'verifying') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Aguarde um instante." title="Confirmando seu novo e-mail…">
        <View style={styles.center}><ActivityIndicator color={colors.purple400} size="large" /></View>
      </AuthLayout>
    );
  }

  if (state === 'success') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Seu e-mail de acesso foi atualizado." title="E-mail confirmado com sucesso">
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
      subtitle={connectivityIssue ? 'Não foi possível confirmar agora. Verifique sua conexão e tente novamente mais tarde.' : 'Este link é inválido ou expirou.'}
      title="Não foi possível confirmar"
    >
      <PrimaryButton backgroundColor={colors.orange500} onPress={() => { window.location.href = '/'; }} style={styles.action}>VOLTAR AO LOGIN</PrimaryButton>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xxl },
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  action: { marginTop: spacing.xl },
});
