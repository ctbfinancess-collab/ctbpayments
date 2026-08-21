import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthLayout from '../../components/auth/AuthLayout';
import { FormField, Icon, PrimaryButton } from '../../components/ui';
import { registerCustomer } from '../../services/customerAuthClient';
import { colors, radii, spacing, typography } from '../../theme';
import { isValidCpf, isValidEmail, onlyDigits } from '../../utils/pixValidation';

const backgroundSource = require('../../../assets/ctbx-onboarding-background.png');

// Cadastro PF real (Customer Identity) — fala com /v1/customers/register,
// diferente do mock em src/screens/auth/OnboardingScreen.js (fluxo
// DEMO/SANDBOX, inteiramente visual, nenhum dado é enviado). Só é
// alcançada dentro do PublicStack quando isProductionMode (ver App.js —
// PublicStack troca a rota "Onboarding" por esta tela em PRODUCTION);
// nunca standalone, por isso `navigation` está sempre disponível aqui.
const ERROR_MESSAGES = {
  CUSTOMER_EMAIL_ALREADY_REGISTERED: 'Este e-mail já está cadastrado.',
  CUSTOMER_DOCUMENT_ALREADY_REGISTERED: 'Este CPF já está cadastrado.',
  CUSTOMER_DOCUMENT_INVALID: 'CPF inválido.',
  CUSTOMER_NAME_INVALID: 'Informe seu nome completo.',
  CUSTOMER_PHONE_INVALID: 'Telefone inválido.',
};

export default function CustomerRegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', document: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [state, setState] = useState('form'); // form | submitting | success
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState('');
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const nameValid = form.name.trim().length > 0;
  const documentValid = isValidCpf(onlyDigits(form.document));
  const emailValid = isValidEmail(form.email);
  const phoneValid = form.phone.trim().length >= 8;
  const passwordValid = form.password.length >= 8;
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;
  const canSubmit = nameValid && documentValid && emailValid && phoneValid && passwordValid && passwordsMatch;

  const handleSubmit = async () => {
    setAttempted(true);
    setFormError('');
    if (!canSubmit) return;
    setState('submitting');
    try {
      await registerCustomer({ name: form.name.trim(), document: form.document, email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      setState('success');
    } catch (error) {
      setFormError(ERROR_MESSAGES[error.code] || 'Não foi possível concluir o cadastro. Tente novamente.');
      setState('form');
    }
  };

  if (state === 'success') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} subtitle="Enviamos um link de verificação para o seu e-mail. Confirme para ativar sua conta." title="Cadastro realizado">
        <View style={styles.notice}>
          <Icon color={colors.purple400} name="checkmark-circle" size={40} />
        </View>
        <PrimaryButton backgroundColor={colors.orange500} onPress={() => navigation.navigate('Login')} style={styles.action}>IR PARA O LOGIN</PrimaryButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backgroundSource={backgroundSource} footer={false} onBack={() => navigation.goBack()} subtitle="Leva menos de um minuto." title="Abra sua conta">
      <FormField autoCapitalize="words" autoComplete="off" autoCorrect={false} error={attempted && !nameValid ? 'Informe seu nome completo.' : ''} label="Nome completo" onChangeText={set('name')} placeholder="Seu nome completo" value={form.name} />
      <FormField autoCapitalize="none" autoComplete="off" autoCorrect={false} error={attempted && !documentValid ? 'CPF inválido.' : ''} keyboardType="numeric" label="CPF" onChangeText={set('document')} placeholder="000.000.000-00" value={form.document} />
      <FormField autoCapitalize="none" autoComplete="off" autoCorrect={false} error={attempted && !emailValid ? 'E-mail inválido.' : ''} keyboardType="email-address" label="E-mail" onChangeText={set('email')} placeholder="seu@email.com" value={form.email} />
      <FormField autoCapitalize="none" autoComplete="off" autoCorrect={false} error={attempted && !phoneValid ? 'Telefone inválido.' : ''} keyboardType="phone-pad" label="Celular" onChangeText={set('phone')} placeholder="(00) 00000-0000" value={form.phone} />
      <FormField autoCapitalize="none" autoCorrect={false} error={attempted && !passwordValid ? 'A senha precisa ter pelo menos 8 caracteres.' : ''} label="Senha" onChangeText={set('password')} placeholder="Mínimo de 8 caracteres" secureTextEntry value={form.password} />
      <FormField autoCapitalize="none" autoCorrect={false} error={attempted && !passwordsMatch ? 'As senhas não coincidem.' : ''} label="Confirme a senha" onChangeText={set('confirmPassword')} placeholder="Repita a senha" secureTextEntry value={form.confirmPassword} />
      {formError ? <Text style={styles.hint}>{formError}</Text> : null}
      <PrimaryButton backgroundColor={colors.orange500} disabled={state === 'submitting'} loading={state === 'submitting'} onPress={handleSubmit} style={styles.action}>CRIAR MINHA CONTA</PrimaryButton>
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backToLogin}><Text style={styles.backToLoginText}>Já tenho uma conta</Text></TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  hint: { ...typography.caption, color: colors.orange400, marginBottom: spacing.sm, marginTop: -spacing.xs, textAlign: 'center' },
  action: { marginTop: spacing.xl },
  backToLogin: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  backToLoginText: { ...typography.bodyMedium, color: colors.purple300 },
});
