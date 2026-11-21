import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSession } from '../session';
import { sessionFromCustomerAuth } from '../services/authService';
import { AppLayout } from './layouts';
import { changePassword, formatDate, getMe, isSessionError, kycStatusInfo, messageFor, passwordProblem, requestEmailChange } from './logic';
import { ca, fonts } from './theme';
import { Body, Button, Card, DataRow, Eyebrow, Field, Heading, LoadingBlock, Notice, StatusPill, useLayout } from './ui';

// Dados do cliente logado (perfil + status do KYC), carregados uma vez e
// recarregados quando algo muda. Sessão inválida/expirada → volta ao login.
const CustomerDataContext = createContext(null);

export function CustomerDataProvider({ children }) {
  const { logout } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const handleError = useCallback(async (e) => {
    if (isSessionError(e)) { await logout(); return true; }
    return false;
  }, [logout]);
  const reload = useCallback(async () => {
    try { const res = await getMe(); setData(res.data); setError(''); }
    catch (e) { if (!(await handleError(e))) setError(messageFor(e, 'Não foi possível carregar seus dados.')); }
  }, [handleError]);
  useEffect(() => { reload(); }, [reload]);
  return <CustomerDataContext.Provider value={{ data, error, reload, handleError }}>{children}</CustomerDataContext.Provider>;
}

export const useCustomerData = () => useContext(CustomerDataContext);

export function Shell({ active, title, subtitle, children }) {
  const { logout, user } = useSession();
  const { data, error, reload } = useCustomerData();
  const name = data?.profile?.name || user?.name || '';
  let body = children;
  if (!data && error) body = <><Notice kind="error">{error}</Notice><Button onPress={reload} title="Tentar novamente" variant="outline" /></>;
  else if (!data) body = <LoadingBlock label="Carregando seus dados…" />;
  return <AppLayout active={active} customerName={name} onLogout={logout} subtitle={subtitle} title={title}>{body}</AppLayout>;
}

function Grid({ children }) {
  const { isTablet } = useLayout();
  return <View style={[styles.grid, isTablet && styles.gridWide]}>{children}</View>;
}

function GridItem({ children, full }) {
  const { isTablet } = useLayout();
  return <View style={[styles.gridItem, isTablet && !full && styles.gridHalf]}>{children}</View>;
}

const firstName = (name = '') => name.trim().split(/\s+/)[0] || '';

export function DashboardPage({ navigation }) {
  const { data } = useCustomerData();
  const { user } = useSession();
  const profile = data?.profile;
  const kyc = kycStatusInfo(data?.kyc?.status);
  return (
    <Shell active="Dashboard" subtitle="Acompanhe sua conta e os próximos passos." title={`Olá, ${firstName(profile?.name || user?.name)}`}>
      {profile ? (
        <Grid>
          <GridItem full>
            <Card style={styles.highlight}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Eyebrow>Verificação de identidade</Eyebrow>
                  <Heading level={2} style={{ marginTop: 10 }}>{data.kyc.status === 'APPROVED' ? 'Identidade verificada' : 'Complete sua verificação'}</Heading>
                </View>
                <StatusPill label={kyc.label} tone={kyc.tone} />
              </View>
              <Body style={{ marginTop: 12 }}>{kyc.hint}</Body>
              {data.kyc.status !== 'APPROVED' && data.kyc.status !== 'SUBMITTED' ? (
                <Button onPress={() => navigation.navigate('Kyc')} style={styles.cardButton} title={data.kyc.status === 'NOT_STARTED' ? 'Iniciar verificação' : 'Continuar verificação'} />
              ) : null}
            </Card>
          </GridItem>
          <GridItem>
            <Card style={{ flex: 1 }}>
              <Eyebrow>Sua conta</Eyebrow>
              <View style={{ marginTop: 8 }}>
                <DataRow label="E-mail" value={profile.email} />
                <DataRow label="Situação do e-mail" value={profile.emailVerified ? 'Confirmado' : 'Não confirmado'} />
                <DataRow label="CPF" value={profile.documentMasked} />
                <DataRow last label="Cliente desde" value={formatDate(profile.createdAt)} />
              </View>
              <Button onPress={() => navigation.navigate('Profile')} style={styles.cardButton} title="Ver meus dados" variant="ghost" />
            </Card>
          </GridItem>
          <GridItem>
            <Card style={{ flex: 1 }}>
              <Eyebrow>Segurança</Eyebrow>
              <Body style={{ marginTop: 12 }}>Sua senha é guardada de forma criptografada e cada acesso fica registrado. Você recebe um aviso por e-mail sempre que a senha ou o e-mail da conta mudam.</Body>
              <Button onPress={() => navigation.navigate('Security')} style={styles.cardButton} title="Alterar senha ou e-mail" variant="ghost" />
            </Card>
          </GridItem>
          <GridItem full>
            <Card style={styles.soon}>
              <Eyebrow style={{ color: ca.textMuted }}>Serviços financeiros</Eyebrow>
              <Body style={{ marginTop: 10 }}>PIX, transferências, pagamentos e cartões ainda não estão disponíveis. Eles serão liberados depois da conclusão da verificação de identidade e das autorizações necessárias. Avisaremos você por e-mail.</Body>
            </Card>
          </GridItem>
        </Grid>
      ) : null}
    </Shell>
  );
}

