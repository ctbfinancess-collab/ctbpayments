import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DarkTheme, NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { CormorantGaramond_500Medium, CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import QRCode from 'qrcode';
import { COMPANY_DOCUMENTS, COMPANY_POSITION_OPTIONS, COMPANY_REVENUE_OPTIONS, documentTypeLabel, DOCUMENT_KINDS, formatBytes, formatCnpj, formatDate, incomeLabel, maskCepInput, maskPhoneInput, optionLabel } from '../customer-area/logic';
import { ca, fonts } from '../customer-area/theme';
import { Body, Brand, Button, Card as BaseCard, ChoiceGroup, DataRow, Eyebrow, Field, Heading, LinkText, LoadingBlock, Notice, Page, StatusPill, useLayout } from '../customer-area/ui';
import { StaffSessionProvider, staffApi, staffMessage, useStaff } from './api';
import { describeDetails, eventLabel, EVENT_LABELS, OUTCOME_LABELS } from './events';

// Painel da equipe (análise de KYC) — serviço próprio, separado da Área do
// Cliente. Acesso só com convite, senha forte e verificação em duas etapas.

// Marca-d'água: o globo da CTBX (imagem original, fundo transparente), atrás
// do conteúdo. Grande à direita no Dashboard; no canto nas páginas internas;
// nunca nas telas de análise (documentos e selfie).
const GLOBE = require('../../assets/brand/globo-ctbx.png');
// Cartões levemente translúcidos para o globo aparecer por trás sem
// prejudicar a leitura (aprovado na prévia 1).
const CARD_BG = 'rgba(28,30,33,0.82)';
const Card = ({ style, ...rest }) => <BaseCard style={[{ backgroundColor: CARD_BG }, style]} {...rest} />;
const Stack = createNativeStackNavigator();
const linking = { prefixes: [], config: { screens: { Login: 'entrar', ForgotPassword: 'esqueci-minha-senha', ResetPassword: 'redefinir-senha', Invite: 'convite', Overview: 'inicio', Customers: 'clientes', Customer: 'clientes/:customerId', Audit: 'auditoria', Queue: 'fila', Case: 'analise/:customerId', CompanyQueue: 'empresas', CompanyCase: 'empresas/:companyId', Team: 'equipe', Lgpd: 'lgpd', LgpdCase: 'lgpd/:requestId', Reports: 'relatorios' } } };
const TITLES = { Login: 'Entrar', ForgotPassword: 'Esqueci minha senha', ResetPassword: 'Redefinir senha', Invite: 'Aceitar convite', Overview: 'Visão geral', Customers: 'Clientes', Customer: 'Cliente', Audit: 'Auditoria', Queue: 'Fila de análise', Case: 'Análise', CompanyQueue: 'Empresas (PJ)', CompanyCase: 'Análise PJ', Team: 'Equipe' , Lgpd: 'Solicitações LGPD', LgpdCase: 'Solicitação LGPD', Reports: 'Relatórios' };
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: ca.bg, card: ca.bgRaised, primary: ca.gold, text: ca.text, border: ca.border } };
// Lê o código do link (convite/redefinição) e o tira da barra de endereço,
// para não ficar no histórico do navegador.
const tokenFromUrl = () => {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token') || '';
    if (token) { url.searchParams.delete('token'); window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash); }
    return token;
  } catch { return ''; }
};
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

function Watermark({ variant }) {
  if (!variant) return null;
  const style = variant === 'dashboard'
    ? { position: 'absolute', right: -150, top: 110, width: 1000, height: 667, opacity: 0.32 }
    : { position: 'absolute', right: -160, bottom: -120, width: 820, height: 547, opacity: 0.16 };
  return <Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" resizeMode="contain" source={GLOBE} style={style} />;
}

const NAV_GROUPS = [
  { title: null, items: [{ route: 'Overview', label: 'Dashboard' }] },
  { title: 'Análise', items: [{ route: 'Queue', label: 'Fila de análise KYC', badge: 'kyc' }, { route: 'CompanyQueue', label: 'Empresas (PJ)', badge: 'companies' }] },
  { title: 'Clientes', items: [{ route: 'Customers', label: 'Clientes' }] },
  { title: 'Controle', admin: true, items: [{ route: 'Audit', label: 'Auditoria' }, { route: 'Team', label: 'Equipe' }] },
  { title: 'LGPD e relatórios', admin: true, items: [{ route: 'Lgpd', label: 'Solicitações LGPD', badge: 'lgpd' }, { route: 'Reports', label: 'Relatórios' }] },
];

