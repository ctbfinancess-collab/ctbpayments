import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { env } from '../config';
import { useSession } from '../session';
import { saveKycPersonalInfo } from '../services/customerKycClient';
import { Shell, useCustomerData } from './appPages';
import {
  brazilianToIso, DOCUMENT_KINDS, DOCUMENT_TYPE_OPTIONS, documentTypeLabel, formatBytes, formatDate, getKyc, INCOME_OPTIONS, incomeLabel,
  isoToBrazilian, kycStatusInfo, lookupCep, maskCepInput, maskDateInput, messageFor, MISSING_LABELS, saveKycAddress, saveKycDeclarations,
  saveKycDocumentType, submitKyc, uploadKycDocument, validateKyc, withdrawKyc,
} from './logic';
import { ca, fonts } from './theme';
import { Body, Button, Card, CameraCapture, ChoiceGroup, DataRow, Field, FilePicker, Heading, LinkText, LoadingBlock, Notice, StatusPill, useLayout } from './ui';

// Verificação de identidade completa (Fase 4): 5 etapas, cada uma salva
// sozinha ("pode sair e continuar depois"). Depois de enviada para análise,
// fica só leitura.
const STEPS = [
  { key: 'personal', label: 'Dados pessoais', done: (k) => k.personalInfo.complete },
  { key: 'address', label: 'Endereço', done: (k) => k.address.complete },
  { key: 'declarations', label: 'Declarações', done: (k) => k.declarations.complete },
  { key: 'documents', label: 'Documentos', done: (k) => !k.missing.some((m) => ['ID_DOCUMENT_TYPE', 'ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'].includes(m)) },
  { key: 'review', label: 'Revisão e envio', done: (k) => ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(k.status) },
];

const firstOpenStep = (k) => (STEPS.find((s) => !s.done(k)) || STEPS[STEPS.length - 1]).key;

