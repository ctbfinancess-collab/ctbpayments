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
    <AuthLayout backgroundSource={backgroundSource} onBack={() => navigation.goBack()} premium subtitle="Se este e-mail estiver cadastrado, você receberá as instruções em instantes." title="Solicitação registrada.">
      <View style={styles.notice}><Icon color={colors.purple400} name="checkmark-circle" size={32} /><Text style={styles.noticeText}>Verifique sua caixa de entrada para continuar.</Text></View>
      <PrimaryButton backgroundColor={colors.orange500} onPress={() => navigation.navigate('Login')} shadowStyle={shadows.glowOrange} style={styles.button}>VOLTAR AO LOGIN</PrimaryButton>
    </AuthLayout>
  );
  return (
    <AuthLayout backgroundSource={backgroundSource} onBack={() => navigation.goBack()} premium subtitle="Informe seu e-mail para receber as instruções de recuperação." title="Recupere seu acesso.">
      <FormField autoCapitalize="none" autoComplete="off" keyboardType="email-address" label="E-mail" onChangeText={setEmail} placeholder="email@exemplo.com" premium value={email} />
      <PrimaryButton backgroundColor={colors.orange500} disabled={!email.trim()} onPress={() => setComplete(true)} shadowStyle={shadows.glowOrange}>CONTINUAR</PrimaryButton>
      <OutlineButton onPress={() => navigation.goBack()} style={styles.button}>CANCELAR</OutlineButton>
      
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: spacing.md },
  disclaimer: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  noticeText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
});