function Shell({ active, title, subtitle, eyebrow, children, watermark = 'corner' }) {
  const { staff, signOut, call } = useStaff();
  const navigation = useNavigation();
  const { isDesktop } = useLayout();
  const [badges, setBadges] = useState(null);
  useEffect(() => { let alive = true; call('/badges').then((d) => { if (alive) setBadges(d.badges); }).catch(() => {}); return () => { alive = false; }; }, [call, active]);
  const groups = NAV_GROUPS.filter((g) => !g.admin || staff?.role === 'ADMIN');
  const item = (n) => {
    const on = active === n.route;
    const raw = n.badge && badges ? badges[n.badge] : 0;
    const count = raw && typeof raw === 'object' ? raw.open : raw;
    const inner = (
      <>
        <Text style={[styles.navText, on && styles.navTextOn]}>{n.label}</Text>
        {count ? <View style={[styles.badge, on && styles.badgeOn]}><Text style={[styles.badgeText, on && styles.badgeTextOn]}>{count}</Text></View> : null}
      </>
    );
    return (
      <Pressable accessibilityRole="link" accessibilityState={{ selected: on }} key={n.route} onPress={() => navigation.navigate(n.route)} style={({ hovered }) => [styles.navItem, hovered && !on && { backgroundColor: 'rgba(191,194,199,0.06)' }]}>
        {on ? <LinearGradient colors={['#A98A52', '#E6CC97', '#C5A46C']} end={{ x: 1, y: 0 }} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} style={styles.navActiveFill}>{inner}</LinearGradient> : <View style={styles.navInner}>{inner}</View>}
      </Pressable>
    );
  };
  const nav = groups.map((g, i) => (
    <View key={g.title || i} style={{ gap: 2 }}>
      {g.title ? <Text style={styles.navGroup}>{g.title.toUpperCase()}</Text> : null}
      {g.items.map(item)}
    </View>
  ));
  const who = (
    <View style={isDesktop ? styles.sideFooter : styles.topWho}>
      <Text numberOfLines={1} style={styles.who}>{staff?.name}</Text>
      <Text style={styles.role}>{staff?.role === 'ADMIN' ? 'Administrador(a)' : 'Analista'}</Text>
      <Pressable accessibilityRole="button" onPress={() => signOut()} style={styles.logout}><Text style={styles.logoutText}>Sair</Text></Pressable>
    </View>
  );
  const header = (
    <View style={{ marginBottom: 24 }}>
      {eyebrow ? <Text style={styles.headerEyebrow}>{eyebrow.toUpperCase()}</Text> : null}
      <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Body style={{ marginTop: 6 }}>{subtitle}</Body> : null}
    </View>
  );
  const content = (pad) => (
    <View style={styles.mainArea}>
      <Watermark variant={watermark} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: pad }} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
        <View style={{ maxWidth: 1180, width: '100%' }}>{header}{children}</View>
      </ScrollView>
    </View>
  );
  if (isDesktop) {
    return (
      <View style={styles.row}>
        <View style={styles.sidebar}><Brand size="sm" /><Eyebrow style={{ marginTop: 18 }}>Painel da equipe</Eyebrow><View style={{ gap: 18, marginTop: 24 }}>{nav}</View>{who}</View>
        {content(40)}
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: ca.bg, flex: 1 }}>
      <View style={styles.topBar}><Brand size="sm" /></View>
      <View style={styles.mobileNav}>{groups.flatMap((g) => g.items).map(item)}{who}</View>
      {content(18)}
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
  if (error) return <Shell active="Queue" title="Análise" watermark={false}><Notice kind="error">{error}</Notice><Button onPress={() => navigation.navigate('Queue')} title="Voltar para a fila" variant="ghost" /></Shell>;
  if (!data) return <Shell active="Queue" title="Análise" watermark={false}><LoadingBlock /></Shell>;
  const c = data.customer; const k = data.kyc; const a = k.address;
  const [label, tone] = STATUS[k.status] || [k.status, 'neutral'];
  return (
    <Shell active="Queue" watermark={false} subtitle={`Enviado em ${fmtDateTime(k.submittedAt)}`} title={c.name}>
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
  if (error) return <Shell active="CompanyQueue" title="Análise PJ" watermark={false}><Notice kind="error">{error}</Notice><Button onPress={() => navigation.navigate('CompanyQueue')} title="Voltar para a fila" variant="ghost" /></Shell>;
  if (!data) return <Shell active="CompanyQueue" title="Análise PJ" watermark={false}><LoadingBlock /></Shell>;
  const c = data.company; const a = c.address; const r = data.receita; const ap = data.applicant;
  const [label, tone] = STATUS[c.status] || [c.status, 'neutral'];
  const kycLabel = (STATUS[ap?.kycStatus] || [ap?.kycStatus])[0];
  const nameMatch = r?.socios?.some((s) => ap && s.toUpperCase().includes(ap.name.split(' ')[0].toUpperCase()));
  return (
    <Shell active="CompanyQueue" watermark={false} subtitle={`CNPJ ${formatCnpj(c.cnpj)} · enviado em ${fmtDateTime(c.submittedAt)}`} title={c.tradeName || c.legalName}>
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


const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ago = (iso) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60); if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
};
const duration = (hours) => {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0).replace('.', ',')} h`;
  return `${(hours / 24).toFixed(1).replace('.', ',')} dias`;
};
const ACTIVITY_TEXT = {
  STAFF_KYC_DECISION: { APPROVED: 'aprovou a verificação de', CHANGES_REQUESTED: 'pediu ajuste na verificação de', REJECTED: 'recusou a verificação de' },
  STAFF_COMPANY_DECISION: { APPROVED: 'aprovou a conta PJ de', CHANGES_REQUESTED: 'pediu ajuste na conta PJ de', REJECTED: 'recusou a conta PJ de' },
  STAFF_CUSTOMER_BLOCK: 'suspendeu a conta de', STAFF_CUSTOMER_UNBLOCK: 'reativou a conta de',
  STAFF_USER_INVITE: 'convidou uma pessoa para a equipe', STAFF_USER_DISABLE: 'desativou o acesso de', STAFF_USER_ACCESS_RESET: 'redefiniu o acesso de',
};
const activityText = (a) => { const t = ACTIVITY_TEXT[a.event]; const verb = typeof t === 'object' ? t[a.decision] || 'registrou uma decisão para' : t || a.event; return a.subject ? `${verb} ${a.subject}` : verb; };

// Gráfico de novos cadastros (12 meses): desenhado em SVG, na escala dos dados.
function SignupChart({ series }) {
  if (Platform.OS !== 'web') return null;
  const W = 640, H = 220, L = 34, R = 14, T = 16, B = 30;
  const max = Math.max(4, ...series.map((p) => Math.max(p.pf, p.pj)));
  const step = Math.max(1, Math.ceil(max / 4)); const top = step * 4;
  const x = (i) => L + (i * (W - L - R)) / (series.length - 1);
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const line = (k) => series.map((p, i) => `${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const area = `M${x(0)} ${y(0)} L${line('pf').replace(/ /g, ' L')} L${x(series.length - 1)} ${y(0)} Z`;
  const h = React.createElement;
  return h('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Novos cadastros por mês nos últimos 12 meses, pessoas físicas e empresas', style: { width: '100%', height: 'auto', display: 'block' } },
    h('defs', null, h('linearGradient', { id: 'ctbxArea', x1: 0, x2: 0, y1: 0, y2: 1 }, h('stop', { offset: 0, stopColor: '#C5A46C', stopOpacity: 0.35 }), h('stop', { offset: 1, stopColor: '#C5A46C', stopOpacity: 0 }))),
    [0, 1, 2, 3, 4].map((t) => h('g', { key: `g${t}` }, h('line', { x1: L, x2: W - R, y1: y(t * step), y2: y(t * step), stroke: 'rgba(191,194,199,0.12)' }), h('text', { x: L - 8, y: y(t * step) + 4, fill: '#8E9298', fontSize: 11, textAnchor: 'end', fontFamily: 'Inter_400Regular, Inter, sans-serif' }, String(t * step)))),
    h('path', { d: area, fill: 'url(#ctbxArea)' }),
    h('polyline', { points: line('pj'), fill: 'none', stroke: '#9AA3AD', strokeWidth: 2, strokeDasharray: '5 4' }),
    h('polyline', { points: line('pf'), fill: 'none', stroke: '#E6CD9C', strokeWidth: 2.4, strokeLinejoin: 'round' }),
    series.map((p, i) => h('g', { key: p.month },
      h('circle', { cx: x(i), cy: y(p.pf), r: i === series.length - 1 ? 4 : 2.5, fill: '#E6CD9C' }, h('title', null, `${MONTHS[Number(p.month.slice(5)) - 1]}/${p.month.slice(2, 4)}: ${p.pf} PF, ${p.pj} PJ`)),
      h('text', { x: x(i), y: H - 8, fill: '#8E9298', fontSize: 11, textAnchor: 'middle', fontFamily: 'Inter_400Regular, Inter, sans-serif' }, MONTHS[Number(p.month.slice(5)) - 1]))));
}