function Stepper({ kyc, current, onSelect }) {
  const { isDesktop } = useLayout();
  if (!isDesktop) {
    const index = STEPS.findIndex((s) => s.key === current);
    return (
      <View style={styles.compact}>
        <View style={styles.compactRow}>
          {STEPS.map((s, i) => {
            const done = s.done(kyc);
            const active = s.key === current;
            return (
              <Pressable accessibilityLabel={`Etapa ${i + 1}: ${s.label}`} accessibilityRole="tab" accessibilityState={{ selected: active }} key={s.key} onPress={() => onSelect(s.key)} style={styles.compactItem}>
                <Text style={[styles.stepNumber, done && styles.stepDone, active && styles.stepCurrent]}>{done && !active ? '✓' : i + 1}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.compactLabel}>Etapa {index + 1} de {STEPS.length}: {STEPS[index]?.label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.steps, !isDesktop && styles.stepsColumn]}>
      {STEPS.map((s, i) => {
        const done = s.done(kyc);
        const active = s.key === current;
        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={s.key} onPress={() => onSelect(s.key)} style={({ hovered }) => [styles.step, active && styles.stepActive, hovered && !active && { borderColor: ca.borderStrong }]}>
            <Text style={[styles.stepNumber, done && styles.stepDone, active && styles.stepCurrent]}>{done ? '✓' : i + 1}</Text>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.stepLabel, (active || done) && { color: ca.text }]}>{s.label}</Text>
              <Text style={styles.stepState}>{done ? 'Concluída' : active ? 'Etapa atual' : 'Pendente'}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function useSaver(onSaved) {
  const { handleError } = useCustomerData();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const run = useCallback(async (action, successText) => {
    setBusy(true); setResult(null);
    try { const kyc = await action(); setResult({ kind: 'success', text: successText }); await onSaved(kyc); return true; }
    catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e, 'Não foi possível salvar. Tente novamente.') }); return false; }
    finally { setBusy(false); }
  }, [handleError, onSaved]);
  return { busy, result, setResult, run };
}

function PersonalStep({ kyc, onSaved }) {
  const [form, setForm] = useState({ birthDate: isoToBrazilian(kyc.personalInfo.birthDate), motherName: kyc.personalInfo.motherName || '', nationality: kyc.personalInfo.nationality || '' });
  const [errors, setErrors] = useState({});
  const { busy, result, run } = useSaver(onSaved);
  const set = (k, mask) => (v) => setForm((f) => ({ ...f, [k]: mask ? mask(v) : v }));
  const save = () => {
    const found = validateKyc(form);
    if (!form.birthDate) found.birthDate = 'Informe a data de nascimento.';
    if (!form.motherName.trim()) found.motherName = 'Informe o nome completo da mãe.';
    if (!form.nationality.trim()) found.nationality = 'Informe a nacionalidade.';
    setErrors(found);
    if (Object.keys(found).length) return;
    run(async () => {
      await saveKycPersonalInfo({ birthDate: brazilianToIso(form.birthDate), motherName: form.motherName.trim(), nationality: form.nationality.trim() });
      return (await getKyc()).data.kyc;
    }, 'Dados pessoais salvos.');
  };
  return (
    <StepCard saved={kyc.personalInfo.complete} subtitle="Nome, CPF, e-mail e celular já vieram do seu cadastro." title="Dados pessoais">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <Field error={errors.birthDate} inputMode="numeric" keyboardType="number-pad" label="Data de nascimento" maxLength={10} onChangeText={set('birthDate', maskDateInput)} placeholder="DD/MM/AAAA" value={form.birthDate} />
      <Field autoCapitalize="words" error={errors.motherName} label="Nome completo da mãe" onChangeText={set('motherName')} value={form.motherName} />
      <Field autoCapitalize="words" error={errors.nationality} label="Nacionalidade" onChangeText={set('nationality')} placeholder="Ex.: Brasileira" value={form.nationality} />
      <Button loading={busy} onPress={save} style={styles.saveButton} title="Salvar e continuar" />
    </StepCard>
  );
}

function AddressStep({ kyc, onSaved, goTo }) {
  const a = kyc.address;
  const [form, setForm] = useState({ cep: maskCepInput(a.cep || ''), street: a.street || '', number: a.number || '', complement: a.complement || '', district: a.district || '', city: a.city || '', state: a.state || '' });
  const [lookup, setLookup] = useState('');
  const { busy, result, setResult, run } = useSaver(onSaved);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onCep = async (value) => {
    const cep = maskCepInput(value);
    setForm((f) => ({ ...f, cep }));
    if (cep.replace(/\D/g, '').length !== 8) return;
    setLookup('Buscando endereço…');
    const found = await lookupCep(cep);
    if (!found) { setLookup('CEP não encontrado. Preencha o endereço manualmente.'); return; }
    setLookup('');
    setForm((f) => ({ ...f, street: f.street || found.street, district: f.district || found.district, city: found.city || f.city, state: found.state || f.state }));
  };
  const save = () => {
    const required = ['cep', 'street', 'number', 'district', 'city', 'state'];
    if (required.some((k) => !form[k].trim())) { setResult({ kind: 'error', text: 'Preencha todos os campos obrigatórios.' }); return; }
    run(async () => (await saveKycAddress({ ...form, state: form.state.trim().toUpperCase() })).data.kyc, 'Endereço salvo.');
  };
  const { isTablet } = useLayout();
  const row = isTablet ? styles.row : null;
  const small = isTablet ? styles.colSmall : null;
  const wide = isTablet ? styles.colWide : null;
  return (
    <StepCard onBack={() => goTo(prevStep('address'))} saved={kyc.address.complete} subtitle="Endereço onde você mora hoje. Ele precisa bater com o comprovante de residência." title="Endereço">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <View style={row}>
        <View style={small}><Field hint={lookup || 'O endereço é preenchido a partir do CEP.'} inputMode="numeric" keyboardType="number-pad" label="CEP" maxLength={9} onChangeText={onCep} placeholder="00000-000" value={form.cep} /></View>
      </View>
      <Field autoCapitalize="words" label="Rua" onChangeText={set('street')} value={form.street} />
      <View style={row}>
        <View style={small}><Field label="Número" onChangeText={set('number')} placeholder="ou S/N" value={form.number} /></View>
        <View style={wide}><Field autoCapitalize="sentences" label="Complemento (opcional)" onChangeText={set('complement')} value={form.complement} /></View>
      </View>
      <Field autoCapitalize="words" label="Bairro" onChangeText={set('district')} value={form.district} />
      <View style={row}>
        <View style={wide}><Field autoCapitalize="words" label="Cidade" onChangeText={set('city')} value={form.city} /></View>
        <View style={small}><Field autoCapitalize="characters" label="Estado (UF)" maxLength={2} onChangeText={(v) => set('state')(v.toUpperCase())} placeholder="SP" value={form.state} /></View>
      </View>
      <Button loading={busy} onPress={save} style={styles.saveButton} title="Salvar e continuar" />
    </StepCard>
  );
}

function DeclarationsStep({ kyc, onSaved, goTo }) {
  const d = kyc.declarations;
  const [form, setForm] = useState({ isPep: d.isPep, occupation: d.occupation || '', incomeRange: d.incomeRange || null });
  const { busy, result, setResult, run } = useSaver(onSaved);
  const save = () => {
    if (form.isPep === null || form.isPep === undefined || !form.occupation.trim() || !form.incomeRange) { setResult({ kind: 'error', text: 'Responda todas as perguntas.' }); return; }
    run(async () => (await saveKycDeclarations({ isPep: form.isPep, occupation: form.occupation.trim(), incomeRange: form.incomeRange })).data.kyc, 'Declarações salvas.');
  };
  return (
    <StepCard onBack={() => goTo(prevStep('declarations'))} saved={kyc.declarations.complete} subtitle="Exigidas pelas regras de prevenção à lavagem de dinheiro." title="Declarações">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <ChoiceGroup label="Você é pessoa politicamente exposta (PEP)?" onChange={(v) => setForm((f) => ({ ...f, isPep: v }))} options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]} value={form.isPep} />
      <Body muted style={{ fontSize: 13, lineHeight: 20, marginBottom: 18, marginTop: -8 }}>PEP é quem exerce ou exerceu, nos últimos 5 anos, cargo público relevante (como mandato eletivo, cargo de ministro ou de alto escalão), além de seus familiares e pessoas próximas.</Body>
      <Field autoCapitalize="sentences" label="Profissão" onChangeText={(v) => setForm((f) => ({ ...f, occupation: v }))} placeholder="Ex.: Analista financeiro" value={form.occupation} />
      <ChoiceGroup label="Renda mensal" onChange={(v) => setForm((f) => ({ ...f, incomeRange: v }))} options={INCOME_OPTIONS} value={form.incomeRange} />
      <Button loading={busy} onPress={save} style={styles.saveButton} title="Salvar e continuar" />
    </StepCard>
  );
}

