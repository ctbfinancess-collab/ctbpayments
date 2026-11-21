import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSession } from '../session';
import { sessionFromCustomerAuth } from '../services/authService';
import { getKycPersonalInfo, saveKycPersonalInfo } from '../services/customerKycClient';
import { AppLayout } from './layouts';
import { brazilianToIso, changePassword, formatDate, getMe, isoToBrazilian, isSessionError, kycStatusInfo, maskDateInput, messageFor, passwordProblem, requestEmailChange, validateKyc } from './logic';
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

const useCustomerData = () => useContext(CustomerDataContext);

function Shell({ active, title, subtitle, children }) {
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

const STEPS = [
  { key: 'personal', label: 'Dados pessoais' },
  { key: 'address', label: 'Endereço' },
  { key: 'documents', label: 'Documentos' },
  { key: 'review', label: 'Análise' },
];

function Steps() {
  const { isTablet } = useLayout();
  return (
    <View style={[styles.steps, !isTablet && { flexDirection: 'column' }]}>
      {STEPS.map((s, i) => (
        <View key={s.key} style={[styles.step, i === 0 && styles.stepActive]}>
          <Text style={[styles.stepNumber, i === 0 && { color: ca.onGold, backgroundColor: ca.gold }]}>{i + 1}</Text>
          <View>
            <Text style={[styles.stepLabel, i === 0 && { color: ca.text }]}>{s.label}</Text>
            <Text style={styles.stepState}>{i === 0 ? 'Etapa atual' : 'Em breve'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function KycPage() {
  const { data, reload, handleError } = useCustomerData();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  useEffect(() => {
    getKycPersonalInfo()
      .then((res) => { const i = res.data.personalInfo; setForm({ birthDate: isoToBrazilian(i.birthDate), motherName: i.motherName || '', nationality: i.nationality || '' }); })
      .catch(async (e) => { if (!(await handleError(e))) setLoadError(messageFor(e, 'Não foi possível carregar seus dados.')); });
  }, [handleError]);
  const set = (key, mask) => (value) => setForm((f) => ({ ...f, [key]: mask ? mask(value) : value }));
  const save = async () => {
    const found = validateKyc(form);
    setErrors(found); setResult(null);
    if (Object.keys(found).length) return;
    const patch = {};
    if (form.birthDate) patch.birthDate = brazilianToIso(form.birthDate);
    if (form.motherName.trim()) patch.motherName = form.motherName.trim();
    if (form.nationality.trim()) patch.nationality = form.nationality.trim();
    if (!Object.keys(patch).length) return setResult({ kind: 'error', text: 'Preencha ao menos um campo para salvar.' });
    setBusy(true);
    try { await saveKycPersonalInfo(patch); await reload(); setResult({ kind: 'success', text: 'Dados salvos. Você pode sair e continuar depois: nada se perde.' }); }
    catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e, 'Não foi possível salvar seus dados.') }); }
    finally { setBusy(false); }
  };
  const status = kycStatusInfo(data?.kyc?.status);
  return (
    <Shell active="Kyc" subtitle="Exigida por lei para instituições de pagamento. Seus dados ficam protegidos." title="Verificação de identidade">
      <View style={styles.statusLine}><Body muted>Situação:</Body><StatusPill label={status.label} tone={status.tone} /></View>
      <Steps />
      <Card>
        <Heading level={2} style={{ marginBottom: 6 }}>Dados pessoais</Heading>
        <Body muted style={{ marginBottom: 22 }}>Nome, CPF, e-mail e celular já vieram do seu cadastro. Complete os dados abaixo.</Body>
        {loadError ? <Notice kind="error">{loadError}</Notice> : null}
        {!form && !loadError ? <LoadingBlock /> : null}
        {form ? (
          <View style={{ maxWidth: 560 }}>
            {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
            <Field error={errors.birthDate} inputMode="numeric" keyboardType="number-pad" label="Data de nascimento" maxLength={10} onChangeText={set('birthDate', maskDateInput)} placeholder="DD/MM/AAAA" value={form.birthDate} />
            <Field autoCapitalize="words" error={errors.motherName} label="Nome completo da mãe" onChangeText={set('motherName')} value={form.motherName} />
            <Field autoCapitalize="words" error={errors.nationality} label="Nacionalidade" onChangeText={set('nationality')} placeholder="Ex.: Brasileira" value={form.nationality} />
            <Button loading={busy} onPress={save} style={{ alignSelf: 'flex-start', minWidth: 220 }} title="Salvar dados" />
          </View>
        ) : null}
      </Card>
      <Notice kind="info" style={{ marginTop: 20 }} title="Próximas etapas">Endereço e envio de documentos serão liberados em breve. Ainda não pedimos nenhum documento.</Notice>
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
  statusLine: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 18 },
  steps: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  step: { alignItems: 'center', backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 12, padding: 14 },
  stepActive: { borderColor: 'rgba(197, 164, 108, 0.45)' },
  stepNumber: { backgroundColor: ca.surfaceHigh, borderRadius: 999, color: ca.textSoft, fontFamily: fonts.semibold, fontSize: 13, height: 28, lineHeight: 28, textAlign: 'center', width: 28 },
  stepLabel: { color: ca.textSoft, fontFamily: fonts.semibold, fontSize: 14 },
  stepState: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
});
