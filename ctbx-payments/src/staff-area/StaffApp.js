import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { CormorantGaramond_500Medium, CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import QRCode from 'qrcode';
import { COMPANY_DOCUMENTS, COMPANY_POSITION_OPTIONS, COMPANY_REVENUE_OPTIONS, documentTypeLabel, DOCUMENT_KINDS, formatBytes, formatCnpj, formatDate, incomeLabel, maskCepInput, maskPhoneInput, optionLabel } from '../customer-area/logic';
import { ca, fonts } from '../customer-area/theme';
import { Body, Brand, Button, Card, ChoiceGroup, DataRow, Eyebrow, Field, Heading, LinkText, LoadingBlock, Notice, Page, StatusPill, useLayout } from '../customer-area/ui';
import { StaffSessionProvider, staffApi, staffMessage, useStaff } from './api';
import { describeDetails, eventLabel, EVENT_LABELS, OUTCOME_LABELS } from './events';

// Painel da equipe (análise de KYC) — serviço próprio, separado da Área do
// Cliente. Acesso só com convite, senha forte e verificação em duas etapas.
const Stack = createNativeStackNavigator();
const linking = { prefixes: [], config: { screens: { Login: 'entrar', ForgotPassword: 'esqueci-minha-senha', ResetPassword: 'redefinir-senha', Invite: 'convite', Overview: 'inicio', Customers: 'clientes', Customer: 'clientes/:customerId', Audit: 'auditoria', Queue: 'fila', Case: 'analise/:customerId', CompanyQueue: 'empresas', CompanyCase: 'empresas/:companyId', Team: 'equipe' } } };
const TITLES = { Login: 'Entrar', ForgotPassword: 'Esqueci minha senha', ResetPassword: 'Redefinir senha', Invite: 'Aceitar convite', Overview: 'Visão geral', Customers: 'Clientes', Customer: 'Cliente', Audit: 'Auditoria', Queue: 'Fila de análise', Case: 'Análise', CompanyQueue: 'Empresas (PJ)', CompanyCase: 'Análise PJ', Team: 'Equipe' };
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: ca.bg, card: ca.bgRaised, primary: ca.gold, text: ca.text, border: ca.border } };
const tokenFromUrl = () => { try { return new URL(window.location.href).searchParams.get('token') || ''; } catch { return ''; } };
const STATUS = { SUBMITTED: ['Em análise', 'neutral'], CHANGES_REQUESTED: ['Ajustes solicitados', 'warning'], APPROVED: ['Aprovada', 'success'], REJECTED: ['Não aprovada', 'danger'], IN_PROGRESS: ['Em preenchimento', 'warning'], NOT_STARTED: ['Não iniciada', 'warning'] };
const DECISION_LABEL = { APPROVED: 'Aprovada', CHANGES_REQUESTED: 'Ajustes solicitados', REJECTED: 'Não aprovada' };
const fmtDateTime = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; };
const fmtCpf = (d = '') => (d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d);

function CenterCard({ eyebrow, title, subtitle, children }) {
  return (
    <Page contentStyle={styles.center}>
      <View style={styles.centerCol}>
        <View style={{ marginBottom: 28 }}><Brand size="md" /></View>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle ? <Body style={{ marginBottom: 22 }}>{subtitle}</Body> : <View style={{ height: 16 }} />}
        {children}
      </View>
    </Page>
  );
}

function LoginPage({ navigation }) {
  const { signIn, notice } = useStaff();
  const [step, setStep] = useState('password');
  const [form, setForm] = useState({ email: '', password: '', code: '' });
  const [mfaToken, setMfaToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: k === 'code' ? v.replace(/\D/g, '').slice(0, 6) : v }));
  const submitPassword = async () => {
    setBusy(true); setError('');
    try { const r = await staffApi('/auth/login', { method: 'POST', body: { email: form.email.trim(), password: form.password } }); setMfaToken(r.mfaToken); setStep('code'); setForm((f) => ({ ...f, password: '' })); }
    catch (e) { setError(staffMessage(e)); }
    finally { setBusy(false); }
  };
  const submitCode = async () => {
    setBusy(true); setError('');
    try { const r = await staffApi('/auth/mfa', { method: 'POST', body: { mfaToken, code: form.code } }); signIn({ token: r.token, expiresAt: r.expiresAt, staff: r.staff }); }
    catch (e) { setError(staffMessage(e)); if (e.code === 'STAFF_MFA_EXPIRED' || e.code === 'STAFF_LOCKED') { setStep('password'); setMfaToken(''); } }
    finally { setBusy(false); }
  };
  return (
    <CenterCard eyebrow="Painel da equipe" subtitle={step === 'password' ? 'Acesso restrito à equipe autorizada.' : 'Digite o código de 6 dígitos do seu aplicativo autenticador.'} title={step === 'password' ? 'Entrar' : 'Verificação em duas etapas'}>
      {notice ? <Notice kind="info">{notice}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {step === 'password' ? (
        <>
          <Field autoComplete="username" inputMode="email" keyboardType="email-address" label="E-mail" onChangeText={set('email')} value={form.email} />
          <Field autoComplete="current-password" label="Senha" onChangeText={set('password')} onSubmitEditing={submitPassword} secure value={form.password} />
          <Button loading={busy} onPress={submitPassword} title="Continuar" />
          <View style={{ alignItems: 'center', marginTop: 18 }}><LinkText onPress={() => navigation.navigate('ForgotPassword')}>Esqueci minha senha</LinkText></View>
        </>
      ) : (
        <>
          <Field autoComplete="one-time-code" inputMode="numeric" keyboardType="number-pad" label="Código" maxLength={6} onChangeText={set('code')} onSubmitEditing={submitCode} placeholder="000000" value={form.code} />
          <Button loading={busy} onPress={submitCode} title="Entrar" />
          <View style={{ marginTop: 16 }}><Button onPress={() => { setStep('password'); setMfaToken(''); setError(''); }} title="Voltar" variant="ghost" /></View>
        </>
      )}
    </CenterCard>
  );
}

// Senha esquecida: com o celular do autenticador em mãos. Sem o celular,
// só outro administrador redefine o acesso (página Equipe).
function ForgotPasswordPage({ navigation }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Digite o seu e-mail da equipe.'); return; }
    setBusy(true); setError('');
    try { await staffApi('/auth/password/forgot', { method: 'POST', body: { email: email.trim() } }); setSent(true); }
    catch (e) { setError(staffMessage(e)); }
    finally { setBusy(false); }
  };
  return (
    <CenterCard eyebrow="Painel da equipe" subtitle={sent ? undefined : 'Enviaremos um link para o seu e-mail. Para concluir, você vai precisar do código do seu aplicativo autenticador.'} title="Esqueci minha senha">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {sent ? (
        <Notice kind="success" title="Pedido recebido">Se este e-mail for de alguém da equipe, enviamos um link para redefinir a senha. Ele vale por 30 minutos (veja também o spam).</Notice>
      ) : (
        <>
          <Field autoComplete="username" inputMode="email" keyboardType="email-address" label="E-mail da equipe" onChangeText={setEmail} onSubmitEditing={submit} value={email} />
          <Button loading={busy} onPress={submit} title="Enviar link" />
        </>
      )}
      <View style={{ marginTop: 18 }}><Notice kind="info" title="Perdeu o celular do autenticador?">Peça a outro administrador para redefinir o seu acesso na página Equipe. Por segurança, isso não pode ser feito por e-mail.</Notice></View>
      <Button onPress={() => navigation.navigate('Login')} title="Voltar para o login" variant="ghost" />
    </CenterCard>
  );
}