function DocumentRow({ item, doc, waived, uploading, onFile, disabled }) {
  return (
    <View style={styles.docRow}>
      <View style={{ flex: 1, minWidth: 220 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Text style={styles.docTitle}>{item.label}</Text>
          {doc ? <StatusPill label="Enviado" tone="success" /> : waived ? <StatusPill label="Dispensado" tone="neutral" /> : <StatusPill label="Pendente" tone="warning" />}
        </View>
        <Body muted style={{ fontSize: 13, lineHeight: 20, marginTop: 6 }}>{doc ? `${doc.contentType === 'application/pdf' ? 'PDF' : 'Imagem'} · ${formatBytes(doc.sizeBytes)} · enviado em ${formatDate(doc.uploadedAt)}` : item.hint}</Body>
      </View>
      {item.kind === 'SELFIE'
        ? <CameraCapture disabled={disabled || uploading} label={uploading ? 'Enviando…' : doc ? 'Tirar outra selfie' : 'Abrir câmera'} onPhoto={onFile} />
        : <FilePicker accept="image/jpeg,image/png,application/pdf" disabled={disabled || uploading} label={uploading ? 'Enviando…' : doc ? 'Trocar arquivo' : 'Enviar arquivo'} onFile={onFile} />}
    </View>
  );
}

function DocumentsStep({ kyc, onSaved, goTo }) {
  const { accessToken } = useSession();
  const { handleError } = useCustomerData();
  const [uploading, setUploading] = useState(null);
  const [result, setResult] = useState(null);
  const byKind = Object.fromEntries(kyc.documents.items.map((d) => [d.kind, d]));
  const frontIsPdf = byKind.ID_FRONT?.contentType === 'application/pdf';
  const chooseType = async (documentType) => {
    setResult(null);
    try { onSaved((await saveKycDocumentType(documentType)).data.kyc, { stay: true }); }
    catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e) }); }
  };
  const upload = async (kind, file) => {
    setUploading(kind); setResult(null);
    try {
      await uploadKycDocument({ kind, file, token: accessToken, baseUrl: env.apiBaseUrl });
      onSaved((await getKyc()).data.kyc, { stay: true });
      setResult({ kind: 'success', text: 'Arquivo enviado com segurança.' });
    } catch (e) { if (!(await handleError(e))) setResult({ kind: 'error', text: messageFor(e, 'Não foi possível enviar o arquivo. Tente novamente.') }); }
    finally { setUploading(null); }
  };
  return (
    <StepCard onBack={() => goTo(prevStep('documents'))} subtitle="Seus arquivos são criptografados antes de serem guardados e só a equipe de análise tem acesso. Errou um arquivo? Use “Trocar arquivo”." title="Documentos">
      {!kyc.documents.uploadsEnabled ? <Notice kind="warning" title="Envio de documentos indisponível">O envio de arquivos ainda não foi liberado. Você pode completar as outras etapas e voltar depois.</Notice> : null}
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      <ChoiceGroup label="Qual documento com foto você vai enviar?" onChange={chooseType} options={DOCUMENT_TYPE_OPTIONS} value={kyc.documents.idDocumentType} />
      <Body muted style={{ fontSize: 13, marginBottom: 8 }}>Formatos aceitos: JPG, PNG ou PDF, até 10 MB. Fotos nítidas, sem reflexo e com os quatro cantos visíveis.</Body>
      {DOCUMENT_KINDS.map((item) => (
        <DocumentRow
          disabled={!kyc.documents.uploadsEnabled || (item.kind.startsWith('ID_') && !kyc.documents.idDocumentType)}
          doc={byKind[item.kind]}
          item={item}
          key={item.kind}
          onFile={(file) => upload(item.kind, file)}
          uploading={uploading === item.kind}
          waived={item.kind === 'ID_BACK' && frontIsPdf}
        />
      ))}
      {!kyc.documents.idDocumentType ? <Body muted style={{ fontSize: 13, marginTop: 10 }}>Escolha o tipo de documento para liberar o envio da frente e do verso.</Body> : null}
      <Button onPress={() => goTo('review')} style={[styles.saveButton, { marginTop: 18 }]} title="Continuar para a revisão" />
    </StepCard>
  );
}

