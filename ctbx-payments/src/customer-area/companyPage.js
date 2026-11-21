import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { env } from '../config';
import { useSession } from '../session';
import { Shell, useCustomerData } from './appPages';
import { StepCard } from './kycPage';
import {
  COMPANY_DOCUMENTS, COMPANY_MISSING_LABELS, COMPANY_POSITION_OPTIONS, COMPANY_REVENUE_OPTIONS, COMPANY_STATUS, createCompany, formatBytes, formatCnpj, formatDate,
  getCompany, isoToBrazilian, brazilianToIso, listCompanies, lookupCep, lookupCnpjPublic, maskCepInput, maskCnpjInput, maskDateInput, maskPhoneInput, messageFor,
  optionLabel, saveCompanyAddress, saveCompanyData, submitCompany, uploadCompanyDocument, withdrawCompany,
} from './logic';
import { ca, fonts } from './theme';
import { Body, Button, Card, ChoiceGroup, DataRow, Field, FilePicker, Heading, LinkText, LoadingBlock, Notice, StatusPill, useLayout } from './ui';
import { parseBrazilianDate } from '../utils/dateValidation';

// Conta PJ (Fase 5): lista de pedidos e o passo a passo de cada pedido.
export function CompaniesPage({ navigation }) {
  const { data, handleError } = useCustomerData();
  const [items, setItems] = useState(null);
  const [cnpj, setCnpj] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const kycApproved = data?.kyc?.status === 'APPROVED';
  const load = useCallback(() => {
    listCompanies().then((r) => setItems(r.data.companies)).catch(async (e) => { if (!(await handleError(e))) setError(messageFor(e)); });
  }, [handleError]);
  useEffect(() => { load(); }, [load]);
  const create = async () => {
    setBusy(true); setError('');
    try { const r = await createCompany(cnpj); navigation.navigate('Company', { companyId: r.data.company.id }); }
    catch (e) { if (!(await handleError(e))) setError(messageFor(e)); }
    finally { setBusy(false); }
  };
  return (
    <Shell active="Companies" subtitle="Abra e acompanhe as contas das empresas que você representa." title="Empresas">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {data && !kycApproved ? (
        <Notice kind="warning" title="Primeiro, verifique sua identidade">Para abrir uma conta PJ, a sua verificação de identidade precisa estar aprovada.</Notice>
      ) : null}
      {data && !kycApproved ? <Button onPress={() => navigation.navigate('Kyc')} style={{ alignSelf: 'flex-start', marginBottom: 20, minWidth: 240 }} title="Ir para a verificação" /> : null}
      {kycApproved ? (
        <Card style={{ marginBottom: 20 }}>
          <Heading level={2} style={{ marginBottom: 6 }}>Abrir conta PJ</Heading>
          <Body muted style={{ marginBottom: 18 }}>Informe o CNPJ da empresa. Você precisa ser sócio(a), administrador(a) ou procurador(a) dela.</Body>
          <View style={{ maxWidth: 420 }}>
            <Field inputMode="numeric" keyboardType="number-pad" label="CNPJ" maxLength={18} onChangeText={(v) => setCnpj(maskCnpjInput(v))} onSubmitEditing={create} placeholder="00.000.000/0000-00" value={cnpj} />
            <Button loading={busy} onPress={create} style={{ alignSelf: 'flex-start', minWidth: 220 }} title="Começar pedido" />
          </View>
        </Card>
      ) : null}
      {!items && !error ? <LoadingBlock /> : null}
      {items?.length ? (
        <Card style={{ padding: 0 }}>
          {items.map((c, i) => {
            const st = COMPANY_STATUS[c.status] || COMPANY_STATUS.DRAFT;
            return (
              <Pressable accessibilityRole="link" key={c.id} onPress={() => navigation.navigate('Company', { companyId: c.id })} style={({ hovered }) => [styles.row, i === items.length - 1 && { borderBottomWidth: 0 }, hovered && { backgroundColor: 'rgba(191,194,199,0.05)' }]}>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={styles.rowTitle}>{c.data.tradeName || c.data.legalName || 'Pedido sem nome ainda'}</Text>
                  <Body muted style={{ fontSize: 13 }}>CNPJ {formatCnpj(c.cnpj)}</Body>
                </View>
                <StatusPill label={st.label} tone={st.tone} />
                <Text style={styles.open}>Abrir →</Text>
              </Pressable>
            );
          })}
        </Card>
      ) : items && kycApproved ? <Body muted>Você ainda não tem pedidos de conta PJ.</Body> : null}
    </Shell>
  );
}