export function ProfilePage() {
  const { data } = useCustomerData();
  const p = data?.profile;
  return (
    <Shell active="Profile" subtitle="Dados cadastrais da sua conta." title="Meus dados">
      {p ? (
        <>
          <Card>
            <DataRow label="Nome completo" value={p.name} />
            <DataRow label="E-mail" value={p.email} />
            <DataRow label="CPF" value={p.documentMasked} />
            <DataRow label="Celular" value={p.phoneMasked} />
            <DataRow label="Tipo de conta" value="Pessoa física" />
            <DataRow label="Situação da conta" value={p.status === 'ACTIVE' ? 'Ativa' : 'Bloqueada'} />
            <DataRow last label="Cliente desde" value={formatDate(p.createdAt)} />
          </Card>
          <Notice kind="info" style={{ marginTop: 20 }} title="Por que alguns dados aparecem ocultos?">Por segurança, o CPF e o celular nunca são exibidos por completo. Para corrigir nome, CPF ou celular, fale com nosso atendimento: contato@ctbxpayments.com. O e-mail pode ser trocado em Segurança.</Notice>
        </>
      ) : null}
    </Shell>
  );
}

function ChangePasswordCard() {
  const { adoptSession } = useSession();
  const { handleError } = useCustomerData();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    const found = {};
    if (!form.current) found.current = 'Informe sua senha atual.';
    const pw = passwordProblem(form.next);
    if (pw) found.next = pw;
    if (form.next !== form.confirm) found.confirm = 'As senhas não conferem.';
    setErrors(found); setResult(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await changePassword(form.current, form.next);
      await adoptSession(sessionFromCustomerAuth(res.data));
      setForm({ current: '', next: '', confirm: '' });
      setResult({ kind: 'success', text: 'Senha alterada. As sessões em outros dispositivos foram encerradas e enviamos um aviso para o seu e-mail.' });
    } catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e) }); }
    finally { setBusy(false); }
  };
  return (
    <Card style={{ flex: 1 }}>
      <Heading level={2} style={{ marginBottom: 18 }}>Alterar senha</Heading>
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <Field autoComplete="current-password" error={errors.current} label="Senha atual" onChangeText={set('current')} secure value={form.current} />
      <Field autoComplete="new-password" error={errors.next} hint="Mínimo de 8 caracteres, com letras e números." label="Nova senha" onChangeText={set('next')} secure value={form.next} />
      <Field autoComplete="new-password" error={errors.confirm} label="Confirme a nova senha" onChangeText={set('confirm')} secure value={form.confirm} />
      <Button loading={busy} onPress={submit} title="Salvar nova senha" />
    </Card>
  );
}

function ChangeEmailCard() {
  const { data, handleError } = useCustomerData();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    setResult(null);
    if (!form.email.trim() || !form.password) return setResult({ kind: 'error', text: 'Informe o novo e-mail e sua senha atual.' });
    setBusy(true);
    try {
      await requestEmailChange(form.email.trim(), form.password);
      setResult({ kind: 'success', text: `Enviamos um link de confirmação para ${form.email.trim()}. A troca só vale depois que você clicar nele.` });
      setForm({ email: '', password: '' });
    } catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e) }); }
    finally { setBusy(false); }
  };
  return (
    <Card style={{ flex: 1 }}>
      <Heading level={2} style={{ marginBottom: 6 }}>Trocar e-mail</Heading>
      <Body muted style={{ marginBottom: 18 }}>E-mail atual: {data?.profile?.email}</Body>
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <Field autoComplete="email" inputMode="email" keyboardType="email-address" label="Novo e-mail" onChangeText={set('email')} value={form.email} />
      <Field autoComplete="current-password" label="Senha atual" onChangeText={set('password')} secure value={form.password} />
      <Button loading={busy} onPress={submit} title="Enviar link de confirmação" variant="outline" />
    </Card>
  );
}

export function SecurityPage() {
  return (
    <Shell active="Security" subtitle="Senha e e-mail de acesso da sua conta." title="Segurança">
      <Grid>
        <GridItem><ChangePasswordCard /></GridItem>
        <GridItem><ChangeEmailCard /></GridItem>
      </Grid>
    </Shell>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 20 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '100%' },
  gridHalf: { flexBasis: 300, flexGrow: 1, width: 'auto' },
  highlight: { borderColor: 'rgba(197, 164, 108, 0.35)' },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  cardButton: { alignSelf: 'flex-start', marginTop: 20, minWidth: 220 },
  soon: { backgroundColor: ca.bg, borderStyle: 'dashed' },
});