function Kpi({ value, label, hint, alert, onPress }) {
  return (
    <Pressable accessibilityRole={onPress ? 'link' : undefined} disabled={!onPress} onPress={onPress} style={({ hovered }) => [styles.stat, alert && styles.statAlert, hovered && onPress && { borderColor: ca.borderStrong }]}>
      <Text style={[styles.statValue, !alert && { color: ca.text }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Body muted style={[{ fontSize: 12, marginTop: 4 }, alert && { color: ca.goldLight }]}>{hint}</Body> : null}
    </Pressable>
  );
}

function OverviewPage({ navigation }) {
  const { call, staff } = useStaff();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { call('/dashboard').then((r) => setD(r.dashboard)).catch((e) => setError(staffMessage(e))); }, [call]);
  const k = d?.kyc || {}; const c = d?.companies || {};
  const segments = [
    { key: 'APPROVED', label: 'Aprovadas', color: '#C5A46C' }, { key: 'SUBMITTED', label: 'Em análise', color: '#E6CD9C' },
    { key: 'CHANGES_REQUESTED', label: 'Ajustes pedidos', color: '#9AA3AD' }, { key: 'IN_PROGRESS', label: 'Em preenchimento', color: '#5C6168' },
    { key: 'REJECTED', label: 'Não aprovadas', color: '#B06B62' },
  ];
  const totalKyc = segments.reduce((a, sgm) => a + (k[sgm.key] || 0), 0);
  const first = (staff?.name || '').split(' ')[0];
  return (
    <Shell active="Overview" eyebrow="Visão geral" subtitle={`Olá, ${first}. Cadastros, verificações e pendências da CTBX Payments.`} title="Painel da Equipe" watermark="dashboard">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!d && !error ? <LoadingBlock /> : null}
      {d ? (
        <View style={{ gap: 18 }}>
          <View style={styles.statsRow}>
            <Kpi hint={`+${d.newCustomers30d} nos últimos 30 dias`} label="Clientes PF" onPress={() => navigation.navigate('Customers')} value={d.customers} />
            <Kpi hint={`${c.APPROVED || 0} aprovadas`} label="Empresas PJ" onPress={() => navigation.navigate('CompanyQueue')} value={d.companiesTotal} />
            <Kpi alert={d.pending.kyc > 0} hint={d.pending.kyc > 0 && d.pending.oldestKycSubmittedAt ? `o mais antigo ${ago(d.pending.oldestKycSubmittedAt)}` : 'nenhuma na fila'} label="KYC aguardando análise" onPress={() => navigation.navigate('Queue')} value={d.pending.kyc} />
            <Kpi hint={`envio → decisão, ${d.review.last30Days} nos últimos 30 dias`} label="Tempo médio de análise" value={duration(d.review.avgHours)} />
            <Kpi hint="aguardando o cliente" label="Ajustes pedidos" value={(k.CHANGES_REQUESTED || 0) + (c.CHANGES_REQUESTED || 0)} />
          </View>

          <View style={styles.dashRow}>
            <Card style={[styles.dashCard, { flexGrow: 2, flexBasis: 520 }]}>
              <View style={styles.dashHead}><Text style={styles.dashTitle}>Novos cadastros</Text><Body muted style={{ fontSize: 13 }}>últimos 12 meses · <Text style={{ color: ca.goldTitle }}>— PF</Text> · <Text style={{ color: '#9AA3AD' }}>- - PJ</Text></Body></View>
              <SignupChart series={d.series} />
            </Card>
            <Card style={[styles.dashCard, { backgroundColor: 'rgba(28,30,33,0.94)', flexBasis: 300 }]}>
              <Text style={[styles.dashTitle, { marginBottom: 14 }]}>Situação das verificações (KYC)</Text>
              {totalKyc ? (
                <View style={styles.kycBar}>{segments.filter((sg) => k[sg.key]).map((sg) => <View key={sg.key} style={{ backgroundColor: sg.color, flexGrow: k[sg.key] }} />)}</View>
              ) : <Body muted style={{ fontSize: 13, marginBottom: 12 }}>Nenhuma verificação ainda.</Body>}
              <View style={styles.legend}>{segments.map((sg) => <View key={sg.key} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: sg.color }]} /><Text style={styles.legendText}>{sg.label} · {k[sg.key] || 0}</Text></View>)}</View>
              <Body muted style={{ fontSize: 12, marginTop: 'auto', paddingTop: 14 }}>A aprovação verifica a identidade; não libera operações financeiras.</Body>
            </Card>
          </View>

          <View style={styles.dashRow}>
            <Card style={styles.dashCard}>
              <Text style={[styles.dashTitle, { marginBottom: 8 }]}>Pendências prioritárias</Text>
              {d.priorities.length ? d.priorities.map((p, i) => (
                <Pressable accessibilityRole="link" key={`${p.kind}${p.id}`} onPress={() => navigation.navigate(p.kind === 'PJ' ? 'CompanyCase' : 'Case', p.kind === 'PJ' ? { companyId: p.id } : { customerId: p.id })} style={[styles.prioRow, i === d.priorities.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text numberOfLines={1} style={styles.prioName}>{p.name} · {p.kind}</Text><Text style={styles.prioAge}>{ago(p.submittedAt)}</Text>
                </Pressable>
              )) : <Body muted style={{ fontSize: 14 }}>Nada aguardando análise.</Body>}
            </Card>
            <Card style={styles.dashCard}>
              <Text style={[styles.dashTitle, { marginBottom: 8 }]}>Atividade recente da equipe</Text>
              {d.activity.length ? d.activity.map((a, i) => (
                <View key={`${a.occurredAt}${i}`} style={{ marginBottom: 10 }}>
                  <Text style={styles.actText}><Text style={{ color: ca.goldLight }}>{a.staffName.split(' ')[0]}</Text> {activityText(a)}</Text>
                  <Body muted style={{ fontSize: 12 }}>{fmtDateTime(a.occurredAt)}</Body>
                </View>
              )) : <Body muted style={{ fontSize: 14 }}>Nenhuma decisão registrada ainda.</Body>}
              <Body muted style={{ fontSize: 12, marginTop: 4 }}>Só decisões e ações da equipe; sem IP.</Body>
            </Card>
            <Card style={styles.dashCard}>
              <Text style={[styles.dashTitle, { marginBottom: 12 }]}>Ações rápidas</Text>
              <View style={{ gap: 10 }}>
                {[['Queue', 'Analisar verificações (KYC)'], ['CompanyQueue', 'Analisar empresas (PJ)'], ['Customers', 'Buscar cliente'], ...(staff?.role === 'ADMIN' ? [['Team', 'Convidar pessoa da equipe']] : [])].map(([r, label]) => (
                  <Pressable accessibilityRole="link" key={r} onPress={() => navigation.navigate(r)} style={({ hovered }) => [styles.quick, hovered && { borderColor: ca.gold }]}><Text style={styles.quickText}>{label}</Text></Pressable>
                ))}
              </View>
            </Card>
          </View>
        </View>
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
        {staff?.role !== 'ADMIN' ? <Body muted style={{ fontSize: 12, marginBottom: 6 }}>O IP aparece parcial; o completo fica visível só para administradores.</Body> : null}
        {data.recentEvents.length ? data.recentEvents.map((e, i) => {
          const [ol, ot] = OUTCOME_LABELS[e.outcome] || [e.outcome, 'neutral'];
          return (
            <View key={`${e.occurredAt}-${i}`} style={[styles.eventRow, i === data.recentEvents.length - 1 && { borderBottomWidth: 0 }]}>
              <Body muted style={{ fontSize: 13, minWidth: 130 }}>{fmtDateTime(e.occurredAt)}</Body>
              <Text style={styles.eventName}>{eventLabel(e.event)}{e.byStaff ? ' (equipe)' : ''}</Text>
              <StatusPill label={ol} tone={ot} />
              <Body muted style={{ fontSize: 12 }}>{e.ip ? `IP ${e.ip}` : ''}</Body>
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
            <Stack.Screen component={LgpdPage} name="Lgpd" options={{ title: TITLES.Lgpd }} />
            <Stack.Screen component={LgpdCasePage} name="LgpdCase" options={{ title: TITLES.LgpdCase }} />
            <Stack.Screen component={ReportsPage} name="Reports" options={{ title: TITLES.Reports }} />
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

// ——— Etapa D: solicitações LGPD e relatórios (só administradores) ———
const LGPD_RIGHTS = [
  { value: 'CONFIRMATION_ACCESS', label: 'Confirmação e acesso', hint: 'Reúna os dados pela ficha do cliente. A confirmação simples pode ser dada logo; a declaração completa, em até 15 dias.' },
  { value: 'CORRECTION', label: 'Correção', hint: 'Peça o dado correto ao titular. Dados conferidos na verificação de identidade só mudam com novo envio pela Área do Cliente.' },
  { value: 'ANONYMIZATION_DELETION', label: 'Anonimização, bloqueio ou eliminação', hint: 'Alguns dados precisam ser guardados pelo prazo previsto na Política de Privacidade (obrigações legais). Explique isso na resposta e consulte o jurídico antes de eliminar.' },
  { value: 'PORTABILITY', label: 'Portabilidade', hint: 'Combine o formato com o jurídico. Nunca envie documentos por e-mail sem proteção.' },
  { value: 'CONSENT_REVOCATION', label: 'Revogação de consentimento', hint: 'Indique quais tratamentos dependiam do consentimento e o que muda para o titular.' },
  { value: 'SHARING_INFO', label: 'Com quem compartilhamos', hint: 'Use a lista de fornecedores da Política de Privacidade.' },
  { value: 'DECISION_REVIEW', label: 'Revisão de decisão', hint: 'Uma pessoa da equipe que não tomou a decisão original deve revisar o cadastro.' },
  { value: 'OTHER', label: 'Outro', hint: 'Descreva o pedido e consulte o encarregado (DPO).' },
];
const rightLabel = (v) => (LGPD_RIGHTS.find((r) => r.value === v) || {}).label || v;
const LGPD_STATUS = { OPEN: ['Recebida', 'warning'], IN_PROGRESS: ['Em atendimento', 'neutral'], ANSWERED: ['Atendida', 'success'], DENIED: ['Não atendida', 'danger'] };
const LGPD_ACTION = { CREATED: 'Solicitação registrada', NOTE: 'Anotação', IN_PROGRESS: 'Atendimento iniciado', IDENTITY_VERIFIED: 'Identidade do titular confirmada', ANSWERED: 'Encerrada como atendida', DENIED: 'Encerrada como não atendida' };
const deadline = (r) => {
  if (r.closedAt) return r.overdue ? 'encerrada fora do prazo' : 'encerrada no prazo';
  if (r.daysLeft < 0) return `atrasada ${-r.daysLeft} ${-r.daysLeft === 1 ? 'dia' : 'dias'}`;
  if (r.daysLeft === 0) return 'vence hoje';
  return `vence em ${r.daysLeft} ${r.daysLeft === 1 ? 'dia' : 'dias'}`;
};
const todayBr = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
// dd/mm/aaaa → meio-dia em Brasília (evita virar o dia por fuso).
const brDateToIso = (v) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim()); if (!m) return null; const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 15)); return d.getUTCDate() === +m[1] ? d.toISOString() : null; };
const maskDate = (v) => { const d = v.replace(/\D/g, '').slice(0, 8); return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/'); };

function AdminOnly({ active, title, children }) {
  const { staff } = useStaff();
  if (staff?.role !== 'ADMIN') return <Shell active={active} title={title}><Notice kind="error">Apenas administradores têm acesso a esta área.</Notice></Shell>;
  return children;
}

function LgpdPage({ navigation }) {
  const { call } = useStaff();
  const [filter, setFilter] = useState('open');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ right: 'CONFIRMATION_ACCESS', channel: 'EMAIL', receivedAt: todayBr(), requesterName: '', requesterContact: '', customerLookup: '', description: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setItems(null); call(`/lgpd/requests?filter=${filter}`).then((d) => setItems(d.requests)).catch((e) => setError(staffMessage(e))); }, [call, filter]);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: k === 'receivedAt' ? maskDate(v) : v }));
  const submit = async () => {
    setFormError('');
    const receivedAt = brDateToIso(form.receivedAt);
    if (!receivedAt) { setFormError('Informe a data de recebimento no formato dd/mm/aaaa.'); return; }
    setBusy(true);
    try {
      const d = await call('/lgpd/requests', { method: 'POST', body: { right: form.right, channel: form.channel, receivedAt, requesterName: form.requesterName.trim(), requesterContact: form.requesterContact.trim(), description: form.description.trim(), ...(form.customerLookup.trim() ? { customerLookup: form.customerLookup.trim() } : {}) } });
      navigation.navigate('LgpdCase', { requestId: d.request.id });
    } catch (e) { setFormError(staffMessage(e)); } finally { setBusy(false); }
  };
  return (
    <AdminOnly active="Lgpd" title="Solicitações LGPD">
      <Shell active="Lgpd" eyebrow="LGPD" subtitle="Pedidos de titulares recebidos pelo encarregado (juridico@). Prazo de resposta: 15 dias a partir do recebimento." title="Solicitações LGPD">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['open', 'Em aberto'], ['closed', 'Encerradas'], ['all', 'Todas']].map(([v, l]) => (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === v }} key={v} onPress={() => setFilter(v)} style={[styles.filterChip, filter === v && styles.filterChipOn]}><Text style={[styles.filterText, filter === v && { color: ca.bg }]}>{l}</Text></Pressable>
            ))}
          </View>
          <Button onPress={() => { setShowForm(!showForm); setFormError(''); }} title={showForm ? 'Cancelar' : 'Registrar solicitação'} variant={showForm ? 'ghost' : 'primary'} />
        </View>
        {showForm ? (
          <Card style={{ marginBottom: 18 }}>
            <Heading level={2} style={{ marginBottom: 6 }}>Nova solicitação</Heading>
            <Body muted style={{ fontSize: 13, marginBottom: 14 }}>Registre só o necessário para atender o pedido. Não anexe documentos aqui.</Body>
            <ChoiceGroup label="Direito solicitado" onChange={set('right')} options={LGPD_RIGHTS} value={form.right} />
            <ChoiceGroup label="Como chegou" onChange={set('channel')} options={[{ value: 'EMAIL', label: 'E-mail' }, { value: 'OTHER', label: 'Outro canal' }]} value={form.channel} />
            <Field hint="O prazo de 15 dias conta a partir desta data." inputMode="numeric" label="Recebida em" maxLength={10} onChangeText={set('receivedAt')} placeholder="dd/mm/aaaa" value={form.receivedAt} />
            <Field autoCapitalize="words" label="Nome do titular" maxLength={160} onChangeText={set('requesterName')} value={form.requesterName} />
            <Field label="Contato do titular (e-mail ou telefone)" maxLength={200} onChangeText={set('requesterContact')} value={form.requesterContact} />
            <Field hint="Opcional. Se for cliente, informe o e-mail ou o CPF da conta para ligar o pedido à ficha." label="Cliente CTBX (e-mail ou CPF)" maxLength={200} onChangeText={set('customerLookup')} value={form.customerLookup} />
            <Field label="Resumo do pedido" maxLength={2000} multiline numberOfLines={4} onChangeText={set('description')} value={form.description} />
            {formError ? <Notice kind="error">{formError}</Notice> : null}
            <Button loading={busy} onPress={submit} style={{ alignSelf: 'flex-start', marginTop: 8, minWidth: 220 }} title="Registrar e abrir" />
          </Card>
        ) : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        {!items && !error ? <LoadingBlock /> : null}
        {items ? (
          <Card>
            {items.length ? items.map((r, i) => {
              const [sl, st] = LGPD_STATUS[r.status] || [r.status, 'neutral'];
              return (
                <Pressable accessibilityRole="link" key={r.id} onPress={() => navigation.navigate('LgpdCase', { requestId: r.id })} style={({ hovered }) => [styles.lgpdRow, i === items.length - 1 && { borderBottomWidth: 0 }, hovered && { backgroundColor: 'rgba(191,194,199,0.04)' }]}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.lgpdTitle}>{r.requesterName} · {rightLabel(r.right)}</Text>
                    <Body muted style={{ fontSize: 12 }}>{r.protocol} · recebida em {formatDate(r.receivedAt)}{r.linkedCustomer ? ' · cliente CTBX' : ''}</Body>
                  </View>
                  <StatusPill label={sl} tone={st} />
                  <Text style={[styles.lgpdDue, r.overdue && { color: ca.danger }]}>{deadline(r)}</Text>
                </Pressable>
              );
            }) : <Body muted>{filter === 'open' ? 'Nenhuma solicitação em aberto.' : 'Nenhuma solicitação.'}</Body>}
          </Card>
        ) : null}
      </Shell>
    </AdminOnly>
  );
}

