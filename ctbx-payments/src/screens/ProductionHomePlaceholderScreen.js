import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../components/auth/AuthLayout';
import { Icon, OutlineButton, PrimaryButton } from '../components/ui';
import { useSession } from '../session';
import { colors, radii, spacing, typography } from '../theme';

const backgroundSource = require('../../assets/ctbx-login-background.png');

// Destino único da AuthenticatedStack em PRODUCTION (ver App.js). O
// cliente está de fato autenticado (sessão real, token real), mas ainda
// não existe núcleo financeiro real ligado a cliente nenhum — nenhuma
// tela de saldo/Pix/cartão/extrato do app (todas construídas em cima de
// dados mock do SANDBOX) pode ser mostrada pra um cliente real. Essa
// tela é o placeholder deliberado até essas telas serem substituídas,
// módulo por módulo, por dados reais.
export default function ProductionHomePlaceholderScreen({ navigation }) {
  const { logout, user } = useSession();
  return (
    <AuthLayout backgroundSource={backgroundSource} eyebrow="CTBX PAYMENTS" footer={false} premium subtitle="A experiência completa está em construção." title="Login realizado.">
      <View style={styles.notice}>
        <Icon color={colors.purple400} name="checkmark-circle" size={40} style={styles.icon} />
        {user?.name ? <Text style={styles.greeting}>Olá, {user.name}.</Text> : null}
        <Text style={styles.noticeText}>Sua conta foi criada e sua sessão está ativa. Em breve, o restante do app passa a usar seus dados reais.</Text>
      </View>
      {/* KYC real (Customer Identity), Etapa 1 — único próximo passo real
          disponível pro cliente enquanto o núcleo financeiro não existe. */}
      <PrimaryButton backgroundColor={colors.orange500} onPress={() => navigation.navigate('KycPersonalInfo')} style={styles.kyc}>COMPLETAR MEU CADASTRO</PrimaryButton>
      <OutlineButton onPress={logout} style={styles.logout}>SAIR</OutlineButton>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  icon: { marginBottom: spacing.md },
  greeting: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  noticeText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  kyc: { marginTop: spacing.xl },
  logout: { marginTop: spacing.md },
});