const STEPS = [
  { key: 'data', label: 'Dados da empresa', done: (c) => c.data.complete },
  { key: 'address', label: 'Endereço', done: (c) => c.address.complete },
  { key: 'documents', label: 'Documentos', done: (c) => !c.missing.some((m) => ['SOCIAL_CONTRACT', 'ADDRESS_PROOF', 'POWER_OF_ATTORNEY'].includes(m)) },
  { key: 'review', label: 'Revisão e envio', done: (c) => ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(c.status) },
];
const firstOpen = (c) => (STEPS.find((s) => !s.done(c)) || STEPS[STEPS.length - 1]).key;
const prevOf = (k) => { const i = STEPS.findIndex((s) => s.key === k); return i > 0 ? STEPS[i - 1].key : null; };

function Steps({ company, current, onSelect }) {
  const { isDesktop } = useLayout();
  return (
    <View style={[styles.steps, !isDesktop && { flexWrap: 'wrap' }]}>
      {STEPS.map((s, i) => {
        const done = s.done(company); const active = s.key === current;
        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={s.key} onPress={() => onSelect(s.key)} style={[styles.step, active && styles.stepActive, !isDesktop && { flexBasis: '47%' }]}>
            <Text style={[styles.stepNum, done && styles.stepDone, active && styles.stepCur]}>{done && !active ? '✓' : i + 1}</Text>
            <Text style={[styles.stepLabel, (active || done) && { color: ca.text }]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function useSave(onSaved) {
  const { handleError } = useCustomerData();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const run = async (fn) => {
    setBusy(true); setResult(null);
    try { await onSaved(await fn()); }
    catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e, 'Não foi possível salvar.') }); }
    finally { setBusy(false); }
  };
  return { busy, result, setResult, run };
}

function DataStep({ company, receita, setReceita, onSaved }) {
  const d = company.data;
  const [form, setForm] = useState({ legalName: d.legalName || '', tradeName: d.tradeName || '', openingDate: isoToBrazilian(d.openingDate), legalNature: d.legalNature || '', mainActivity: d.mainActivity || '', businessEmail: d.businessEmail || '', businessPhone: maskPhoneInput(d.businessPhone || ''), annualRevenueRange: d.annualRevenueRange, applicantPosition: d.applicantPosition });
  const [looking, setLooking] = useState(false);
  const { busy, result, setResult, run } = useSave(onSaved);
  const set = (k, mask) => (v) => setForm((f) => ({ ...f, [k]: mask ? mask(v) : v }));
  const fill = async () => {
    setLooking(true);
    const r = receita || await lookupCnpjPublic(company.cnpj);
    setLooking(false);
    if (!r) { setResult({ kind: 'warning', text: 'Não foi possível consultar a Receita agora. Preencha manualmente.' }); return; }
    setReceita(r);
    setForm((f) => ({ ...f, legalName: f.legalName || r.legalName, tradeName: f.tradeName || r.tradeName, openingDate: f.openingDate || isoToBrazilian(r.openingDate), legalNature: f.legalNature || r.legalNature, mainActivity: f.mainActivity || r.mainActivity }));
    setResult({ kind: r.situacao && r.situacao !== 'ATIVA' ? 'warning' : 'info', text: `Dados preenchidos com a consulta pública da Receita (situação: ${r.situacao || '—'}). Confira antes de salvar.` });
  };
  useEffect(() => { if (!d.legalName) fill(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    if (!form.legalName.trim() || !form.legalNature.trim() || !form.mainActivity.trim() || !form.businessEmail.trim() || !form.businessPhone || !form.annualRevenueRange || !form.applicantPosition) { setResult({ kind: 'error', text: 'Preencha todos os campos obrigatórios.' }); return; }
    if (form.openingDate.length !== 10 || !parseBrazilianDate(form.openingDate)) { setResult({ kind: 'error', text: 'Data de abertura inválida.' }); return; }
    run(async () => (await saveCompanyData(company.id, { ...form, openingDate: brazilianToIso(form.openingDate), tradeName: form.tradeName.trim() || undefined })).data.company);
  };
  return (
    <StepCard saved={d.complete} subtitle={`CNPJ ${formatCnpj(company.cnpj)}`} title="Dados da empresa">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <View style={{ marginBottom: 16 }}><Button loading={looking} onPress={fill} style={{ alignSelf: 'flex-start', minWidth: 240 }} title="Buscar dados na Receita" variant="ghost" /></View>
      <Field autoCapitalize="characters" label="Razão social" onChangeText={set('legalName')} value={form.legalName} />
      <Field autoCapitalize="words" label="Nome fantasia (opcional)" onChangeText={set('tradeName')} value={form.tradeName} />
      <Field inputMode="numeric" keyboardType="number-pad" label="Data de abertura" maxLength={10} onChangeText={set('openingDate', maskDateInput)} placeholder="DD/MM/AAAA" value={form.openingDate} />
      <Field label="Natureza jurídica" onChangeText={set('legalNature')} placeholder="Ex.: 206-2 - Sociedade Empresária Limitada" value={form.legalNature} />
      <Field label="Atividade principal (CNAE)" onChangeText={set('mainActivity')} value={form.mainActivity} />
      <Field inputMode="email" keyboardType="email-address" label="E-mail da empresa" onChangeText={set('businessEmail')} value={form.businessEmail} />
      <Field inputMode="tel" keyboardType="phone-pad" label="Telefone da empresa" maxLength={15} onChangeText={set('businessPhone', maskPhoneInput)} value={form.businessPhone} />
      <ChoiceGroup label="Faturamento anual" onChange={set('annualRevenueRange')} options={COMPANY_REVENUE_OPTIONS} value={form.annualRevenueRange} />
      <ChoiceGroup label="Seu cargo na empresa" onChange={set('applicantPosition')} options={COMPANY_POSITION_OPTIONS} value={form.applicantPosition} />
      <Button loading={busy} onPress={save} style={styles.save} title="Salvar e continuar" />
    </StepCard>
  );
}

function AddressStep({ company, receita, onSaved, goTo }) {
  const a = company.address; const ra = receita?.address || {};
  const [form, setForm] = useState({ cep: maskCepInput(a.cep || ra.cep || ''), street: a.street || ra.street || '', number: a.number || ra.number || '', complement: a.complement || ra.complement || '', district: a.district || ra.district || '', city: a.city || ra.city || '', state: a.state || ra.state || '' });
  const { busy, result, setResult, run } = useSave(onSaved);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onCep = async (v) => {
    const cep = maskCepInput(v); setForm((f) => ({ ...f, cep }));
    if (cep.replace(/\D/g, '').length !== 8) return;
    const found = await lookupCep(cep);
    if (found) setForm((f) => ({ ...f, street: f.street || found.street, district: f.district || found.district, city: found.city || f.city, state: found.state || f.state }));
  };
  const save = () => {
    if (['cep', 'street', 'number', 'district', 'city', 'state'].some((k) => !form[k].trim())) { setResult({ kind: 'error', text: 'Preencha todos os campos obrigatórios.' }); return; }
    run(async () => (await saveCompanyAddress(company.id, { ...form, state: form.state.toUpperCase() })).data.company);
  };
  return (
    <StepCard onBack={() => goTo(prevOf('address'))} saved={a.complete} subtitle="Endereço da sede, igual ao do comprovante." title="Endereço da empresa">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <Field inputMode="numeric" keyboardType="number-pad" label="CEP" maxLength={9} onChangeText={onCep} value={form.cep} />
      <Field autoCapitalize="words" label="Rua" onChangeText={set('street')} value={form.street} />
      <Field label="Número" onChangeText={set('number')} placeholder="ou S/N" value={form.number} />
      <Field label="Complemento (opcional)" onChangeText={set('complement')} value={form.complement} />
      <Field autoCapitalize="words" label="Bairro" onChangeText={set('district')} value={form.district} />
      <Field autoCapitalize="words" label="Cidade" onChangeText={set('city')} value={form.city} />
      <Field autoCapitalize="characters" label="Estado (UF)" maxLength={2} onChangeText={(v) => set('state')(v.toUpperCase())} value={form.state} />
      <Button loading={busy} onPress={save} style={styles.save} title="Salvar e continuar" />
    </StepCard>
  );
}

function DocumentsStep({ company, onSaved, goTo }) {
  const { accessToken } = useSession();
  const { handleError } = useCustomerData();
  const [uploading, setUploading] = useState(null);
  const [result, setResult] = useState(null);
  const byKind = Object.fromEntries(company.documents.items.map((d) => [d.kind, d]));
  const upload = async (kind, file) => {
    setUploading(kind); setResult(null);
    try {
      await uploadCompanyDocument({ companyId: company.id, kind, file, token: accessToken, baseUrl: env.apiBaseUrl });
      await onSaved((await getCompany(company.id)).data.company, { stay: true });
      setResult({ kind: 'success', text: 'Arquivo enviado com segurança.' });
    } catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e, 'Não foi possível enviar o arquivo.') }); }
    finally { setUploading(null); }
  };
  const rows = COMPANY_DOCUMENTS.filter((d) => d.kind !== 'POWER_OF_ATTORNEY' || company.documents.powerOfAttorneyRequired);
  return (
    <StepCard onBack={() => goTo(prevOf('documents'))} subtitle="Arquivos criptografados; só a equipe de análise tem acesso. Errou? Use “Trocar arquivo”." title="Documentos da empresa">
      {!company.documents.uploadsEnabled ? <Notice kind="warning">O envio de arquivos ainda não foi liberado.</Notice> : null}
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <Body muted style={{ fontSize: 13, marginBottom: 6 }}>JPG, PNG ou PDF, até 10 MB.</Body>
      {rows.map((item) => {
        const doc = byKind[item.kind];
        const optional = item.kind === 'CNPJ_CARD';
        return (
          <View key={item.kind} style={styles.docRow}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Text style={styles.rowTitle}>{item.label}</Text>
                {doc ? <StatusPill label="Enviado" tone="success" /> : <StatusPill label={optional ? 'Opcional' : 'Pendente'} tone={optional ? 'neutral' : 'warning'} />}
              </View>
              <Body muted style={{ fontSize: 13, lineHeight: 20, marginTop: 6 }}>{doc ? `${doc.contentType === 'application/pdf' ? 'PDF' : 'Imagem'} · ${formatBytes(doc.sizeBytes)} · enviado em ${formatDate(doc.uploadedAt)}` : item.hint}</Body>
            </View>
            <FilePicker accept="image/jpeg,image/png,application/pdf" disabled={!company.documents.uploadsEnabled || uploading === item.kind} label={uploading === item.kind ? 'Enviando…' : doc ? 'Trocar arquivo' : 'Enviar arquivo'} onFile={(f) => upload(item.kind, f)} />
          </View>
        );
      })}
      <Button onPress={() => goTo('review')} style={[styles.save, { marginTop: 18 }]} title="Continuar para a revisão" />
    </StepCard>
  );
}