function LgpdCasePage({ route, navigation }) {
  const { call } = useStaff();
  const id = route.params?.requestId;
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [closeForm, setCloseForm] = useState({ outcome: 'ANSWERED', response: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { call(`/lgpd/requests/${id}`).then((d) => setR(d.request)).catch((e) => setError(staffMessage(e))); }, [call, id]);
  const act = async (key, path, body, ok) => {
    setBusy(key); setMsg(null);
    try { const d = await call(path, { method: 'POST', body }); setR(d.request); setMsg({ kind: 'success', text: ok }); if (key === 'note') setNote(''); }
    catch (e) { setMsg({ kind: 'error', text: staffMessage(e) }); } finally { setBusy(''); }
  };
  if (error) return <AdminOnly active="Lgpd" title="Solicitação LGPD"><Shell active="Lgpd" title="Solicitação LGPD"><Notice kind="error">{error}</Notice></Shell></AdminOnly>;
  if (!r) return <AdminOnly active="Lgpd" title="Solicitação LGPD"><Shell active="Lgpd" title="Solicitação LGPD"><LoadingBlock /></Shell></AdminOnly>;
  const open = r.status === 'OPEN' || r.status === 'IN_PROGRESS';
  const [sl, st] = LGPD_STATUS[r.status] || [r.status, 'neutral'];
  const hint = (LGPD_RIGHTS.find((x) => x.value === r.right) || {}).hint;
  return (
    <AdminOnly active="Lgpd" title="Solicitação LGPD">
      <Shell active="Lgpd" eyebrow={r.protocol} subtitle={`${rightLabel(r.right)} · recebida em ${formatDate(r.receivedAt)}`} title={r.requesterName}>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <StatusPill label={sl} tone={st} />
          <Text style={[styles.lgpdDue, r.overdue && { color: ca.danger }]}>{deadline(r)} · prazo {formatDate(r.dueAt)}</Text>
        </View>
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
        <View style={styles.dashRow}>
          <Card style={[styles.dashCard, { flexBasis: 420 }]}>
            <Heading level={2} style={{ marginBottom: 6 }}>Pedido</Heading>
            <DataRow label="Direito" value={rightLabel(r.right)} />
            <DataRow label="Canal" value={r.channel === 'EMAIL' ? 'E-mail' : 'Outro canal'} />
            <DataRow label="Contato do titular" value={r.requesterContact} />
            <DataRow label="Identidade" value={r.identityVerified ? 'Confirmada' : 'Ainda não confirmada'} />
            <DataRow label="Cliente CTBX" last value={r.customer ? r.customer.name : 'Não vinculado'} />
            {r.customer ? <LinkText onPress={() => navigation.navigate('Customer', { customerId: r.customer.id })} style={{ marginTop: 8 }}>Abrir a ficha do cliente</LinkText> : null}
            <Text style={[styles.dashTitle, { fontSize: 15, marginTop: 18 }]}>Resumo do pedido</Text>
            <Body style={{ marginTop: 6 }}>{r.description}</Body>
            {r.response ? <><Text style={[styles.dashTitle, { fontSize: 15, marginTop: 18 }]}>Resposta enviada</Text><Body style={{ marginTop: 6 }}>{r.response}</Body></> : null}
          </Card>
          <Card style={[styles.dashCard, { flexBasis: 300 }]}>
            <Heading level={2} style={{ marginBottom: 6 }}>Como atender</Heading>
            <Body muted style={{ fontSize: 14 }}>{hint}</Body>
            <Body muted style={{ fontSize: 13, marginTop: 10 }}>Antes de entregar ou alterar dados, confirme que quem pediu é o titular (por exemplo, respondendo pelo e-mail cadastrado). A execução é manual; este registro comprova o atendimento.</Body>
          </Card>
        </View>
        {open ? (
          <View style={[styles.dashRow, { marginTop: 16 }]}>
            <Card style={styles.dashCard}>
              <Heading level={2} style={{ marginBottom: 10 }}>Andamento</Heading>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                {r.status === 'OPEN' ? <Button loading={busy === 'start'} onPress={() => act('start', `/lgpd/requests/${id}/update`, { inProgress: true }, 'Atendimento iniciado.')} title="Iniciar atendimento" variant="ghost" /> : null}
                {!r.identityVerified ? <Button loading={busy === 'verify'} onPress={() => act('verify', `/lgpd/requests/${id}/update`, { identityVerified: true }, 'Identidade registrada como confirmada.')} title="Identidade confirmada" variant="ghost" /> : null}
              </View>
              <Field label="Anotação interna" maxLength={2000} multiline numberOfLines={3} onChangeText={setNote} value={note} />
              <Button disabled={!note.trim()} loading={busy === 'note'} onPress={() => act('note', `/lgpd/requests/${id}/update`, { note: note.trim() }, 'Anotação registrada.')} style={{ alignSelf: 'flex-start', minWidth: 200 }} title="Salvar anotação" />
            </Card>
            <Card style={styles.dashCard}>
              <Heading level={2} style={{ marginBottom: 6 }}>Encerrar</Heading>
              <Body muted style={{ fontSize: 13, marginBottom: 12 }}>O encerramento é definitivo. Para atender, a identidade precisa estar confirmada.</Body>
              <ChoiceGroup label="Resultado" onChange={(v) => setCloseForm((f) => ({ ...f, outcome: v }))} options={[{ value: 'ANSWERED', label: 'Atendida' }, { value: 'DENIED', label: 'Não atendida (com justificativa)' }]} value={closeForm.outcome} />
              <Field label="Resumo da resposta enviada ao titular" maxLength={4000} multiline numberOfLines={4} onChangeText={(v) => setCloseForm((f) => ({ ...f, response: v }))} value={closeForm.response} />
              <Button disabled={closeForm.response.trim().length < 10} loading={busy === 'close'} onPress={() => act('close', `/lgpd/requests/${id}/close`, { outcome: closeForm.outcome, response: closeForm.response.trim() }, 'Solicitação encerrada.')} style={{ alignSelf: 'flex-start', minWidth: 220 }} title="Encerrar solicitação" />
            </Card>
          </View>
        ) : null}
        <Card style={{ marginTop: 16 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Histórico</Heading>
          <Body muted style={{ fontSize: 12, marginBottom: 8 }}>Registro permanente: não pode ser alterado nem apagado.</Body>
          {r.events.map((e, i) => (
            <View key={`${e.createdAt}-${i}`} style={[styles.eventRow, i === r.events.length - 1 && { borderBottomWidth: 0 }]}>
              <Body muted style={{ fontSize: 13, minWidth: 130 }}>{fmtDateTime(e.createdAt)}</Body>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={styles.eventName}>{LGPD_ACTION[e.action] || e.action} · {e.staffName}</Text>
                {e.note ? <Body style={{ fontSize: 14, marginTop: 2 }}>{e.note}</Body> : null}
              </View>
            </View>
          ))}
        </Card>
      </Shell>
    </AdminOnly>
  );
}

function ReportsPage() {
  const { call } = useStaff();
  const [rep, setRep] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { call('/reports/monthly').then((d) => setRep(d.report)).catch((e) => setError(staffMessage(e))); }, [call]);
  const t = rep?.totals;
  const cols = ['Mês', 'Novos PF', 'Novas PJ', 'KYC aprovados', 'KYC ajustes', 'KYC recusados', 'PJ aprovadas', 'Tempo médio KYC', 'LGPD recebidas', 'LGPD encerradas', 'No prazo'];
  return (
    <AdminOnly active="Reports" title="Relatórios">
      <Shell active="Reports" eyebrow="Últimos 12 meses" subtitle="Somente números agregados, lidos do banco. Nenhum dado pessoal." title="Relatórios">
        {error ? <Notice kind="error">{error}</Notice> : null}
        {!rep && !error ? <LoadingBlock /> : null}
        {rep ? (
          <>
            <View style={[styles.statsRow, { marginBottom: 18 }]}>
              <Kpi label="Novos clientes PF" value={t.newCustomers} />
              <Kpi label="Novas empresas PJ" value={t.newCompanies} />
              <Kpi hint={`${t.kycChanges} com ajustes · ${t.kycRejected} recusadas`} label="Verificações aprovadas" value={t.kycApproved} />
              <Kpi hint={t.lgpdClosed ? `${t.lgpdClosedOnTime} de ${t.lgpdClosed} encerradas no prazo` : 'nenhuma encerrada'} label="Solicitações LGPD" value={t.lgpdReceived} />
            </View>
            <Card style={{ padding: 0 }}>
              <ScrollView horizontal>
                <View style={{ minWidth: 1040 }}>
                  <View style={[styles.repRow, styles.repHead]}>{cols.map((c, i) => <Text key={c} style={[styles.repCell, i === 0 && styles.repFirst, styles.repHeadText]}>{c}</Text>)}</View>
                  {rep.months.map((m) => {
                    const cells = [`${MONTHS[Number(m.month.slice(5)) - 1]}/${m.month.slice(2, 4)}`, m.newCustomers, m.newCompanies, m.kycDecisions.approved, m.kycDecisions.changes, m.kycDecisions.rejected, m.companyDecisions.approved, duration(m.avgKycReviewHours), m.lgpd.received, m.lgpd.closed, m.lgpd.closed ? `${m.lgpd.closedOnTime}/${m.lgpd.closed}` : '—'];
                    return <View key={m.month} style={styles.repRow}>{cells.map((c, i) => <Text key={i} style={[styles.repCell, i === 0 && styles.repFirst, c === 0 && { color: ca.textMuted }]}>{String(c)}</Text>)}</View>;
                  })}
                </View>
              </ScrollView>
            </Card>
            <Body muted style={{ fontSize: 12, marginTop: 10 }}>Meses no horário de Brasília. Tempo médio: do envio à última decisão de cada verificação decidida no mês.</Body>
          </>
        ) : null}
      </Shell>
    </AdminOnly>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerCol: { maxWidth: 440, width: '100%' },
  title: { color: ca.text, fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.3, marginBottom: 8, marginTop: 10 },
  secret: { backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 10, borderWidth: 1, color: ca.goldLight, fontFamily: fonts.medium, fontSize: 15, letterSpacing: 1, marginBottom: 18, padding: 12 },
  row: { backgroundColor: ca.bg, flex: 1, flexDirection: 'row' },
  sidebar: { backgroundColor: ca.bgRaised, borderRightColor: ca.border, borderRightWidth: 1, padding: 26, width: 260 },
  navItem: { borderRadius: 12, overflow: 'hidden' },
  navInner: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  navActiveFill: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  navText: { color: ca.textSoft, flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  navTextOn: { color: ca.bg, fontFamily: fonts.semibold },
  navGroup: { color: ca.textMuted, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.6, marginBottom: 4, paddingHorizontal: 14 },
  badge: { backgroundColor: ca.gold, borderRadius: 999, minWidth: 24, paddingHorizontal: 8, paddingVertical: 2 },
  badgeOn: { backgroundColor: ca.bg },
  badgeText: { color: ca.bg, fontFamily: fonts.bold, fontSize: 12, textAlign: 'center' },
  badgeTextOn: { color: ca.goldLight },
  mainArea: { flex: 1, overflow: 'hidden', position: 'relative' },
  headerEyebrow: { color: ca.gold, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.9, marginBottom: 6 },
  sideFooter: { borderTopColor: ca.border, borderTopWidth: 1, marginTop: 'auto', paddingTop: 16 },
  topWho: { alignItems: 'center', flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  who: { color: ca.text, fontFamily: fonts.medium, fontSize: 14 },
  role: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 12, marginBottom: 6 },
  logout: { paddingVertical: 8 },
  logoutText: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 14 },
  topBar: { backgroundColor: ca.bgRaised, borderBottomColor: ca.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  mobileNav: { alignItems: 'center', backgroundColor: ca.bgRaised, borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  pageTitle: { color: ca.goldTitle, fontFamily: fonts.serifSemibold, fontSize: 38, lineHeight: 44 },
  queueRow: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 22, paddingVertical: 16, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
  queueName: { color: ca.text, fontFamily: fonts.semibold, fontSize: 15 },
  queueOpen: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 14 },
  cols: { flexDirection: 'row', gap: 20 },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  docBox: { backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 14, borderWidth: 1, padding: 14 },
  docHead: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 10 },
  docTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 14 },
  watermark: { bottom: 10, color: 'rgba(244,244,242,0.55)', fontFamily: fonts.medium, fontSize: 11, left: 10, position: 'absolute', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 },
  stat: { backgroundColor: CARD_BG, borderColor: ca.border, borderRadius: 16, borderWidth: 1, flexBasis: 180, flexGrow: 1, padding: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statAlert: { backgroundColor: 'rgba(197,164,108,0.10)', borderColor: 'rgba(197,164,108,0.55)' },
  dashRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  dashCard: { flexBasis: 280, flexGrow: 1, minWidth: 0, padding: 22 },
  dashHead: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginBottom: 12 },
  dashTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 17 },
  kycBar: { borderRadius: 999, flexDirection: 'row', height: 12, marginBottom: 14, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { alignItems: 'center', flexBasis: '45%', flexDirection: 'row', flexGrow: 1, gap: 8 },
  dot: { borderRadius: 5, height: 10, width: 10 },
  legendText: { color: ca.textSoft, fontFamily: fonts.regular, fontSize: 13 },
  prioRow: { borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'space-between', paddingVertical: 12 },
  prioName: { color: ca.text, flex: 1, fontFamily: fonts.regular, fontSize: 14 },
  prioAge: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 13 },
  actText: { color: ca.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  quick: { borderColor: 'rgba(197,164,108,0.45)', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  quickText: { color: ca.text, fontFamily: fonts.medium, fontSize: 14 },
  filterChip: { borderColor: ca.borderStrong, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  filterChipOn: { backgroundColor: ca.gold, borderColor: ca.gold },
  filterText: { color: ca.textSoft, fontFamily: fonts.medium, fontSize: 13 },
  lgpdRow: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 14 },
  lgpdTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 15 },
  lgpdDue: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 13 },
  repRow: { borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row' },
  repHead: { backgroundColor: 'rgba(197,164,108,0.08)' },
  repHeadText: { color: ca.goldLight, fontFamily: fonts.semibold, fontSize: 12 },
  repCell: { color: ca.text, fontFamily: fonts.regular, fontSize: 13, paddingHorizontal: 12, paddingVertical: 11, textAlign: 'right', width: 92 },
  repFirst: { textAlign: 'left', width: 120 },
  statValue: { color: ca.goldTitle, fontFamily: fonts.semibold, fontSize: 34, lineHeight: 40 },
  statLabel: { color: ca.text, fontFamily: fonts.semibold, fontSize: 14, marginTop: 4 },
  eventRow: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 12 },
  eventName: { color: ca.text, fontFamily: fonts.medium, fontSize: 14 },
  eventCustomer: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  teamRow: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 14 },
});
