import React, { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { env } from '../config';
import { useSession } from '../session';
import { confirmCustomerEmailChange, confirmCustomerPasswordReset, registerCustomer, requestCustomerPasswordReset, resendCustomerEmailVerification, verifyCustomerEmail } from '../services/customerAuthClient';
import { AuthLayout } from './layouts';
import { maskCpfInput, maskPhoneInput, messageFor, passwordProblem, tokenFromUrl, validateRegister } from './logic';
import { ca, fonts } from './theme';
import { Body, Button, Field, LinkText, LoadingBlock, Notice } from './ui';

const RESEND_HINT = 'Se este e-mail tiver cadastro ainda não confirmado, enviamos um novo link.';

function ResendVerification({ initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const send = async () => {
    if (!email.trim()) return setState({ busy: false, done: false, error: 'Informe seu e-mail.' });
    setState({ busy: true, done: false, error: '' });
    try { await resendCustomerEmailVerification(email.trim()); setState({ busy: false, done: true, error: '' }); }
    catch (error) { setState({ busy: false, done: false, error: messageFor(error) }); }
  };
  if (state.done) return <Notice kind="success" title="Pedido enviado">{RESEND_HINT}</Notice>;
  return (
    <View style={styles.subBox}>
      <Body style={{ marginBottom: 14 }}>Não recebeu o e-mail de confirmação? Peça um novo link:</Body>
      {initialEmail ? null : <Field autoComplete="email" inputMode="email" keyboardType="email-address" label="E-mail" onChangeText={setEmail} value={email} />}
      {state.error ? <Notice kind="error">{state.error}</Notice> : null}
      <Button loading={state.busy} onPress={send} title="Reenviar e-mail de confirmação" variant="outline" />
    </View>
  );
}

export function LoginPage({ navigation, route }) {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const notice = route?.params?.notice;
  const submit = async () => {
    if (!email.trim() || !password) return setError({ message: 'Informe e-mail e senha.' });
    setBusy(true); setError(null);
    try { await login({ email: email.trim(), password }); }
    catch (e) { setError({ code: e.code, message: messageFor(e, 'Não foi possível entrar. Tente novamente.') }); setBusy(false); }
  };
  return (
    <AuthLayout subtitle="Entre com o e-mail e a senha da sua conta." title="Acesse sua conta">
      {notice === 'session-expired' ? <Notice kind="info" title="Sua sessão terminou">Por segurança, entre novamente.</Notice> : null}
      {error ? <Notice kind="error">{error.message}</Notice> : null}
      {error?.code === 'CUSTOMER_EMAIL_NOT_VERIFIED' ? <ResendVerification initialEmail={email.trim()} /> : null}
      <Field autoComplete="email" inputMode="email" keyboardType="email-address" label="E-mail" onChangeText={setEmail} placeholder="seu@email.com" testID="login-email" value={email} />
      <Field autoComplete="current-password" label="Senha" onChangeText={setPassword} onSubmitEditing={submit} secure testID="login-password" value={password} />
      <View style={styles.rightLink}><LinkText onPress={() => navigation.navigate('ForgotPassword')}>Esqueci minha senha</LinkText></View>
      <Button loading={busy} onPress={submit} title="Entrar" />
      <View style={styles.altRow}>
        <Body muted>Ainda não é cliente?</Body>
        <LinkText onPress={() => navigation.navigate('Register')}>Abra sua conta</LinkText>
      </View>
    </AuthLayout>
  );
}

function TermsText() {
  if (!env.siteUrl) return <Body muted style={styles.terms}>Ao abrir a conta, você concorda com os Termos de Uso e a Política de Privacidade da CTBX Payments.</Body>;
  return (
    <Text style={[styles.termsBase, styles.terms]}>
      Ao abrir a conta, você concorda com os{' '}
      <Text accessibilityRole="link" onPress={() => Linking.openURL(`${env.siteUrl}/termos-de-uso/`)} style={styles.inlineLink}>Termos de Uso</Text>
      {' '}e a{' '}
      <Text accessibilityRole="link" onPress={() => Linking.openURL(`${env.siteUrl}/privacidade/`)} style={styles.inlineLink}>Política de Privacidade</Text>.
    </Text>
  );
}

export function RegisterPage({ navigation }) {
  const [form, setForm] = useState({ name: '', document: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const set = (key, mask) => (value) => setForm((f) => ({ ...f, [key]: mask ? mask(value) : value }));
  const submit = async () => {
    const found = validateRegister(form);
    setErrors(found); setServerError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await registerCustomer({ name: form.name.trim(), document: form.document, email: form.email.trim(), phone: form.phone, password: form.password });
      setDone(true);
    } catch (e) { setServerError(messageFor(e, 'Não foi possível concluir o cadastro. Tente novamente.')); }
    finally { setBusy(false); }
  };
  if (done) {
    return (
      <AuthLayout eyebrow="Abertura de conta" subtitle="Falta só um passo para ativar sua conta." title="Verifique seu e-mail">
        <Notice kind="success" title="Pedido recebido">Se os dados estiverem corretos, enviamos um link de confirmação para {form.email.trim()}. Abra o e-mail e clique no link para ativar sua conta (veja também a caixa de spam).</Notice>
        <Body muted style={{ marginBottom: 20 }}>Se você já tem conta, entre normalmente ou use "Esqueci minha senha".</Body>
        <Button onPress={() => navigation.navigate('Login')} title="Ir para o login" />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout eyebrow="Abertura de conta" subtitle="Conta para pessoa física. Leva menos de dois minutos." title="Abra sua conta">
      {serverError ? <Notice kind="error">{serverError}</Notice> : null}
      <Field autoCapitalize="words" autoComplete="name" error={errors.name} label="Nome completo" onChangeText={set('name')} value={form.name} />
      <Field autoComplete="off" error={errors.document} inputMode="numeric" keyboardType="number-pad" label="CPF" maxLength={14} onChangeText={set('document', maskCpfInput)} placeholder="000.000.000-00" value={form.document} />
      <Field autoComplete="email" error={errors.email} inputMode="email" keyboardType="email-address" label="E-mail" onChangeText={set('email')} placeholder="seu@email.com" value={form.email} />
      <Field autoComplete="tel" error={errors.phone} inputMode="tel" keyboardType="phone-pad" label="Celular com DDD" maxLength={15} onChangeText={set('phone', maskPhoneInput)} placeholder="(11) 90000-0000" value={form.phone} />
      <Field autoComplete="new-password" error={errors.password} hint="Mínimo de 8 caracteres, com letras e números." label="Crie uma senha" onChangeText={set('password')} secure value={form.password} />
      <Field autoComplete="new-password" error={errors.confirmPassword} label="Confirme a senha" onChangeText={set('confirmPassword')} onSubmitEditing={submit} secure value={form.confirmPassword} />
      <TermsText />
      <Button loading={busy} onPress={submit} title="Abrir minha conta" />
      <View style={styles.altRow}>
        <Body muted>Já tem conta?</Body>
        <LinkText onPress={() => navigation.navigate('Login')}>Entrar</LinkText>
      </View>
    </AuthLayout>
  );
}

export function ForgotPasswordPage({ navigation }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const submit = async () => {
    if (!email.trim()) return setError('Informe seu e-mail.');
    setBusy(true); setError('');
    try { await requestCustomerPasswordReset(email.trim()); setDone(true); }
    catch (e) { setError(messageFor(e)); }
    finally { setBusy(false); }
  };
  return (
    <AuthLayout eyebrow="Recuperar acesso" subtitle={done ? undefined : 'Informe o e-mail da sua conta. Enviaremos um link para você criar uma senha nova.'} title="Esqueci minha senha">
      {done ? (
        <>
          <Notice kind="success" title="Verifique seu e-mail">Se este e-mail estiver cadastrado, enviamos um link de redefinição. Ele vale por 30 minutos e só pode ser usado uma vez.</Notice>
          <Button onPress={() => navigation.navigate('Login')} title="Voltar para o login" variant="outline" />
        </>
      ) : (
        <>
          {error ? <Notice kind="error">{error}</Notice> : null}
          <Field autoComplete="email" inputMode="email" keyboardType="email-address" label="E-mail" onChangeText={setEmail} onSubmitEditing={submit} placeholder="seu@email.com" value={email} />
          <Button loading={busy} onPress={submit} title="Enviar link" />
          <View style={styles.altRow}><LinkText onPress={() => navigation.navigate('Login')}>Voltar para o login</LinkText></View>
        </>
      )}
    </AuthLayout>
  );
}

// Para onde ir depois de usar um link de e-mail. Se o link encerrou as
// sessões (senha redefinida, e-mail trocado) e a pessoa estava logada neste
// navegador, a sessão local também é apagada e ela volta para o login.
function useAfterTokenAction(revokesSessions = false) {
  const { status, logout } = useSession();
  const authenticated = status === 'authenticated';
  if (authenticated && revokesSessions) return { label: 'Ir para o login', go: () => logout() };
  if (authenticated) return { label: 'Ir para o painel', go: (navigation) => navigation.navigate('Dashboard') };
  return { label: 'Ir para o login', go: (navigation) => navigation.navigate('Login') };
}

export function ResetPasswordPage({ navigation }) {
  const after = useAfterTokenAction(true);
  const token = useRef(tokenFromUrl()).current;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const submit = async () => {
    const found = {};
    const pw = passwordProblem(password);
    if (pw) found.password = pw;
    if (password !== confirm) found.confirm = 'As senhas não conferem.';
    setErrors(found); setServerError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try { await confirmCustomerPasswordReset(token, password); setDone(true); }
    catch (e) { setServerError(messageFor(e)); }
    finally { setBusy(false); }
  };
  if (!token) {
    return (
      <AuthLayout eyebrow="Recuperar acesso" title="Link incompleto">
        <Notice kind="error">Este link de redefinição está incompleto. Abra o link exatamente como recebido no e-mail ou peça um novo.</Notice>
        <Button onPress={() => after.go(navigation)} title={after.label} variant="outline" />
      </AuthLayout>
    );
  }
  if (done) {
    return (
      <AuthLayout eyebrow="Recuperar acesso" title="Senha redefinida">
        <Notice kind="success" title="Tudo certo">Sua senha foi alterada e todas as sessões anteriores foram encerradas. Entre com a senha nova.</Notice>
        <Button onPress={() => after.go(navigation)} title={after.label} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout eyebrow="Recuperar acesso" subtitle="Crie uma senha nova para a sua conta." title="Redefinir senha">
      {serverError ? <Notice kind="error">{serverError}</Notice> : null}
      <Field autoComplete="new-password" error={errors.password} hint="Mínimo de 8 caracteres, com letras e números." label="Nova senha" onChangeText={setPassword} secure value={password} />
      <Field autoComplete="new-password" error={errors.confirm} label="Confirme a nova senha" onChangeText={setConfirm} onSubmitEditing={submit} secure value={confirm} />
      <Button loading={busy} onPress={submit} title="Salvar nova senha" />
    </AuthLayout>
  );
}

// Confirmação automática por link de e-mail (cadastro ou troca de e-mail).
function TokenPage({ navigation, confirm, eyebrow, successTitle, successText, failTitle, showResend, revokesSessions }) {
  const after = useAfterTokenAction(revokesSessions);
  const token = useRef(tokenFromUrl()).current;
  const started = useRef(false);
  const [state, setState] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Este link está incompleto. Abra o link exatamente como recebido no e-mail.');
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    confirm(token).then(() => setState('success')).catch((e) => { setMessage(messageFor(e)); setState('error'); });
  }, [confirm, token]);
  if (state === 'loading') return <LoadingBlock label="Confirmando…" />;
  if (state === 'success') {
    return (
      <AuthLayout eyebrow={eyebrow} title={successTitle}>
        <Notice kind="success" title="Confirmado">{successText}</Notice>
        <Button onPress={() => after.go(navigation)} title={after.label} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout eyebrow={eyebrow} title={failTitle}>
      <Notice kind="error">{message}</Notice>
      {showResend ? <ResendVerification /> : null}
      <Button onPress={() => after.go(navigation)} title={after.label} variant="outline" />
    </AuthLayout>
  );
}

export function VerifyEmailPage({ navigation }) {
  return <TokenPage confirm={verifyCustomerEmail} eyebrow="Confirmação de e-mail" failTitle="Não foi possível confirmar" navigation={navigation} showResend successText="Seu e-mail foi confirmado e sua conta está ativa. Agora é só entrar." successTitle="E-mail confirmado" />;
}

export function ConfirmEmailChangePage({ navigation }) {
  return <TokenPage confirm={confirmCustomerEmailChange} eyebrow="Troca de e-mail" revokesSessions failTitle="Não foi possível confirmar" navigation={navigation} successText="Seu novo e-mail foi confirmado. Por segurança, todas as sessões foram encerradas: entre usando o e-mail novo." successTitle="E-mail alterado" />;
}

const styles = StyleSheet.create({
  rightLink: { alignItems: 'flex-end', marginBottom: 22, marginTop: -4 },
  altRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 24 },
  subBox: { borderColor: ca.border, borderRadius: 14, borderWidth: 1, marginBottom: 22, padding: 18 },
  termsBase: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  terms: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  inlineLink: { color: ca.goldLight, fontFamily: fonts.medium, textDecorationLine: 'underline' },
});
