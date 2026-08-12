import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { PixButton, PixField } from '../../components/pix/PixForm';
import { PIX_KEY_TYPES } from '../../data/pixMockData';
import { isValidEmail, onlyDigits } from '../../utils/pixValidation';

export default function PixCreateKeyScreen({ navigation }) {
  const [type, setType] = useState(PIX_KEY_TYPES[0].id);
  const [value, setValue] = useState('');
  const [tokenSent, setTokenSent] = useState(false);
  const [token, setToken] = useState('');

  const selected = PIX_KEY_TYPES.find((item) => item.id === type);
  const needsValue = type === 'PHONE' || type === 'EMAIL';

  const requestToken = () => {
    if (type === 'EMAIL' && !isValidEmail(value)) {
      Alert.alert('E-mail inválido');
      return;
    }
    if (type === 'PHONE' && onlyDigits(value).length < 10) {
      Alert.alert('Celular inválido');
      return;
    }
    setTokenSent(true);
    Alert.alert('Token de demonstração', 'Digite qualquer token de 6 dígitos.');
  };

  const createKey = () => {
    if (needsValue && !tokenSent) {
      requestToken();
      return;
    }
    if (needsValue && !/^\d{6}$/.test(token)) {
      Alert.alert('Token inválido');
      return;
    }
    const generatedValue = type === 'EVP'
      ? '00000000-0000-4000-8000-000000000000'
      : type === 'documento' ? '000.000.000-00' : value;
    navigation.navigate('PixKeys', {
      createdKey: { id: `key-${Date.now()}`, type: selected.label, value: generatedValue, status: 'Ativo' },
    });
  };

  return (
    <PixLayout navigation={navigation} title="Cadastrar chave PIX">
      <Text style={styles.title}>Escolha o tipo de chave</Text>
      {PIX_KEY_TYPES.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => { setType(item.id); setTokenSent(false); setToken(''); setValue(''); }} style={[styles.typeButton, type === item.id && styles.typeButtonSelected]}>
          <Text style={[styles.typeText, type === item.id && styles.typeTextSelected]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
      {needsValue ? (
        <PixField
          autoCapitalize="none"
          keyboardType={type === 'PHONE' ? 'phone-pad' : 'email-address'}
          label={type === 'PHONE' ? 'Celular' : 'E-mail'}
          onChangeText={setValue}
          value={value}
        />
      ) : null}
      {needsValue && tokenSent ? (
        <PixField keyboardType="numeric" label="Token" maxLength={6} onChangeText={setToken} value={token} />
      ) : null}
      {needsValue && !tokenSent ? <PixButton onPress={requestToken} secondary>ENVIAR TOKEN</PixButton> : null}
      <PixButton confirmation onPress={createKey}>CADASTRAR CHAVE</PixButton>
      <Text style={styles.mockNote}>OTP e registro da chave são simulados localmente.</Text>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: PIX_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  typeButton: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.border, borderRadius: 14, borderWidth: 1, marginBottom: 9, padding: 14 },
  typeButtonSelected: { backgroundColor: PIX_COLORS.elevated, borderColor: PIX_COLORS.accent },
  typeText: { color: PIX_COLORS.text, fontSize: 14 },
  typeTextSelected: { color: PIX_COLORS.accent, fontWeight: '700' },
  mockNote: { color: PIX_COLORS.secondary, fontSize: 11, marginTop: 14, textAlign: 'center' },
});