function ResetPasswordPage({ navigation }) {
  const token = useRef(tokenFromUrl()).current;
  const [form, setForm] = useState({ password: '', confirm: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState(token ? 'form' : 'invalid');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: k === 'code' ? v.replace(/\D/g, '').slice(0, 6) : v }));
  const submit = async () => {
    if (form.password !== form.confirm) { setError('As senhas não conferem.'); return; }
    setBusy(true); setError('');
    try { await staffApi('/auth/password/reset', { method: 'POST', body: { token, password: form.password, code: form.code } }); setState('done'); }
    catch (e) { setError(staffMessage(e)); if (e.code === 'STAFF_RESET_INVALID') setState('invalid'); }
    finally { setBusy(false); }
  };
  if (state === 'invalid') return <CenterCard eyebrow="Painel da equipe" title="Link inválido"><Notice kind="error">{error || 'Este link é inválido, expirou ou já foi usado. Peça um novo em "Esqueci minha senha".'}</Notice><Button onPress={() => navigation.navigate('ForgotPassword')} title="Pedir novo link" /></CenterCard>;
  if (state === 'done') return <CenterCard eyebrow="Painel da equipe" title="Senha redefinida"><Notice kind="success" title="Tudo pronto">Sua nova senha já vale. Por segurança, todas as sessões abertas foram encerradas e você recebeu um aviso por e-mail.</Notice><Button onPress={() => navigation.navigate('Login')} title="Ir para o login" /></CenterCard>;
  return (
    <CenterCard eyebrow="Painel da equipe" subtitle="Crie uma nova senha e confirme com o código do seu aplicativo autenticador." title="Redefinir senha">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Field autoComplete="new-password" hint="Mínimo de 12 caracteres, com letras, números e símbolo." label="Nova senha" onChangeText={set('password')} secure value={form.password} />
      <Field autoComplete="new-password" label="Confirme a nova senha" onChangeText={set('confirm')} secure value={form.confirm} />
      <Field autoComplete="one-time-code" inputMode="numeric" keyboardType="number-pad" label="Código do autenticador" maxLength={6} onChangeText={set('code')} onSubmitEditing={submit} placeholder="000000" value={form.code} />
      <Button loading={busy} onPress={submit} title="Redefinir senha" />
    </CenterCard>
  );
}

function QrImage({ text }) {
  const [svg, setSvg] = useState('');
  useEffect(() => { QRCode.toString(text, { type: 'svg', margin: 1, color: { dark: '#141619', light: '#F4F4F2' } }).then(setSvg).catch(() => setSvg('')); }, [text]);
  if (Platform.OS !== 'web' || !svg) return null;
  return React.createElement('img', { alt: 'QR code para o aplicativo autenticador', src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, style: { width: 220, height: 220, borderRadius: 12, display: 'block', marginBottom: 16 } });
}

function InvitePage({ navigation }) {
  const token = useRef(tokenFromUrl()).current;
  const [step, setStep] = useState(token ? 'password' : 'invalid');
  const [form, setForm] = useState({ password: '', confirm: '', code: '' });
  const [enroll, setEnroll] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: k === 'code' ? v.replace(/\D/g, '').slice(0, 6) : v }));
  const savePassword = async () => {
    if (form.password !== form.confirm) { setError('As senhas não conferem.'); return; }
    setBusy(true); setError('');
    try { setEnroll(await staffApi('/invites/accept', { method: 'POST', body: { token, password: form.password } })); setStep('mfa'); }
    catch (e) { setError(staffMessage(e)); if (e.code === 'STAFF_INVITE_INVALID') setStep('invalid'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true); setError('');
    try { await staffApi('/invites/confirm', { method: 'POST', body: { enrollmentToken: enroll.enrollmentToken, code: form.code } }); setStep('done'); }
    catch (e) { setError(staffMessage(e)); }
    finally { setBusy(false); }
  };
  if (step === 'invalid') return <CenterCard eyebrow="Convite" title="Convite inválido"><Notice kind="error">{error || 'Este convite é inválido, expirou ou já foi usado. Peça um novo ao administrador.'}</Notice></CenterCard>;
  if (step === 'done') return <CenterCard eyebrow="Convite" title="Acesso criado"><Notice kind="success" title="Tudo pronto">Sua senha e a verificação em duas etapas foram configuradas.</Notice><Button onPress={() => navigation.navigate('Login')} title="Ir para o login" /></CenterCard>;
  if (step === 'mfa') {
    return (
      <CenterCard eyebrow="Convite · etapa 2 de 2" subtitle="Abra o aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou similar), leia o QR code e digite o código que aparecer." title="Verificação em duas etapas">
        {error ? <Notice kind="error">{error}</Notice> : null}
        <QrImage text={enroll.otpauthUrl} />
        <Body muted style={{ fontSize: 13, marginBottom: 6 }}>Sem câmera? Digite esta chave no aplicativo:</Body>
        <Text selectable style={styles.secret}>{enroll.secret.replace(/(.{4})/g, '$1 ').trim()}</Text>
        <Field autoComplete="one-time-code" inputMode="numeric" keyboardType="number-pad" label="Código de 6 dígitos" maxLength={6} onChangeText={set('code')} onSubmitEditing={confirm} placeholder="000000" value={form.code} />
        <Button loading={busy} onPress={confirm} title="Confirmar" />
        <Body muted style={{ fontSize: 12, marginTop: 14 }}>Esta etapa expira em 15 minutos.</Body>
      </CenterCard>
    );
  }
  return (
    <CenterCard eyebrow="Convite · etapa 1 de 2" subtitle="Crie a sua senha do painel." title="Bem-vindo(a) à equipe">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Field autoComplete="new-password" hint="Mínimo de 12 caracteres, com letras, números e símbolo." label="Senha" onChangeText={set('password')} secure value={form.password} />
      <Field autoComplete="new-password" label="Confirme a senha" onChangeText={set('confirm')} onSubmitEditing={savePassword} secure value={form.confirm} />
      <Button loading={busy} onPress={savePassword} title="Continuar" />
    </CenterCard>
  );
}

function Shell({ active, title, subtitle, children }) {
  const { staff, signOut } = useStaff();
  const navigation = useNavigation();
  const { isDesktop } = useLayout();
  const nav = [{ route: 'Overview', label: 'Visão geral' }, { route: 'Queue', label: 'Fila de análise' }, { route: 'CompanyQueue', label: 'Empresas (PJ)' }, { route: 'Customers', label: 'Clientes' }, ...(staff?.role === 'ADMIN' ? [{ route: 'Audit', label: 'Auditoria' }, { route: 'Team', label: 'Equipe' }] : [])];
  const items = nav.map((n) => (
    <Pressable accessibilityRole="link" key={n.route} onPress={() => navigation.navigate(n.route)} style={({ hovered }) => [styles.navItem, active === n.route && styles.navActive, hovered && active !== n.route && { backgroundColor: 'rgba(191,194,199,0.06)' }]}>
      <Text style={[styles.navText, active === n.route && { color: ca.goldLight }]}>{n.label}</Text>
    </Pressable>
  ));
  const who = (
    <View style={isDesktop ? styles.sideFooter : styles.topWho}>
      <Text numberOfLines={1} style={styles.who}>{staff?.name}</Text>
      <Text style={styles.role}>{staff?.role === 'ADMIN' ? 'Administrador(a)' : 'Analista'}</Text>
      <Pressable accessibilityRole="button" onPress={() => signOut()} style={styles.logout}><Text style={styles.logoutText}>Sair</Text></Pressable>
    </View>
  );
  const header = <View style={{ marginBottom: 24 }}><Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>{subtitle ? <Body style={{ marginTop: 6 }}>{subtitle}</Body> : null}</View>;
  if (isDesktop) {
    return (
      <View style={styles.row}>
        <View style={styles.sidebar}><Brand size="sm" /><Eyebrow style={{ marginTop: 18 }}>Painel da equipe</Eyebrow><View style={{ gap: 4, marginTop: 26 }}>{items}</View>{who}</View>
        <Page contentStyle={{ padding: 40 }}><View style={{ maxWidth: 1100, width: '100%' }}>{header}{children}</View></Page>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: ca.bg, flex: 1 }}>
      <View style={styles.topBar}><Brand size="sm" /></View>
      <View style={styles.mobileNav}>{items}{who}</View>
      <Page contentStyle={{ padding: 18 }}>{header}{children}</Page>
    </View>
  );
}