function ReviewStep({ company, onSaved, goTo }) {
  const [agreed, setAgreed] = useState(false);
  const { busy, result, setResult, run } = useSave(onSaved);
  const d = company.data; const a = company.address;
  const head = (label, key) => <View style={styles.reviewHead}><Text style={styles.reviewTitle}>{label}</Text><LinkText onPress={() => goTo(key)}>Editar</LinkText></View>;
  const submit = () => {
    if (!agreed) { setResult({ kind: 'error', text: 'Confirme a declaração antes de enviar.' }); return; }
    run(async () => (await submitCompany(company.id)).data.company);
  };
  return (
    <StepCard onBack={() => goTo(prevOf('review'))} subtitle="Confira tudo antes de enviar. Algo errado? Clique em “Editar”." title="Revisão e envio">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      {company.missing.length ? <Notice kind="warning" title="Falta completar">{company.missing.map((m) => COMPANY_MISSING_LABELS[m] || m).join(' · ')}</Notice> : null}
      {head('Empresa', 'data')}
      <DataRow label="CNPJ" value={formatCnpj(company.cnpj)} />
      <DataRow label="Razão social" value={d.legalName || '—'} />
      <DataRow label="Nome fantasia" value={d.tradeName || '—'} />
      <DataRow label="Abertura" value={d.openingDate ? isoToBrazilian(d.openingDate) : '—'} />
      <DataRow label="Faturamento anual" value={optionLabel(COMPANY_REVENUE_OPTIONS, d.annualRevenueRange)} />
      <DataRow last label="Seu cargo" value={optionLabel(COMPANY_POSITION_OPTIONS, d.applicantPosition)} />
      {head('Endereço', 'address')}
      <DataRow last label="Endereço" value={a.complete ? `${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ''} · ${a.district} · ${a.city}/${a.state} · CEP ${maskCepInput(a.cep)}` : '—'} />
      {head('Documentos', 'documents')}
      <DataRow last label="Arquivos enviados" value={`${company.documents.items.length}`} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((v) => !v)} style={styles.agree}>
        <View style={[styles.checkbox, agreed && styles.checkboxOn]}>{agreed ? <Text style={styles.checkMark}>✓</Text> : null}</View>
        <Text style={styles.agreeText}>Declaro que represento esta empresa, que as informações são verdadeiras e que os documentos são autênticos.</Text>
      </Pressable>
      <Button disabled={!company.canSubmit} loading={busy} onPress={submit} style={styles.save} title="Enviar para análise" />
    </StepCard>
  );
}

