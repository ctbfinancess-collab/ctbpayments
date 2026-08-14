import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthLayout from '../components/auth/AuthLayout';
import { FormField, Icon, PrimaryButton } from '../components/ui';
import { isDemoMode, isProductionMode, isSandboxMode } from '../config';
import { useSession } from '../session';
import { colors, radii, spacing, typography } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const passwordInputRef = useRef(null);
  const { login } = useSession();
  const emailError = attempted && !email.trim() ? 'Informe seu e-mail.' : '';
  const passwordError = attempted && !senha ? 'Informe sua senha.' : '';

  const handleLogin = async () => {
    setAttempted(true);
    if ((isProductionMode || isSandboxMode) && (!email.trim() || !senha)) return;
    setSubmitting(true);
    try { await login({ email: email.trim(), password: senha }); }
    catch (error) {
      const message = error.code === 'AUTH_INVALID_CREDENTIALS'
        ? 'E-mail ou senha inválidos.'
        : error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT'
          ? 'Não foi possível acessar o serviço. Verifique sua conexão.'
          : error.status === 503 ? 'O serviço está temporariamente indisponível.' : 'Não foi possível iniciar a sessão.';
      Alert.alert('Não foi possível entrar', message);
    } finally { setSubmitting(false); }
  };

  return (
    <AuthLayout backgroundSource={require('../../assets/ctbx-login-background.png')} eyebrow="CTBX PAYMENTS" footer={false} premium subtitle="Seu mundo financeiro em um só lugar." title="Bem-vinda de volta.">
      <View style={styles.formCard}>
        <FormField autoCapitalize="none" autoCorrect={false} error={emailError} icon="mail-outline" keyboardType="email-address" label="E-mail" onChangeText={setEmail} onSubmitEditing={() => passwordInputRef.current?.focus()} placeholder="seu@email.com" premium returnKeyType="next" value={email} />
        <FormField error={passwordError} icon="lock-closed-outline" inputRef={passwordInputRef} keyboardType={isDemoMode ? 'numeric' : 'default'} label="Senha" maxLength={isDemoMode ? 6 : undefined} onChangeText={setSenha} onRightAction={() => { setMostrarSenha((current) => !current); requestAnimationFrame(() => passwordInputRef.current?.focus()); }} placeholder="Digite sua senha" premium rightActionLabel={mostrarSenha ? 'Ocultar' : 'Mostrar'} secureTextEntry={!mostrarSenha} value={senha} />
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgot}><Text style={styles.forgotText}>Esqueci minha senha</Text></TouchableOpacity>
        <PrimaryButton disabled={submitting} loading={submitting} onPress={handleLogin} style={styles.enter}>ENTRAR</PrimaryButton>
        {isSandboxMode ? <View style={styles.environmentRow}><Icon color={colors.textMuted} name="shield-checkmark-outline" size={16} /><Text style={styles.environment}>Ambiente de testes · dados exclusivamente fictícios</Text></View> : null}
      </View>
      <Text style={styles.client}>Ainda não é cliente?</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Onboarding')} style={styles.openAccount}><Text style={styles.openAccountText}>Abra sua conta →</Text></TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  formCard: { backgroundColor: 'rgba(11, 28, 51, 0.82)', borderColor: 'rgba(91, 135, 187, 0.28)', borderRadius: 20, borderWidth: 1, padding: spacing.lg },
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.xs, paddingVertical: spacing.sm },
  forgotText: { ...typography.bodyMedium, color: colors.purple400 },
  enter: { borderRadius: 15, marginTop: spacing.sm, minHeight: 52 },
  environmentRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  environment: { ...typography.caption, color: colors.textMuted, marginLeft: spacing.sm, textAlign: 'center' },
  client: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
  openAccount: { alignSelf: 'center', borderBottomColor: colors.orange500, borderBottomWidth: 1, marginTop: spacing.xs, padding: spacing.sm },
  openAccountText: { ...typography.heading3, color: colors.orange500 },
});