function QueuePage({ navigation }) {
  const { call } = useStaff();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); call('/kyc/queue').then((d) => setItems(d.items)).catch((e) => setError(staffMessage(e))); }, [call]);
  useEffect(() => { load(); }, [load]);
  return (
    <Shell active="Queue" subtitle="Clientes que enviaram a verificação de identidade, do mais antigo para o mais novo." title="Fila de análise">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!items && !error ? <LoadingBlock /> : null}
      {items && !items.length ? <Card><Body>Nenhum caso aguardando análise.</Body></Card> : null}
      {items?.length ? (
        <Card style={{ padding: 0 }}>
          {items.map((it, i) => (
            <Pressable accessibilityRole="link" key={it.customerId} onPress={() => navigation.navigate('Case', { customerId: it.customerId })} style={({ hovered }) => [styles.queueRow, i === items.length - 1 && { borderBottomWidth: 0 }, hovered && { backgroundColor: 'rgba(191,194,199,0.05)' }]}>
              <View style={{ flex: 1, minWidth: 200 }}><Text style={styles.queueName}>{it.name}</Text><Body muted style={{ fontSize: 13 }}>CPF {it.documentMasked}</Body></View>
              <Body muted style={{ fontSize: 13 }}>Enviado em {fmtDateTime(it.submittedAt)}</Body>
              <Text style={styles.queueOpen}>Analisar →</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
      <View style={{ marginTop: 16 }}><Button onPress={load} style={{ alignSelf: 'flex-start', minWidth: 160 }} title="Atualizar" variant="ghost" /></View>
    </Shell>
  );
}

// Documento descriptografado só em memória, com marca d'água de quem está
// vendo. Sem botão de download e sem cache.
function DocumentViewer({ customerId, doc, viewer, basePath }) {
  const { call } = useStaff();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let objectUrl = '';
    call(`${basePath || `/kyc/cases/${customerId}`}/documents/${doc.id}`, { raw: true })
      .then((res) => res.blob()).then((blob) => { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); })
      .catch((e) => setError(staffMessage(e)));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [call, customerId, doc.id, basePath]);
  const label = DOCUMENT_KINDS.find((k) => k.kind === doc.kind)?.label || COMPANY_DOCUMENTS.find((k) => k.kind === doc.kind)?.label || doc.kind;
  const isPdf = doc.contentType === 'application/pdf';
  return (
    <View style={styles.docBox}>
      <View style={styles.docHead}><Text style={styles.docTitle}>{label}</Text><Body muted style={{ fontSize: 12 }}>{isPdf ? 'PDF' : 'Imagem'} · {formatBytes(doc.sizeBytes)} · {formatDate(doc.uploadedAt)}</Body></View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!url && !error ? <LoadingBlock label="Abrindo…" /> : null}
      {url && Platform.OS === 'web' ? (
        <View style={{ position: 'relative' }}>
          {isPdf
            ? React.createElement('iframe', { src: `${url}#toolbar=0&navpanes=0`, title: label, style: { width: '100%', height: 420, border: 0, borderRadius: 8, background: '#fff' } })
            : React.createElement('img', { src: url, alt: label, draggable: false, onContextMenu: (e) => e.preventDefault(), style: { width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 8, background: '#0e0f11', display: 'block' } })}
          <Text pointerEvents="none" style={styles.watermark}>{`${viewer} · ${fmtDateTime(new Date().toISOString())} · uso interno`}</Text>
        </View>
      ) : null}
    </View>
  );
}

function DecisionPanel({ customerId, onDone, endpoint, approveNote = 'A aprovação verifica a identidade. Ela NÃO libera nenhuma operação financeira.' }) {
  const { call } = useStaff();
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsReason = decision && decision !== 'APPROVED';
  const submit = async () => {
    setBusy(true); setError('');
    try { const r = await call(endpoint || `/kyc/cases/${customerId}/decision`, { method: 'POST', body: needsReason ? { decision, reason } : { decision } }); onDone(r); }
    catch (e) { setError(staffMessage(e)); }
    finally { setBusy(false); }
  };
  return (
    <Card style={{ borderColor: 'rgba(197,164,108,0.4)' }}>
      <Heading level={2} style={{ marginBottom: 14 }}>Decisão</Heading>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <ChoiceGroup label="Resultado da análise" onChange={setDecision} options={[{ value: 'APPROVED', label: 'Aprovar' }, { value: 'CHANGES_REQUESTED', label: 'Pedir ajustes' }, { value: 'REJECTED', label: 'Recusar' }]} value={decision} />
      {needsReason ? <Field autoCapitalize="sentences" hint="O cliente verá este texto e o receberá por e-mail. Seja claro e objetivo; não inclua CPF nem outros dados sensíveis." label={decision === 'REJECTED' ? 'Motivo da recusa' : 'O que o cliente precisa ajustar'} maxLength={1000} multiline numberOfLines={4} onChangeText={setReason} value={reason} /> : null}
      {decision === 'APPROVED' ? <Notice kind="info">{approveNote}</Notice> : null}
      {decision ? <Button loading={busy} onPress={submit} style={{ alignSelf: 'flex-start', minWidth: 240 }} title={decision === 'APPROVED' ? 'Confirmar aprovação' : decision === 'REJECTED' ? 'Confirmar recusa' : 'Enviar pedido de ajustes'} /> : null}
    </Card>
  );
}

