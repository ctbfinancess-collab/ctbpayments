import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../../components/auth/AuthLayout';
import { FormField, Icon, OutlineButton, PrimaryButton } from '../../components/ui';
import { colors, radii, shadows, spacing, typography } from '../../theme';

// Mesmo fundo oficial do Onboarding — telas da mesma família de identidade
// (arco azul+laranja com o padrão de pontos) reaproveitam a mesma arte.
const backgroundSource = require('../../../assets/ctbx-onboarding-background.png');

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [complete, setComplete] = useState(false);
  if (complete) return (
    <AuthLayout backgroundSource={backgroundSource} onBack={() => navigation.goBack()} premium subtitle="Nenhuma mensagem real foi enviada. A recuperação será conectada quando houver um backend seguro para essa finalidade." title="Solicitação registrada no SANDBOX.">
      <View style={styles.notice}><Icon color={colors.purple400} name="checkmark-circle" size={32} /><Text style={styles.noticeText}>Experiência visual concluída com dados locais e descartáveis.</Text></View>
      <PrimaryButton backgroundColor={colors.orange500} onPress={() => navigation.navigate('Login')} shadowStyle={shadows.glowOrange} style={styles.button}>VOLTAR AO LOGIN</PrimaryButton>
    </AuthLayout>
  );
  return (
    <AuthLayout backgroundSource={backgroundSource} onBack={() => navigation.goBack()} premium subtitle="Informe um e-mail de teste. Nesta etapa não enviaremos mensagens nem consultaremos contas reais." title="Recupere seu acesso.">
      <FormField autoCapitalize="none" keyboardType="email-address" label="E-mail" onChangeText={setEmail} placeholder="email@exemplo.com" premium value={email} />
      <PrimaryButton backgroundColor={colors.orange500} disabled={!email.trim()} onPress={() => setComplete(true)} shadowStyle={shadows.glowOrange}>CONTINUAR</PrimaryButton>
      <OutlineButton onPress={() => navigation.goBack()} style={styles.button}>CANCELAR</OutlineButton>
      <Text style={styles.disclaimer}>Fluxo visual SANDBOX · nenhum e-mail será enviado.</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: spacing.md },
  disclaimer: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  noticeText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
});