function ReviewStep({ kyc, onSaved, goTo }) {
  const [agreed, setAgreed] = useState(false);
  const { busy, result, setResult, run } = useSaver(onSaved);
  const p = kyc.personalInfo; const a = kyc.address; const d = kyc.declarations;
  const submit = () => {
    if (!agreed) { setResult({ kind: 'error', text: 'Confirme que as informações são verdadeiras.' }); return; }
    run(async () => (await submitKyc()).data.kyc, 'Enviado para análise.');
  };
  return (
    <StepCard onBack={() => goTo(prevStep('review'))} subtitle="Confira tudo antes de enviar. Algo errado? Clique em “Editar” no bloco correspondente." title="Revisão e envio">
      {result ? <Notice kind={result.kind}>{result.text}</Notice> : null}
      {kyc.missing.length ? (
        <Notice kind="warning" title="Falta completar">{kyc.missing.map((m) => MISSING_LABELS[m] || m).join(' · ')}</Notice>
      ) : null}
      <View style={styles.reviewHead}><Text style={styles.reviewTitle}>Dados pessoais</Text><LinkText onPress={() => goTo('personal')}>Editar</LinkText></View>
      <DataRow label="Data de nascimento" value={p.birthDate ? isoToBrazilian(p.birthDate) : '—'} />
      <DataRow label="Nome da mãe" value={p.motherName || '—'} />
      <DataRow last label="Nacionalidade" value={p.nationality || '—'} />
      <View style={styles.reviewHead}><Text style={styles.reviewTitle}>Endereço</Text><LinkText onPress={() => goTo('address')}>Editar</LinkText></View>
      <DataRow last label="Endereço" value={a.complete ? `${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ''} · ${a.district} · ${a.city}/${a.state} · CEP ${maskCepInput(a.cep)}` : '—'} />
      <View style={styles.reviewHead}><Text style={styles.reviewTitle}>Declarações</Text><LinkText onPress={() => goTo('declarations')}>Editar</LinkText></View>
      <DataRow label="Pessoa politicamente exposta" value={d.isPep === null ? '—' : d.isPep ? 'Sim' : 'Não'} />
      <DataRow label="Profissão" value={d.occupation || '—'} />
      <DataRow last label="Renda mensal" value={incomeLabel(d.incomeRange)} />
      <View style={styles.reviewHead}><Text style={styles.reviewTitle}>Documentos</Text><LinkText onPress={() => goTo('documents')}>Editar</LinkText></View>
      <DataRow label="Tipo de documento" value={documentTypeLabel(kyc.documents.idDocumentType)} />
      <DataRow last label="Arquivos enviados" value={`${kyc.documents.items.length}`} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((v) => !v)} style={styles.agree}>
        <View style={[styles.checkbox, agreed && styles.checkboxOn]}>{agreed ? <Text style={styles.checkMark}>✓</Text> : null}</View>
        <Text style={styles.agreeText}>Declaro que as informações e os documentos enviados são verdadeiros e pertencem a mim.</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Button disabled={!kyc.canSubmit} loading={busy} onPress={submit} style={styles.saveButton} title="Enviar para análise" />
        {kyc.missing.length ? <Button onPress={() => goTo(firstOpenStep(kyc))} style={styles.saveButton} title="Completar o que falta" variant="ghost" /> : null}
      </View>
    </StepCard>
  );
}