function CasePage({ route, navigation }) {
  const { call, staff } = useStaff();
  const { customerId } = route.params || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const load = useCallback(() => { call(`/kyc/cases/${customerId}`).then((d) => setData(d.case)).catch((e) => setError(staffMessage(e))); }, [call, customerId]);
  useEffect(() => { load(); }, [load]);
  const { isDesktop } = useLayout();
  if (error) return <Shell active="Queue" title="Análise"><Notice kind="error">{error}</Notice><Button onPress={() => navigation.navigate('Queue')} title="Voltar para a fila" variant="ghost" /></Shell>;
  if (!data) return <Shell active="Queue" title="Análise"><LoadingBlock /></Shell>;
  const c = data.customer; const k = data.kyc; const a = k.address;
  const [label, tone] = STATUS[k.status] || [k.status, 'neutral'];
  return (
    <Shell active="Queue" subtitle={`Enviado em ${fmtDateTime(k.submittedAt)}`} title={c.name}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 18 }}><Body muted>Situação:</Body><StatusPill label={label} tone={tone} /></View>
      {done ? <Notice kind="success" title="Decisão registrada">{`${DECISION_LABEL[done.status]}. ${done.notified ? 'O cliente foi avisado por e-mail.' : 'Atenção: o e-mail ao cliente não pôde ser enviado.'}`}</Notice> : null}
      <View style={[styles.cols, !isDesktop && { flexDirection: 'column' }]}>
        <Card style={{ flex: 1 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Cadastro</Heading>
          <DataRow label="Nome" value={c.name} />
          <DataRow label="CPF" value={fmtCpf(c.document)} />
          <DataRow label="E-mail" value={`${c.email}${c.emailVerified ? ' (confirmado)' : ''}`} />
          <DataRow label="Celular" value={c.phone} />
          <DataRow label="Cliente desde" value={formatDate(c.createdAt)} />
          <DataRow label="Nascimento" value={k.birthDate ? k.birthDate.split('-').reverse().join('/') : '—'} />
          <DataRow label="Mãe" value={k.motherName || '—'} />
          <DataRow last label="Nacionalidade" value={k.nationality || '—'} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Endereço e declarações</Heading>
          <DataRow label="Endereço" value={a.street ? `${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ''}` : '—'} />
          <DataRow label="Bairro / cidade" value={a.city ? `${a.district} · ${a.city}/${a.state}` : '—'} />
          <DataRow label="CEP" value={a.cep ? maskCepInput(a.cep) : '—'} />
          <DataRow label="PEP" value={k.isPep === null ? '—' : k.isPep ? 'Sim' : 'Não'} />
          <DataRow label="Profissão" value={k.occupation || '—'} />
          <DataRow label="Renda mensal" value={incomeLabel(k.incomeRange)} />
          <DataRow last label="Documento" value={documentTypeLabel(k.idDocumentType)} />
        </Card>
      </View>
      <Heading level={2} style={{ marginBottom: 12, marginTop: 24 }}>Documentos</Heading>
      <Body muted style={{ fontSize: 13, marginBottom: 12 }}>Os arquivos são abertos só nesta tela e cada abertura fica registrada na auditoria.</Body>
      <View style={styles.docsGrid}>{data.documents.map((d) => <View key={d.id} style={{ flexBasis: isDesktop ? '48%' : '100%', flexGrow: 1 }}><DocumentViewer customerId={c.id} doc={d} viewer={staff?.name || ''} /></View>)}</View>
      {data.reviews.length ? (
        <Card style={{ marginTop: 20 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Histórico de análises</Heading>
          {data.reviews.map((r, i) => <DataRow key={`${r.createdAt}-${i}`} last={i === data.reviews.length - 1} label={`${fmtDateTime(r.createdAt)} · ${r.staffName}`} value={`${DECISION_LABEL[r.decision]}${r.reason ? `: ${r.reason}` : ''}`} />)}
        </Card>
      ) : null}
      <View style={{ marginTop: 20 }}>{k.status === 'SUBMITTED' && !done ? <DecisionPanel customerId={c.id} onDone={(r) => { setDone(r); load(); }} /> : <Notice kind="info">Este caso não está aguardando análise.</Notice>}</View>
      <View style={{ marginTop: 16 }}><Button onPress={() => navigation.navigate('Queue')} style={{ alignSelf: 'flex-start', minWidth: 180 }} title="Voltar para a fila" variant="ghost" /></View>
    </Shell>
  );
}

function CompanyQueuePage({ navigation }) {
  const { call } = useStaff();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); call('/companies/queue').then((d) => setItems(d.items)).catch((e) => setError(staffMessage(e))); }, [call]);
  useEffect(() => { load(); }, [load]);
  return (
    <Shell active="CompanyQueue" subtitle="Pedidos de conta PJ enviados para análise, do mais antigo para o mais novo." title="Empresas (PJ)">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!items && !error ? <LoadingBlock /> : null}
      {items && !items.length ? <Card><Body>Nenhum pedido de conta PJ aguardando análise.</Body></Card> : null}
      {items?.length ? (
        <Card style={{ padding: 0 }}>
          {items.map((it, i) => (
            <Pressable accessibilityRole="link" key={it.companyId} onPress={() => navigation.navigate('CompanyCase', { companyId: it.companyId })} style={({ hovered }) => [styles.queueRow, i === items.length - 1 && { borderBottomWidth: 0 }, hovered && { backgroundColor: 'rgba(191,194,199,0.05)' }]}>
              <View style={{ flex: 1, minWidth: 220 }}><Text style={styles.queueName}>{it.tradeName || it.legalName}</Text><Body muted style={{ fontSize: 13 }}>CNPJ {formatCnpj(it.cnpj)} · pedido por {it.applicantName}</Body></View>
              <Body muted style={{ fontSize: 13 }}>Enviado em {fmtDateTime(it.submittedAt)}</Body>
              <Text style={styles.queueOpen}>Analisar →</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
      <View style={{ marginTop: 16 }}><Button onPress={load} style={{ alignSelf: 'flex-start', minWidth: 160 }} title="Atualizar" variant="ghost" /></View>
    </Shell>
  );
}

function CompanyCasePage({ route, navigation }) {
  const { call, staff } = useStaff();
  const { companyId } = route.params || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const { isDesktop } = useLayout();
  const load = useCallback(() => { call(`/companies/cases/${companyId}`).then((d) => setData(d.case)).catch((e) => setError(staffMessage(e))); }, [call, companyId]);
  useEffect(() => { load(); }, [load]);
  if (error) return <Shell active="CompanyQueue" title="Análise PJ"><Notice kind="error">{error}</Notice><Button onPress={() => navigation.navigate('CompanyQueue')} title="Voltar para a fila" variant="ghost" /></Shell>;
  if (!data) return <Shell active="CompanyQueue" title="Análise PJ"><LoadingBlock /></Shell>;
  const c = data.company; const a = c.address; const r = data.receita; const ap = data.applicant;
  const [label, tone] = STATUS[c.status] || [c.status, 'neutral'];
  const kycLabel = (STATUS[ap?.kycStatus] || [ap?.kycStatus])[0];
  const nameMatch = r?.socios?.some((s) => ap && s.toUpperCase().includes(ap.name.split(' ')[0].toUpperCase()));
  return (
    <Shell active="CompanyQueue" subtitle={`CNPJ ${formatCnpj(c.cnpj)} · enviado em ${fmtDateTime(c.submittedAt)}`} title={c.tradeName || c.legalName}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 18 }}><Body muted>Situação:</Body><StatusPill label={label} tone={tone} /></View>
      {done ? <Notice kind="success" title="Decisão registrada">{`${DECISION_LABEL[done.status]}. ${done.notified ? 'O cliente foi avisado por e-mail.' : 'Atenção: o e-mail ao cliente não pôde ser enviado.'}`}</Notice> : null}
      {data.conflicts.approvedElsewhere ? <Notice kind="error" title="Atenção: CNPJ já aprovado">Já existe outra conta PJ APROVADA para este CNPJ. Uma segunda aprovação será bloqueada.</Notice> : null}
      {!data.conflicts.approvedElsewhere && data.conflicts.otherApplications > 0 ? <Notice kind="warning" title="Outros pedidos para este CNPJ">{`Existem ${data.conflicts.otherApplications} outro(s) pedido(s) para o mesmo CNPJ, feitos por outras pessoas. Confira quem de fato representa a empresa.`}</Notice> : null}
      <View style={[styles.cols, !isDesktop && { flexDirection: 'column' }]}>
        <Card style={{ flex: 1 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Dados informados</Heading>
          <DataRow label="Razão social" value={c.legalName || '—'} />
          <DataRow label="Nome fantasia" value={c.tradeName || '—'} />
          <DataRow label="Abertura" value={c.openingDate ? c.openingDate.split('-').reverse().join('/') : '—'} />
          <DataRow label="Natureza jurídica" value={c.legalNature || '—'} />
          <DataRow label="Atividade" value={c.mainActivity || '—'} />
          <DataRow label="Faturamento anual" value={optionLabel(COMPANY_REVENUE_OPTIONS, c.annualRevenueRange)} />
          <DataRow label="E-mail / telefone" value={`${c.businessEmail || '—'} · ${c.businessPhone ? maskPhoneInput(c.businessPhone) : '—'}`} />
          <DataRow last label="Endereço" value={a.street ? `${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ''} · ${a.district} · ${a.city}/${a.state} · CEP ${maskCepInput(a.cep)}` : '—'} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Receita Federal (consulta pública)</Heading>
          {r?.ok ? (
            <>
              <DataRow label="Situação cadastral" value={r.situacao || '—'} />
              <DataRow label="Razão social" value={r.razaoSocial || '—'} />
              <DataRow label="Abertura" value={r.abertura ? r.abertura.split('-').reverse().join('/') : '—'} />
              <DataRow label="Município" value={r.municipio ? `${r.municipio}/${r.uf}` : '—'} />
              <DataRow last label="Sócios (QSA)" value={r.socios?.length ? r.socios.join(' · ') : '—'} />
              {r.situacao && r.situacao !== 'ATIVA' ? <Notice kind="error" style={{ marginTop: 12 }}>{`Situação cadastral: ${r.situacao}.`}</Notice> : null}
            </>
          ) : <Notice kind="warning">{r?.error || 'Consulta indisponível.'}</Notice>}
        </Card>
      </View>
      <Card style={{ marginTop: 20 }}>
        <Heading level={2} style={{ marginBottom: 6 }}>Quem pediu</Heading>
        {ap ? (
          <>
            <DataRow label="Nome" value={ap.name} />
            <DataRow label="CPF" value={fmtCpf(ap.document)} />
            <DataRow label="E-mail" value={ap.email} />
            <DataRow label="Cargo declarado" value={optionLabel(COMPANY_POSITION_OPTIONS, c.applicantPosition)} />
            <DataRow last label="Identidade (KYC)" value={kycLabel || '—'} />
            {r?.ok && r.socios?.length ? <Notice kind={nameMatch ? 'success' : 'warning'} style={{ marginTop: 12 }}>{nameMatch ? 'O nome de quem pediu aparece entre os sócios da Receita.' : 'O nome de quem pediu NÃO aparece entre os sócios da Receita. Se for administrador(a) ou procurador(a), confira a procuração ou o contrato social.'}</Notice> : null}
            <View style={{ marginTop: 12 }}><Button onPress={() => navigation.navigate('Case', { customerId: ap.id })} style={{ alignSelf: 'flex-start', minWidth: 240 }} title="Ver a verificação (KYC) dessa pessoa" variant="ghost" /></View>
          </>
        ) : <Body muted>—</Body>}
      </Card>
      <Heading level={2} style={{ marginBottom: 12, marginTop: 24 }}>Documentos da empresa</Heading>
      <View style={styles.docsGrid}>{data.documents.map((d) => <View key={d.id} style={{ flexBasis: isDesktop ? '48%' : '100%', flexGrow: 1 }}><DocumentViewer basePath={`/companies/cases/${c.id}`} doc={d} viewer={staff?.name || ''} /></View>)}</View>
      {data.reviews.length ? (
        <Card style={{ marginTop: 20 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Histórico de análises</Heading>
          {data.reviews.map((rv, i) => <DataRow key={`${rv.createdAt}-${i}`} last={i === data.reviews.length - 1} label={`${fmtDateTime(rv.createdAt)} · ${rv.staffName}`} value={`${DECISION_LABEL[rv.decision]}${rv.reason ? `: ${rv.reason}` : ''}`} />)}
        </Card>
      ) : null}
      <View style={{ marginTop: 20 }}>{c.status === 'SUBMITTED' && !done ? <DecisionPanel approveNote="A aprovação ativa o vínculo da pessoa com a empresa. Ela NÃO libera nenhuma operação financeira." endpoint={`/companies/cases/${c.id}/decision`} onDone={(res) => { setDone(res); load(); }} /> : <Notice kind="info">Este pedido não está aguardando análise.</Notice>}</View>
      <View style={{ marginTop: 16 }}><Button onPress={() => navigation.navigate('CompanyQueue')} style={{ alignSelf: 'flex-start', minWidth: 180 }} title="Voltar para a fila" variant="ghost" /></View>
    </Shell>
  );
}

function StatCard({ label, value, hint, onPress }) {
  return (
    <Pressable accessibilityRole={onPress ? 'link' : undefined} disabled={!onPress} onPress={onPress} style={({ hovered }) => [styles.stat, hovered && onPress && { borderColor: ca.borderStrong }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Body muted style={{ fontSize: 12, marginTop: 4 }}>{hint}</Body> : null}
    </Pressable>
  );
}

function OverviewPage({ navigation }) {
  const { call, staff } = useStaff();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { call('/overview').then((d) => setO(d.overview)).catch((e) => setError(staffMessage(e))); }, [call]);
  const k = o?.kyc || {}; const c = o?.companies || {};
  return (
    <Shell active="Overview" subtitle={`Olá, ${staff?.name || ''}. Resumo do ambiente.`} title="Visão geral">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!o && !error ? <LoadingBlock /> : null}
      {o ? (
        <>
          <Heading level={2} style={{ marginBottom: 12 }}>Pendências</Heading>
          <View style={styles.statsRow}>
            <StatCard hint="Verificações de identidade aguardando" label="Fila de análise (KYC)" onPress={() => navigation.navigate('Queue')} value={o.pending.kyc} />
            <StatCard hint="Pedidos de conta PJ aguardando" label="Empresas (PJ)" onPress={() => navigation.navigate('CompanyQueue')} value={o.pending.companies} />
          </View>
          <Heading level={2} style={{ marginBottom: 12, marginTop: 24 }}>Clientes e verificações</Heading>
          <View style={styles.statsRow}>
            <StatCard label="Clientes cadastrados" onPress={() => navigation.navigate('Customers')} value={o.customers} />
            <StatCard label="KYC aprovados" value={k.APPROVED || 0} />
            <StatCard label="KYC com ajustes pedidos" value={k.CHANGES_REQUESTED || 0} />
            <StatCard label="KYC recusados" value={k.REJECTED || 0} />
          </View>
          <View style={[styles.statsRow, { marginTop: 12 }]}>
            <StatCard label="Contas PJ aprovadas" value={c.APPROVED || 0} />
            <StatCard label="PJ com ajustes pedidos" value={c.CHANGES_REQUESTED || 0} />
            <StatCard label="PJ em preenchimento" value={c.DRAFT || 0} />
            <StatCard label="PJ recusadas" value={c.REJECTED || 0} />
          </View>
        </>
      ) : null}
    </Shell>
  );
}

const KYC_LABEL = { NOT_STARTED: 'Não iniciada', IN_PROGRESS: 'Em preenchimento', SUBMITTED: 'Em análise', CHANGES_REQUESTED: 'Ajustes solicitados', APPROVED: 'Aprovada', REJECTED: 'Não aprovada' };

function CustomersPage({ navigation }) {
  const { call } = useStaff();
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const search = async () => {
    setBusy(true); setError('');
    try { setItems((await call(`/customers?q=${encodeURIComponent(q.trim())}`)).items); }
    catch (e) { setError(staffMessage(e)); }
    finally { setBusy(false); }
  };
  return (
    <Shell active="Customers" subtitle="Busque por nome, parte do e-mail ou CPF completo. Cada busca fica registrada (sem o termo pesquisado)." title="Clientes">
      <Card style={{ marginBottom: 20 }}>
        <View style={{ maxWidth: 520 }}>
          <Field label="Buscar cliente" onChangeText={setQ} onSubmitEditing={search} placeholder="Nome, e-mail ou CPF" value={q} />
          <Button loading={busy} onPress={search} style={{ alignSelf: 'flex-start', minWidth: 180 }} title="Buscar" />
        </View>
      </Card>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {items && !items.length ? <Body muted>Nenhum cliente encontrado.</Body> : null}
      {items?.length ? (
        <Card style={{ padding: 0 }}>
          {items.map((it, i) => (
            <Pressable accessibilityRole="link" key={it.id} onPress={() => navigation.navigate('Customer', { customerId: it.id })} style={({ hovered }) => [styles.queueRow, i === items.length - 1 && { borderBottomWidth: 0 }, hovered && { backgroundColor: 'rgba(191,194,199,0.05)' }]}>
              <View style={{ flex: 1, minWidth: 220 }}><Text style={styles.queueName}>{it.name}</Text><Body muted style={{ fontSize: 13 }}>{it.email} · CPF {it.documentMasked}</Body></View>
              {it.status === 'BLOCKED' ? <StatusPill label="Suspensa" tone="danger" /> : null}
              <StatusPill label={`KYC: ${KYC_LABEL[it.kycStatus] || it.kycStatus}`} tone={it.kycStatus === 'APPROVED' ? 'success' : 'neutral'} />
              <Text style={styles.queueOpen}>Abrir →</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Shell>
  );
}

function CustomerPage({ route, navigation }) {
  const { call, staff } = useStaff();
  const { customerId } = route.params || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const load = useCallback(() => { call(`/customers/${customerId}`).then((d) => setData(d.customer)).catch((e) => setError(staffMessage(e))); }, [call, customerId]);
  useEffect(() => { load(); }, [load]);
  const isAdmin = staff?.role === 'ADMIN';
  const run = async () => {
    setBusy(true); setResult(null);
    try {
      if (action === 'revoke') { await call(`/customers/${customerId}/revoke-sessions`, { method: 'POST', body: {} }); setResult({ kind: 'success', text: 'Todas as sessões do cliente foram encerradas.' }); }
      else { const r = await call(`/customers/${customerId}/${action}`, { method: 'POST', body: { reason } }); setResult({ kind: 'success', text: `${r.status === 'BLOCKED' ? 'Conta suspensa e sessões encerradas.' : 'Conta reativada.'} ${r.notified ? 'O cliente foi avisado por e-mail.' : 'Atenção: o e-mail ao cliente não pôde ser enviado.'}` }); }
      setAction(null); setReason(''); load();
    } catch (e) { setResult({ kind: 'error', text: staffMessage(e) }); }
    finally { setBusy(false); }
  };
  if (error) return <Shell active="Customers" title="Cliente"><Notice kind="error">{error}</Notice></Shell>;
  if (!data) return <Shell active="Customers" title="Cliente"><LoadingBlock /></Shell>;
  const c = data.customer;
  return (
    <Shell active="Customers" subtitle={`Cliente desde ${formatDate(c.createdAt)}`} title={c.name}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <StatusPill label={c.status === 'BLOCKED' ? 'Conta suspensa' : 'Conta ativa'} tone={c.status === 'BLOCKED' ? 'danger' : 'success'} />
        <StatusPill label={`KYC: ${KYC_LABEL[data.kyc.status] || data.kyc.status}`} tone={data.kyc.status === 'APPROVED' ? 'success' : 'neutral'} />
      </View>
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <View style={styles.cols}>
        <Card style={{ flex: 1, minWidth: 300 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Cadastro</Heading>
          <DataRow label="CPF" value={fmtCpf(c.document)} />
          <DataRow label="E-mail" value={`${c.email}${c.emailVerified ? ' (confirmado)' : ' (não confirmado)'}`} />
          <DataRow label="Celular" value={c.phone} />
          <DataRow last label="Verificação (KYC)" value={`${KYC_LABEL[data.kyc.status] || data.kyc.status}${data.kyc.reviewedAt ? ` · analisada em ${formatDate(data.kyc.reviewedAt)}` : ''}`} />
          {['SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(data.kyc.status) ? <View style={{ marginTop: 12 }}><Button onPress={() => navigation.navigate('Case', { customerId: c.id })} style={{ alignSelf: 'flex-start', minWidth: 220 }} title="Abrir a verificação (KYC)" variant="ghost" /></View> : null}
        </Card>
        <Card style={{ flex: 1, minWidth: 300 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Empresas</Heading>
          {data.companies.length ? data.companies.map((co, i) => <DataRow key={co.id} last={i === data.companies.length - 1} label={`CNPJ ${formatCnpj(co.cnpj)}`} value={`${co.name || 'sem nome'} · ${(STATUS[co.status] || [co.status])[0]}`} />) : <Body muted>Nenhum pedido de conta PJ.</Body>}
        </Card>
      </View>
      {isAdmin ? (
        <Card style={{ marginTop: 20, borderColor: 'rgba(224,138,128,0.35)' }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Ações de administrador</Heading>
          <Body muted style={{ marginBottom: 14 }}>Cada ação fica registrada na auditoria com o seu nome. O motivo fica só no registro interno; o cliente recebe um aviso sem o motivo.</Body>
          {!action ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {c.status === 'ACTIVE' ? <Button onPress={() => setAction('block')} style={{ minWidth: 200 }} title="Suspender conta" variant="outline" /> : <Button onPress={() => setAction('unblock')} style={{ minWidth: 200 }} title="Reativar conta" variant="outline" />}
              <Button onPress={() => setAction('revoke')} style={{ minWidth: 220 }} title="Encerrar todas as sessões" variant="ghost" />
            </View>
          ) : (
            <View style={{ maxWidth: 560 }}>
              {action !== 'revoke' ? <Field autoCapitalize="sentences" hint="De 10 a 500 caracteres." label={action === 'block' ? 'Motivo da suspensão' : 'Motivo da reativação'} maxLength={500} multiline numberOfLines={3} onChangeText={setReason} value={reason} /> : <Notice kind="warning">O cliente precisará entrar de novo em todos os dispositivos.</Notice>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Button loading={busy} onPress={run} style={{ minWidth: 220 }} title={action === 'block' ? 'Confirmar suspensão' : action === 'unblock' ? 'Confirmar reativação' : 'Confirmar encerramento'} />
                <Button onPress={() => { setAction(null); setReason(''); }} style={{ minWidth: 140 }} title="Cancelar" variant="ghost" />
              </View>
            </View>
          )}
        </Card>
      ) : null}
      {data.statusHistory.length ? (
        <Card style={{ marginTop: 20 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Histórico de suspensões</Heading>
          {data.statusHistory.map((h, i) => <DataRow key={`${h.createdAt}-${i}`} last={i === data.statusHistory.length - 1} label={`${fmtDateTime(h.createdAt)} · ${h.staffName}`} value={`${h.action === 'BLOCK' ? 'Suspensa' : 'Reativada'}: ${h.reason}`} />)}
        </Card>
      ) : null}
      <Card style={{ marginTop: 20 }}>
        <Heading level={2} style={{ marginBottom: 6 }}>Atividade recente</Heading>
        {data.recentEvents.length ? data.recentEvents.map((e, i) => {
          const [ol, ot] = OUTCOME_LABELS[e.outcome] || [e.outcome, 'neutral'];
          return (
            <View key={`${e.occurredAt}-${i}`} style={[styles.eventRow, i === data.recentEvents.length - 1 && { borderBottomWidth: 0 }]}>
              <Body muted style={{ fontSize: 13, minWidth: 130 }}>{fmtDateTime(e.occurredAt)}</Body>
              <Text style={styles.eventName}>{eventLabel(e.event)}{e.byStaff ? ' (equipe)' : ''}</Text>
              <StatusPill label={ol} tone={ot} />
              <Body muted style={{ fontSize: 12 }}>{e.ip || ''}</Body>
            </View>
          );
        }) : <Body muted>Sem atividade registrada.</Body>}
      </Card>
    </Shell>
  );
}

function AuditPage({ navigation }) {
  const { call, staff } = useStaff();
  const [events, setEvents] = useState(null);
  const [eventFilter, setEventFilter] = useState('');
  const [error, setError] = useState('');
  const [more, setMore] = useState(true);
  const load = useCallback(async (append = false, ev = eventFilter) => {
    setError('');
    const params = new URLSearchParams();
    if (ev) params.set('event', ev);
    if (append && events?.length) params.set('before', events[events.length - 1].occurredAt);
    try {
      const d = await call(`/audit${params.toString() ? `?${params}` : ''}`);
      setEvents((cur) => (append ? [...(cur || []), ...d.events] : d.events));
      setMore(d.events.length === 100);
    } catch (e) { setError(staffMessage(e)); }
  }, [call, events, eventFilter]);
  useEffect(() => { if (staff?.role === 'ADMIN') load(false, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (staff?.role !== 'ADMIN') return <Shell active="Audit" title="Auditoria"><Notice kind="error">Apenas administradores acessam a auditoria.</Notice></Shell>;
  const options = [{ value: '', label: 'Todos' }, ...['CUSTOMER_LOGIN', 'STAFF_LOGIN_MFA', 'STAFF_CUSTOMER_SEARCH', 'STAFF_CUSTOMER_VIEW', 'STAFF_KYC_DOCUMENT_VIEW', 'STAFF_KYC_DECISION', 'STAFF_COMPANY_DECISION', 'STAFF_CUSTOMER_BLOCK', 'STAFF_CUSTOMER_UNBLOCK', 'STAFF_AUDIT_VIEW'].map((v) => ({ value: v, label: EVENT_LABELS[v] }))];
  return (
    <Shell active="Audit" subtitle="Registro protegido de acessos e ações. Não pode ser alterado nem apagado; esta consulta também fica registrada." title="Auditoria">
      <ChoiceGroup label="Filtrar por tipo" onChange={(v) => { setEventFilter(v); load(false, v); }} options={options} value={eventFilter} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!events && !error ? <LoadingBlock /> : null}
      {events ? (
        <Card style={{ padding: 0 }}>
          {events.length ? events.map((e, i) => {
            const [ol, ot] = OUTCOME_LABELS[e.outcome] || [e.outcome, 'neutral'];
            const details = describeDetails(e.details);
            return (
              <View key={e.id || i} style={[styles.eventRow, { paddingHorizontal: 18 }, i === events.length - 1 && { borderBottomWidth: 0 }]}>
                <Body muted style={{ fontSize: 13, minWidth: 130 }}>{fmtDateTime(e.occurredAt)}</Body>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={styles.eventName}>{eventLabel(e.event)}</Text>
                  {e.customerName ? <Text style={styles.eventCustomer}>Cliente: {e.customerName} · {e.customerEmail}</Text> : null}
                  <Body muted style={{ fontSize: 12 }}>{[e.staffName ? `por ${e.staffName}` : e.customerId ? 'pelo próprio cliente' : 'sem conta identificada', details, e.ip ? `IP ${e.ip}` : ''].filter(Boolean).join(' · ')}</Body>
                </View>
                <StatusPill label={ol} tone={ot} />
                {e.customerId ? <LinkText onPress={() => navigation.navigate('Customer', { customerId: e.customerId })}>{e.customerName ? `${e.customerName.split(' ')[0]} →` : 'Cliente →'}</LinkText> : null}
              </View>
            );
          }) : <View style={{ padding: 18 }}><Body muted>Nenhum registro.</Body></View>}
        </Card>
      ) : null}
      {events?.length && more ? <View style={{ marginTop: 14 }}><Button onPress={() => load(true)} style={{ alignSelf: 'flex-start', minWidth: 200 }} title="Carregar mais" variant="ghost" /></View> : null}
    </Shell>
  );
}

function TeamPage() {
  const { call, staff } = useStaff();
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'ANALYST' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { call('/users').then((d) => setUsers(d.users)).catch((e) => setResult({ kind: 'error', text: staffMessage(e) })); }, [call]);
  useEffect(() => { load(); }, [load]);
  const invite = async () => {
    setBusy(true); setResult(null);
    try { await call('/users', { method: 'POST', body: { name: form.name.trim(), email: form.email.trim(), role: form.role } }); setResult({ kind: 'success', text: `Convite enviado para ${form.email.trim()}. O link vale por 48 horas.` }); setForm({ name: '', email: '', role: 'ANALYST' }); load(); }
    catch (e) { setResult({ kind: 'error', text: staffMessage(e) }); }
    finally { setBusy(false); }
  };
  const [resetFor, setResetFor] = useState(null);
  const [resetForm, setResetForm] = useState({ reason: '', code: '' });
  const resetAccess = async (u) => {
    if (resetForm.reason.trim().length < 10) { setResult({ kind: 'error', text: 'Explique o motivo (pelo menos 10 caracteres).' }); return; }
    if (resetForm.code.length !== 6) { setResult({ kind: 'error', text: 'Digite o código de 6 dígitos do SEU aplicativo autenticador.' }); return; }
    setBusy(true); setResult(null);
    try {
      const r = await call(`/users/${u.id}/reset-access`, { method: 'POST', body: { reason: resetForm.reason.trim(), code: resetForm.code } });
      setResult({ kind: 'success', text: `Acesso de ${u.name} redefinido: senha e autenticador antigos não valem mais e as sessões foram encerradas. ${u.name} recebeu um link de 24 horas para criar o acesso de novo; ${r.notifiedAdmins} administrador(es) avisado(s) por e-mail.` });
      setResetFor(null); setResetForm({ reason: '', code: '' }); load();
    } catch (e) { setResult({ kind: 'error', text: staffMessage(e) }); }
    finally { setBusy(false); }
  };
  const act = async (path, text) => {
    setResult(null);
    try { await call(path, { method: 'POST', body: {} }); setResult({ kind: 'success', text }); load(); }
    catch (e) { setResult({ kind: 'error', text: staffMessage(e) }); }
  };
  if (staff?.role !== 'ADMIN') return <Shell active="Team" title="Equipe"><Notice kind="error">Apenas administradores acessam esta página.</Notice></Shell>;
  const statusLabel = { ACTIVE: ['Ativo', 'success'], INVITED: ['Convite pendente', 'warning'], DISABLED: ['Desativado', 'danger'] };
  return (
    <Shell active="Team" subtitle="Quem tem acesso ao painel. Todo acesso exige verificação em duas etapas." title="Equipe">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <Card>
        {!users ? <LoadingBlock /> : users.map((u, i) => {
          const [l, t] = statusLabel[u.status] || [u.status, 'neutral'];
          return (
            <View key={u.id} style={[styles.teamRow, i === users.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1, minWidth: 220 }}><Text style={styles.queueName}>{u.name}</Text><Body muted style={{ fontSize: 13 }}>{u.email} · {u.role === 'ADMIN' ? 'Administrador(a)' : 'Analista'} · último acesso {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : '—'}</Body></View>
              <StatusPill label={l} tone={t} />
              {u.status === 'INVITED' ? <Button onPress={() => act(`/users/${u.id}/resend-invite`, 'Convite reenviado.')} title="Reenviar convite" variant="ghost" /> : null}
              {u.status === 'ACTIVE' && u.id !== staff.id ? <Button onPress={() => { setResetFor(resetFor === u.id ? null : u.id); setResetForm({ reason: '', code: '' }); setResult(null); }} title={resetFor === u.id ? 'Cancelar' : 'Redefinir acesso'} variant="ghost" /> : null}
              {u.status !== 'DISABLED' && u.id !== staff.id ? <Button onPress={() => act(`/users/${u.id}/disable`, 'Acesso desativado e sessões encerradas.')} title="Desativar" variant="ghost" /> : null}
              {resetFor === u.id ? (
                <View style={{ flexBasis: '100%', marginTop: 8, maxWidth: 560 }}>
                  <Notice kind="info" title="Redefinir o acesso de outra pessoa">Use quando a pessoa perdeu o celular do autenticador (ou a senha e o celular). A senha e o autenticador atuais deixam de valer, as sessões são encerradas, a pessoa recebe um link de 24 horas para criar o acesso de novo e todos os administradores são avisados.</Notice>
                  <Field label="Motivo (fica na auditoria e vai no aviso aos administradores)" multiline numberOfLines={3} onChangeText={(v) => setResetForm((f) => ({ ...f, reason: v }))} value={resetForm.reason} />
                  <Field autoComplete="one-time-code" inputMode="numeric" keyboardType="number-pad" label="O SEU código do autenticador (confirmação)" maxLength={6} onChangeText={(v) => setResetForm((f) => ({ ...f, code: v.replace(/\D/g, '').slice(0, 6) }))} placeholder="000000" value={resetForm.code} />
                  <Button loading={busy} onPress={() => resetAccess(u)} style={{ alignSelf: 'flex-start', minWidth: 240 }} title="Confirmar redefinição" />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
      <Card style={{ marginTop: 20 }}>
        <Heading level={2} style={{ marginBottom: 14 }}>Convidar pessoa</Heading>
        <View style={{ maxWidth: 520 }}>
          <Field autoCapitalize="words" label="Nome" onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} value={form.name} />
          <Field inputMode="email" keyboardType="email-address" label="E-mail individual" onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} value={form.email} />
          <ChoiceGroup label="Perfil" onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={[{ value: 'ANALYST', label: 'Analista (analisa KYC)' }, { value: 'ADMIN', label: 'Administrador(a) (também gerencia a equipe)' }]} value={form.role} />
          <Button loading={busy} onPress={invite} style={{ alignSelf: 'flex-start', minWidth: 220 }} title="Enviar convite" />
        </View>
      </Card>
    </Shell>
  );
}

function Navigator() {
  const { session } = useStaff();
  return (
    <NavigationContainer documentTitle={{ formatter: (o, r) => `${o?.title ?? TITLES[r?.name] ?? 'Painel'} · Equipe CTBX` }} fallback={<LoadingBlock />} linking={linking} theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: ca.bg } }}>
        {session ? (
          <>
            <Stack.Screen component={OverviewPage} name="Overview" options={{ title: TITLES.Overview }} />
            <Stack.Screen component={QueuePage} name="Queue" options={{ title: TITLES.Queue }} />
            <Stack.Screen component={CustomersPage} name="Customers" options={{ title: TITLES.Customers }} />
            <Stack.Screen component={CustomerPage} name="Customer" options={{ title: TITLES.Customer }} />
            <Stack.Screen component={AuditPage} name="Audit" options={{ title: TITLES.Audit }} />
            <Stack.Screen component={CasePage} name="Case" options={{ title: TITLES.Case }} />
            <Stack.Screen component={CompanyQueuePage} name="CompanyQueue" options={{ title: TITLES.CompanyQueue }} />
            <Stack.Screen component={CompanyCasePage} name="CompanyCase" options={{ title: TITLES.CompanyCase }} />
            <Stack.Screen component={TeamPage} name="Team" options={{ title: TITLES.Team }} />
          </>
        ) : (
          <>
            <Stack.Screen component={LoginPage} name="Login" options={{ title: TITLES.Login }} />
            <Stack.Screen component={ForgotPasswordPage} name="ForgotPassword" options={{ title: TITLES.ForgotPassword }} />
            <Stack.Screen component={ResetPasswordPage} name="ResetPassword" options={{ title: TITLES.ResetPassword }} />
            <Stack.Screen component={InvitePage} name="Invite" options={{ title: TITLES.Invite }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function StaffApp() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, CormorantGaramond_500Medium, CormorantGaramond_600SemiBold });
  if (!loaded && !error) return <View style={{ backgroundColor: ca.bg, flex: 1 }} />;
  return <StaffSessionProvider><Navigator /></StaffSessionProvider>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerCol: { maxWidth: 440, width: '100%' },
  title: { color: ca.text, fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.3, marginBottom: 8, marginTop: 10 },
  secret: { backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 10, borderWidth: 1, color: ca.goldLight, fontFamily: fonts.medium, fontSize: 15, letterSpacing: 1, marginBottom: 18, padding: 12 },
  row: { backgroundColor: ca.bg, flex: 1, flexDirection: 'row' },
  sidebar: { backgroundColor: ca.bgRaised, borderRightColor: ca.border, borderRightWidth: 1, padding: 26, width: 260 },
  navItem: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  navActive: { backgroundColor: 'rgba(197,164,108,0.08)' },
  navText: { color: ca.textSoft, fontFamily: fonts.medium, fontSize: 15 },
  sideFooter: { borderTopColor: ca.border, borderTopWidth: 1, marginTop: 'auto', paddingTop: 16 },
  topWho: { alignItems: 'center', flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  who: { color: ca.text, fontFamily: fonts.medium, fontSize: 14 },
  role: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 12, marginBottom: 6 },
  logout: { paddingVertical: 8 },
  logoutText: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 14 },
  topBar: { backgroundColor: ca.bgRaised, borderBottomColor: ca.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  mobileNav: { alignItems: 'center', backgroundColor: ca.bgRaised, borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  pageTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.3 },
  queueRow: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 22, paddingVertical: 16, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
  queueName: { color: ca.text, fontFamily: fonts.semibold, fontSize: 15 },
  queueOpen: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 14 },
  cols: { flexDirection: 'row', gap: 20 },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  docBox: { backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 14, borderWidth: 1, padding: 14 },
  docHead: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 10 },
  docTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 14 },
  watermark: { bottom: 10, color: 'rgba(244,244,242,0.55)', fontFamily: fonts.medium, fontSize: 11, left: 10, position: 'absolute', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 },
  stat: { backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 14, borderWidth: 1, flexBasis: 200, flexGrow: 1, padding: 18 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statValue: { color: ca.goldTitle, fontFamily: fonts.semibold, fontSize: 34, lineHeight: 40 },
  statLabel: { color: ca.text, fontFamily: fonts.semibold, fontSize: 14, marginTop: 4 },
  eventRow: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 12 },
  eventName: { color: ca.text, fontFamily: fonts.medium, fontSize: 14 },
  eventCustomer: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  teamRow: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 14 },
});
