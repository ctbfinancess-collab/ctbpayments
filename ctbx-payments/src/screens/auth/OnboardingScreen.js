import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AuthLayout from '../../components/auth/AuthLayout';
import { Card, FormField, Icon } from '../../components/ui';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const STEPS = [
  { key: 'welcome', title: 'Uma conta feita para o seu ritmo.', subtitle: 'Conheça a experiência CTBX Payments em um fluxo demonstrativo e seguro.' },
  { key: 'personal', title: 'Como podemos chamar você?', subtitle: 'Use somente informações fictícias nesta demonstração.' },
  { key: 'document', title: 'Documento', subtitle: 'Etapa estrutural. Nenhum documento será validado ou enviado.' },
  { key: 'contact', title: 'Seus contatos', subtitle: 'Use e-mail e telefone fictícios.' },
  { key: 'address', title: 'Onde você mora?', subtitle: 'O endereço permanece apenas na memória desta tela.' },
  { key: 'access', title: 'Crie seu acesso', subtitle: 'Estas credenciais não criam uma conta nem alteram o login SANDBOX.' },
  { key: 'review', title: 'Revise sua jornada', subtitle: 'Confira somente a estrutura antes de concluir a demonstração.' },
  { key: 'done', title: 'Tudo pronto no SANDBOX.', subtitle: 'Nenhuma conta bancária foi criada e nenhum dado foi enviado ao BFF.' },
];

// Laranja sólido (CONTINUAR) e contorno violeta com chevron (VOLTAR) —
// específicos da referência visual do Onboarding, não mexem no
// PrimaryButton/OutlineButton compartilhados pelo resto do app.
function StepPrimaryButton({ children, onPress, style }) {
  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.88} onPress={onPress} style={[styles.stepButton, shadows.glowOrange, style]}>
      <Text style={styles.stepButtonText}>{children}</Text>
      <Icon color={colors.white} name="chevron-forward" size={18} />
    </TouchableOpacity>
  );
}

function StepOutlineButton({ children, onPress, style }) {
  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={onPress} style={[styles.stepOutlineButton, style]}>
      <Text style={styles.stepOutlineText}>{children}</Text>
      <Icon color={colors.purple300} name="chevron-forward" size={18} />
    </TouchableOpacity>
  );
}

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const current = STEPS[step];
  const set = (key) => (value) => setForm((state) => ({ ...state, [key]: value }));
  const fields = useMemo(() => ({
    personal: [['Nome de demonstração', 'name', 'Cliente Exemplo', 'person-outline']],
    document: [['Documento fictício', 'document', '000.000.000-00', 'id-card-outline']],
    contact: [['E-mail fictício', 'email', 'cliente@exemplo.invalid', 'mail-outline'], ['Celular fictício', 'phone', '(00) 00000-0000', 'call-outline']],
    address: [['CEP fictício', 'zip', '00000-000', 'location-outline'], ['Cidade', 'city', 'Cidade Exemplo', 'business-outline']],
    access: [['E-mail de acesso fictício', 'accessEmail', 'acesso@exemplo.invalid', 'mail-outline'], ['Senha de demonstração', 'password', '••••••', 'lock-closed-outline']],
  }), []);
  const advance = () => setStep((value) => Math.min(value + 1, STEPS.length - 1));
  const back = () => step ? setStep((value) => value - 1) : navigation.goBack();

  return (
    <AuthLayout backgroundSource={require('../../../assets/ctbx-onboarding-background.png')} footer={step === 0 || step === STEPS.length - 1} onBack={back} premium subtitle={current.subtitle} title={current.title}>
      <View style={styles.progress}>
        <LinearGradient colors={[colors.purple500, colors.orange500]} end={{ x: 1, y: 0.5 }} start={{ x: 0, y: 0.5 }} style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>
      <Text style={styles.step}>ETAPA {step + 1} DE {STEPS.length}</Text>
      {step === 0 ? <Card style={styles.hero}><Text style={styles.heroTitle}>Simples. Seguro. Seu.</Text><Text style={styles.copy}>Explore como será a abertura de conta sem cadastrar dados, consultar documentos ou criar produtos financeiros reais.</Text></Card> : null}
      {(fields[current.key] || []).map(([label, key, placeholder, icon]) => <FormField icon={icon} key={key} label={label} onChangeText={set(key)} placeholder={placeholder} premium secureTextEntry={key === 'password'} value={form[key] || ''} />)}
      {current.key === 'review' ? <Card style={styles.hero}><Text style={styles.reviewTitle}>Dados locais preenchidos</Text><Text style={styles.copy}>Nome, documento, contato, endereço e acesso serão descartados ao sair. Nenhuma informação é transmitida.</Text></Card> : null}
      {current.key === 'done' ? <View style={styles.done}><Icon color={colors.purple400} name="checkmark-circle" size={42} style={styles.doneIcon} /><Text style={styles.copy}>Confirmação exclusivamente visual.</Text></View> : null}
      {current.key === 'done' ? <StepPrimaryButton onPress={() => navigation.navigate('Login')} style={styles.action}>IR PARA O LOGIN</StepPrimaryButton> : <StepPrimaryButton onPress={advance} style={styles.action}>{current.key === 'review' ? 'CONCLUIR DEMONSTRAÇÃO' : 'CONTINUAR'}</StepPrimaryButton>}
      {step > 0 && current.key !== 'done' ? <StepOutlineButton onPress={back} style={styles.secondary}>VOLTAR</StepOutlineButton> : null}
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.exit}><Text style={styles.exitText}>Já tenho uma conta</Text></TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  progress: { backgroundColor: colors.whiteAlpha08, borderRadius: radii.pill, height: 6, overflow: 'hidden' },
  progressFill: { height: 6 },
  step: { ...typography.eyebrow, color: colors.purple400, marginBottom: spacing.xl, marginTop: spacing.sm },
  hero: { backgroundColor: colors.surfacePurple },
  heroTitle: { ...typography.heading2, color: colors.textPrimary, marginBottom: spacing.sm },
  copy: { ...typography.body, color: colors.textSecondary },
  reviewTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.sm },
  done: { alignItems: 'center', backgroundColor: colors.surfacePurple, borderColor: colors.purpleAlpha45, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxxl },
  doneIcon: { marginBottom: spacing.md },
  action: { marginTop: spacing.xl },
  secondary: { marginTop: spacing.md },
  stepButton: { alignItems: 'center', backgroundColor: colors.orange500, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.xl },
  stepButtonText: { ...typography.button, color: colors.white, marginRight: spacing.sm, textAlign: 'center', textTransform: 'uppercase' },
  stepOutlineButton: { alignItems: 'center', borderColor: colors.purpleAlpha45, borderRadius: 15, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.xl },
  stepOutlineText: { ...typography.button, color: colors.purple300, marginRight: spacing.sm, textAlign: 'center', textTransform: 'uppercase' },
  exit: { alignSelf: 'center', borderBottomColor: colors.purple300, borderBottomWidth: 1, marginTop: spacing.xl, padding: spacing.sm },
  exitText: { ...typography.bodyMedium, color: colors.purple300 },
});