export function StepCard({ title, subtitle, children, saved, onBack }) {
  return (
    <Card>
      <Heading level={2} style={{ marginBottom: 6 }}>{title}</Heading>
      {subtitle ? <Body muted style={{ marginBottom: saved ? 10 : 22 }}>{subtitle}</Body> : null}
      {saved ? <Text style={styles.saved}>✓ Etapa salva. Você pode alterar quando quiser antes de enviar para análise.</Text> : null}
      <View style={{ maxWidth: 640 }}>{children}</View>
      {onBack ? <View style={{ marginTop: 14 }}><Button onPress={onBack} style={{ alignSelf: 'flex-start', minWidth: 160 }} title="← Voltar" variant="ghost" /></View> : null}
    </Card>
  );
}

const prevStep = (key) => { const i = STEPS.findIndex((s) => s.key === key); return i > 0 ? STEPS[i - 1].key : null; };

function WithdrawBox({ onWithdrawn }) {
  const { handleError } = useCustomerData();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true); setError('');
    try { onWithdrawn((await withdrawKyc()).data.kyc); }
    catch (e) { if (!(await handleError(e))) setError(messageFor(e)); }
    finally { setBusy(false); }
  };
  return (
    <View style={{ marginTop: 18 }}>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {confirming ? (
        <>
          <Notice kind="warning" title="Retirar o envio da análise?">Seus dados voltam a ficar editáveis. Depois de corrigir, você precisa enviar de novo para análise, e o pedido volta para o fim da fila.</Notice>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Button loading={busy} onPress={go} style={{ minWidth: 240 }} title="Retirar e corrigir" />
            <Button onPress={() => setConfirming(false)} style={{ minWidth: 160 }} title="Cancelar" variant="ghost" />
          </View>
        </>
      ) : (
        <Button onPress={() => setConfirming(true)} style={{ alignSelf: 'flex-start', minWidth: 220 }} title="Corrigir algum dado" variant="ghost" />
      )}
    </View>
  );
}

