import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../../components/auth/AuthLayout';
import { Card, FormField, Icon, LoadingState, PrimaryButton } from '../../components/ui';
import { getKycPersonalInfo, saveKycPersonalInfo } from '../../services/customerKycClient';
import { colors, spacing, typography } from '../../theme';
import { parseBrazilianDate } from '../../utils/dateValidation';

const backgroundSource = require('../../../assets/ctbx-onboarding-background.png');

const ERROR_MESSAGES = {
  KYC_BIRTH_DATE_INVALID: 'Data de nascimento inválida.',
  KYC_MOTHER_NAME_INVALID: 'Informe o nome completo da mãe.',
  KYC_NATIONALITY_INVALID: 'Informe a nacionalidade.',
  CUSTOMER_NOT_FOUND: 'Não foi possível localizar sua conta. Faça login novamente.',
};

// Máscara simples DD/MM/AAAA enquanto o cliente digita — só dígitos são
// mantidos, as barras são inseridas por posição. Convertida pra
// YYYY-MM-DD (formato do backend) só no momento de salvar.
function maskBirthDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isoToBrazilian(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function brazilianToIso(value) {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

// KYC real (Customer Identity) — Etapa 1: dados pessoais complementares
// do titular PF. Nome/CPF/e-mail/telefone vêm sempre de customers (só
// leitura aqui, reaproveitados — nunca reeditados nesta tela); somente
// data de nascimento, nome da mãe e nacionalidade são coletados. Cada
// campo é salvo de forma independente ("salvar o progresso"): a tela
// carrega o que já existe ao entrar (GET) e permite sair e voltar depois
// sem perder o que já foi preenchido.
export default function KycPersonalInfoScreen({ navigation }) {
  const [state, setState] = useState('loading'); // loading | form | error
  const [profile, setProfile] = useState(null); // { name, document, email, phone }
  const [status, setStatus] = useState('NOT_STARTED');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [motherName, setMotherName] = useState('');
  const [nationality, setNationality] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    getKycPersonalInfo().then((response) => {
      if (cancelled) return;
      const info = response.data.personalInfo;
      setProfile({ name: info.name, document: info.document, email: info.email, phone: info.phone });
      setStatus(info.status);
      setBirthDateInput(isoToBrazilian(info.birthDate));
      setMotherName(info.motherName || '');
      setNationality(info.nationality || '');
      setState('form');
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, []);

  const birthDateComplete = birthDateInput.length === 10;
  const birthDateValid = !birthDateComplete || Boolean(parseBrazilianDate(birthDateInput));
  const hasSomethingToSave = birthDateComplete || motherName.trim().length > 0 || nationality.trim().length > 0;
  const canSubmit = hasSomethingToSave && birthDateValid && !saving;

  const handleSubmit = async () => {
    setAttempted(true);
    setFormError('');
    setSavedMessage('');
    if (!canSubmit) return;
    setSaving(true);
    try {
      const patch = {};
      if (birthDateComplete) patch.birthDate = brazilianToIso(birthDateInput);
      if (motherName.trim().length > 0) patch.motherName = motherName.trim();
      if (nationality.trim().length > 0) patch.nationality = nationality.trim();
      const response = await saveKycPersonalInfo(patch);
      const info = response.data.personalInfo;
      setStatus(info.status);
      setSavedMessage(info.personalInfoCompletedAt ? 'Etapa 1 concluída. Você pode sair e continuar depois.' : 'Progresso salvo. Você pode sair e continuar depois.');
    } catch (error) {
      setFormError(ERROR_MESSAGES[error.code] || 'Não foi possível salvar seus dados. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') return <LoadingState label="Carregando seus dados…" />;

  if (state === 'error') {
    return (
      <AuthLayout backgroundSource={backgroundSource} footer={false} onBack={() => navigation.goBack()} subtitle="Não foi possível carregar seus dados agora." title="Algo deu errado">
        <PrimaryButton backgroundColor={colors.orange500} onPress={() => setState('loading')} style={styles.action}>TENTAR NOVAMENTE</PrimaryButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backgroundSource={backgroundSource} footer={false} onBack={() => navigation.goBack()} subtitle="Complete seus dados pessoais para avançar no cadastro." title="Dados pessoais">
      <Card style={styles.summary}>
        <Text style={styles.summaryName}>{profile.name}</Text>
        <Text style={styles.summaryLine}>{profile.email}</Text>
        <Text style={styles.summaryLine}>{profile.phone}</Text>
      </Card>

      <FormField
        error={attempted && birthDateComplete === false && birthDateInput.length > 0 ? 'Data incompleta.' : attempted && !birthDateValid ? 'Data de nascimento inválida.' : ''}
        icon="calendar-outline"
        keyboardType="numeric"
        label="Data de nascimento"
        onChangeText={(value) => setBirthDateInput(maskBirthDateInput(value))}
        placeholder="DD/MM/AAAA"
        value={birthDateInput}
      />
      <FormField
        autoCapitalize="words"
        autoCorrect={false}
        icon="person-outline"
        label="Nome completo da mãe"
        onChangeText={setMotherName}
        placeholder="Nome da mãe"
        value={motherName}
      />
      <FormField
        autoCapitalize="words"
        autoCorrect={false}
        icon="flag-outline"
        label="Nacionalidade"
        onChangeText={setNationality}
        placeholder="Ex.: Brasileira"
        value={nationality}
      />

      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {savedMessage ? (
        <View style={styles.savedRow}>
          <Icon color={colors.purple400} name="checkmark-circle" size={18} />
          <Text style={styles.saved}>{savedMessage}</Text>
        </View>
      ) : null}

      <PrimaryButton backgroundColor={colors.orange500} disabled={!canSubmit} loading={saving} onPress={handleSubmit} style={styles.action}>SALVAR</PrimaryButton>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surfacePurple, marginBottom: spacing.xl },
  summaryName: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.xs },
  summaryLine: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.orange400, marginBottom: spacing.sm, textAlign: 'center' },
  savedRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.sm },
  saved: { ...typography.caption, color: colors.purple300, marginLeft: spacing.xs, textAlign: 'center' },
  action: { marginTop: spacing.md },
});