function ReadOnlyView({ company, onChanged }) {
  const { handleError } = useCustomerData();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const st = COMPANY_STATUS[company.status];
  const withdraw = async () => {
    setBusy(true); setError('');
    try { onChanged((await withdrawCompany(company.id)).data.company); }
    catch (e) { if (!(await handleError(e))) setError(messageFor(e)); }
    finally { setBusy(false); }
  };
  return (
    <Card style={{ borderColor: 'rgba(197, 164, 108, 0.35)' }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        <Heading level={2}>{company.status === 'APPROVED' ? 'Conta PJ aprovada' : company.status === 'REJECTED' ? 'Pedido não aprovado' : 'Pedido em análise'}</Heading>
        <StatusPill label={st.label} tone={st.tone} />
      </View>
      {company.submittedAt ? <Body muted style={{ marginTop: 8 }}>Enviado em {formatDate(company.submittedAt)}.</Body> : null}
      {company.status === 'REJECTED' && company.review.reason ? <Notice kind="error" style={{ marginTop: 16 }} title="Motivo">{company.review.reason}</Notice> : null}
      {company.status === 'APPROVED' ? <Notice kind="success" style={{ marginTop: 16 }}>Os serviços financeiros para empresas serão liberados assim que estiverem disponíveis. Avisaremos você.</Notice> : null}
      {company.status === 'SUBMITTED' ? (
        <>
          <Notice kind="info" style={{ marginTop: 16 }}>Durante a análise, o pedido fica bloqueado. Percebeu um erro? Você pode retirar o pedido, corrigir e enviar de novo.</Notice>
          {error ? <Notice kind="error">{error}</Notice> : null}
          {confirm ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Button loading={busy} onPress={withdraw} style={{ minWidth: 240 }} title="Retirar e corrigir" />
              <Button onPress={() => setConfirm(false)} style={{ minWidth: 140 }} title="Cancelar" variant="ghost" />
            </View>
          ) : <Button onPress={() => setConfirm(true)} style={{ alignSelf: 'flex-start', minWidth: 220 }} title="Corrigir algum dado" variant="ghost" />}
        </>
      ) : null}
    </Card>
  );
}