function SubmittedView({ kyc, onWithdrawn }) {
  const info = kycStatusInfo(kyc.status);
  return (
    <Card style={{ borderColor: 'rgba(197, 164, 108, 0.35)' }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        <Heading level={2}>{kyc.status === 'APPROVED' ? 'Identidade verificada' : kyc.status === 'REJECTED' ? 'Verificação não aprovada' : 'Recebemos seus dados'}</Heading>
        <StatusPill label={info.label} tone={info.tone} />
      </View>
      <Body style={{ marginTop: 12 }}>{info.hint}</Body>
      {kyc.submittedAt ? <Body muted style={{ marginTop: 8 }}>Enviado em {formatDate(kyc.submittedAt)}.</Body> : null}
      {kyc.status === 'REJECTED' && kyc.review?.reason ? <Notice kind="error" style={{ marginTop: 18 }} title="Motivo">{kyc.review.reason}</Notice> : null}
      {kyc.status === 'REJECTED' ? <Body muted style={{ marginTop: 12 }}>Se tiver dúvidas, fale com nosso atendimento: contato@ctbxpayments.com.</Body> : null}
      {kyc.status === 'SUBMITTED' ? <Notice kind="info" style={{ marginTop: 18 }}>Durante a análise, seus dados ficam bloqueados. Percebeu um erro? Enquanto nossa equipe não concluir a análise, você pode retirar o envio, corrigir e enviar de novo.</Notice> : null}
      {kyc.status === 'SUBMITTED' ? <WithdrawBox onWithdrawn={onWithdrawn} /> : null}
      {kyc.status === 'APPROVED' ? <Notice kind="success" style={{ marginTop: 18 }}>Os serviços financeiros serão liberados assim que estiverem disponíveis. Avisaremos você por e-mail.</Notice> : null}
    </Card>
  );
}

export function KycPage() {
  const { reload, handleError } = useCustomerData();
  const [kyc, setKyc] = useState(null);
  const [step, setStep] = useState(null);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    getKyc().then((res) => { setKyc(res.data.kyc); setStep(firstOpenStep(res.data.kyc)); })
      .catch(async (e) => { if (!(await handleError(e))) setLoadError(messageFor(e, 'Não foi possível carregar sua verificação.')); });
  }, [handleError]);
  // Depois de salvar uma etapa: atualiza e vai para a próxima pendente
  // (nos documentos, fica na mesma etapa até terminar).
  const onSaved = useCallback(async (next, { stay } = {}) => {
    setKyc(next);
    reload();
    if (!stay) setStep(firstOpenStep(next));
  }, [reload]);
  const status = kycStatusInfo(kyc?.status);
  let body;
  if (loadError) body = <Notice kind="error">{loadError}</Notice>;
  else if (!kyc) body = <LoadingBlock />;
  else if (!kyc.editable) body = <SubmittedView kyc={kyc} onWithdrawn={(next) => { setKyc(next); reload(); setStep('review'); }} />;
  else {
    const props = { kyc, onSaved, goTo: setStep };
    body = (
      <>
        {kyc.status === 'CHANGES_REQUESTED' ? <Notice kind="warning" title="Nossa equipe pediu um ajuste">{kyc.review?.reason || 'Revise os dados e os documentos e envie novamente.'}</Notice> : null}
        <Stepper current={step} kyc={kyc} onSelect={setStep} />
        {step === 'personal' ? <PersonalStep {...props} /> : null}
        {step === 'address' ? <AddressStep {...props} /> : null}
        {step === 'declarations' ? <DeclarationsStep {...props} /> : null}
        {step === 'documents' ? <DocumentsStep {...props} /> : null}
        {step === 'review' ? <ReviewStep {...props} /> : null}
      </>
    );
  }
  return (
    <Shell active="Kyc" subtitle="Exigida por lei para instituições de pagamento. Seus dados ficam protegidos." title="Verificação de identidade">
      {kyc ? <View style={styles.statusLine}><Body muted>Situação:</Body><StatusPill label={status.label} tone={status.tone} /></View> : null}
      {body}
    </Shell>
  );
}

const styles = StyleSheet.create({
  statusLine: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 18 },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stepsColumn: { flexDirection: 'column' },
  compact: { marginBottom: 18 },
  compactRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  compactItem: { padding: 2 },
  compactLabel: { color: ca.text, fontFamily: fonts.semibold, fontSize: 15 },
  step: { alignItems: 'center', backgroundColor: ca.bgRaised, borderColor: ca.border, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 10, padding: 12 },
  stepActive: { borderColor: 'rgba(197, 164, 108, 0.55)' },
  stepNumber: { backgroundColor: ca.surfaceHigh, borderRadius: 999, color: ca.textSoft, fontFamily: fonts.semibold, fontSize: 13, height: 28, lineHeight: 28, textAlign: 'center', width: 28 },
  stepDone: { backgroundColor: 'rgba(127, 184, 143, 0.18)', color: ca.success },
  stepCurrent: { backgroundColor: ca.gold, color: ca.onGold },
  stepLabel: { color: ca.textSoft, fontFamily: fonts.semibold, fontSize: 13 },
  stepState: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  saveButton: { alignSelf: 'flex-start', minWidth: 220 },
  row: { flexDirection: 'row', gap: 14 },
  colSmall: { flexBasis: 160, flexGrow: 0, flexShrink: 1 },
  colWide: { flex: 1 },
  docRow: { alignItems: 'center', borderTopColor: ca.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', paddingVertical: 18 },
  docTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 15 },
  reviewTitle: { color: ca.goldLight, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  reviewHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  saved: { color: ca.success, fontFamily: fonts.medium, fontSize: 13, marginBottom: 18 },
  agree: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: 20, marginTop: 22 },
  checkbox: { alignItems: 'center', borderColor: ca.borderStrong, borderRadius: 6, borderWidth: 1, height: 22, justifyContent: 'center', width: 22 },
  checkboxOn: { backgroundColor: ca.gold, borderColor: ca.gold },
  checkMark: { color: ca.onGold, fontFamily: fonts.bold, fontSize: 14 },
  agreeText: { color: ca.textSoft, flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
});
