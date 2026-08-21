import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import { adminLogin } from '../services/adminAuthClient';

// Tela de login real do Painel Administrativo — antes desta etapa, /admin
// era uma rota aberta sem autenticação nenhuma. Nunca guarda a senha em
// nenhum state além do próprio campo controlado; a sessão em si é um
// cookie httpOnly (o navegador guarda, o JS nunca lê o token).
export default function AdminLoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0 && status !== 'loading';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('loading');
    setErrorMessage('');
    try {
      const result = await adminLogin(email.trim(), password);
      onLoginSuccess(result.admin);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.code === 'ADMIN_LOGIN_INVALID' ? 'E-mail ou senha inválidos.' : (error.message || 'Não foi possível entrar.'));
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Painel Administrativo</Text>
        <Text style={styles.subtitle}>CTBX Payments</Text>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            editable={status !== 'loading'}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={handleSubmit}
            placeholder="seu-email@ctbxpayments.com"
            placeholderTextColor={adminColors.textMuted}
            style={styles.input}
            value={email}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            editable={status !== 'loading'}
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
            placeholder="••••••••••••"
            placeholderTextColor={adminColors.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {status === 'error' ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          {status === 'loading' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', backgroundColor: adminColors.background, flex: 1, height: '100vh', justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.xl, borderWidth: 1, maxWidth: 360, padding: spacing.xxl, width: '100%' },
  title: { ...typography.heading2, color: adminColors.textPrimary },
  subtitle: { ...typography.body, color: adminColors.textMuted, marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },
  label: { ...typography.label, color: adminColors.textMuted, marginBottom: spacing.xs },
  input: {
    ...typography.body, backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.md,
    borderWidth: 1, color: adminColors.textPrimary, outlineStyle: 'none', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  errorText: { ...typography.bodyMedium, color: adminColors.danger, marginBottom: spacing.md },
  button: { alignItems: 'center', backgroundColor: adminColors.accentPurple, borderRadius: radii.pill, paddingVertical: spacing.md },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...typography.bodyMedium, color: '#FFFFFF' },
});