export function CompanyPage({ route, navigation }) {
  const { handleError } = useCustomerData();
  const { companyId } = route.params || {};
  const [company, setCompany] = useState(null);
  const [step, setStep] = useState(null);
  const [receita, setReceita] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getCompany(companyId).then((r) => { setCompany(r.data.company); setStep(firstOpen(r.data.company)); })
      .catch(async (e) => { if (!(await handleError(e))) setError(messageFor(e)); });
  }, [companyId, handleError]);
  const onSaved = useCallback(async (next, { stay } = {}) => { setCompany(next); if (!stay) setStep(firstOpen(next)); }, []);
  const title = company ? (company.data.tradeName || company.data.legalName || `CNPJ ${formatCnpj(company.cnpj)}`) : 'Conta PJ';
  let body;
  if (error) body = <><Notice kind="error">{error}</Notice><Button onPress={() => navigation.navigate('Companies')} title="Voltar para Empresas" variant="ghost" /></>;
  else if (!company) body = <LoadingBlock />;
  else if (!company.editable) body = <ReadOnlyView company={company} onChanged={(next) => { setCompany(next); setStep('review'); }} />;
  else {
    const p = { company, onSaved, goTo: setStep, receita, setReceita };
    body = (
      <>
        {company.status === 'CHANGES_REQUESTED' ? <Notice kind="warning" title="Nossa equipe pediu um ajuste">{company.review.reason}</Notice> : null}
        <Steps company={company} current={step} onSelect={setStep} />
        {step === 'data' ? <DataStep {...p} /> : null}
        {step === 'address' ? <AddressStep {...p} /> : null}
        {step === 'documents' ? <DocumentsStep {...p} /> : null}
        {step === 'review' ? <ReviewStep {...p} /> : null}
      </>
    );
  }
  return (
    <Shell active="Companies" subtitle="Pedido de conta para pessoa jurídica." title={title}>
      {body}
      <View style={{ marginTop: 16 }}><LinkText onPress={() => navigation.navigate('Companies')}>← Voltar para Empresas</LinkText></View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 22, paddingVertical: 16 },
  rowTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 15 },
  open: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 14 },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  step: { alignItems: 'center', backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 10, padding: 12 },
  stepActive: { borderColor: 'rgba(197, 164, 108, 0.55)' },
  stepNum: { backgroundColor: ca.surfaceHigh, borderRadius: 999, color: ca.textSoft, fontFamily: fonts.semibold, fontSize: 13, height: 28, lineHeight: 28, textAlign: 'center', width: 28 },
  stepDone: { backgroundColor: 'rgba(127, 184, 143, 0.18)', color: ca.success },
  stepCur: { backgroundColor: ca.gold, color: ca.onGold },
  stepLabel: { color: ca.textSoft, flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13 },
  save: { alignSelf: 'flex-start', minWidth: 220 },
  docRow: { alignItems: 'center', borderTopColor: ca.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', paddingVertical: 18 },
  reviewHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  reviewTitle: { color: ca.goldLight, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  agree: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: 20, marginTop: 22 },
  checkbox: { alignItems: 'center', borderColor: ca.borderStrong, borderRadius: 6, borderWidth: 1, height: 22, justifyContent: 'center', width: 22 },
  checkboxOn: { backgroundColor: ca.gold, borderColor: ca.gold },
  checkMark: { color: ca.onGold, fontFamily: fonts.bold, fontSize: 14 },
  agreeText: { color: ca.textSoft, flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
});
