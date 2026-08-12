import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { PixButton, PixField } from '../../components/pix/PixForm';
import { ErrorState, LoadingState } from '../../components/ui';
import useAsyncResource from '../../hooks/useAsyncResource';
import { generateReceiveQr, getKeys } from '../../services/pixService';

export default function PixReceiveScreen({ navigation }) {
  const { data: keys, error, loading, retry } = useAsyncResource(getKeys, []);
  const [selectedKey, setSelectedKey] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!selectedKey && keys.length > 0) setSelectedKey(keys[0].id);
  }, [keys, selectedKey]);

  if (loading) return <PixLayout navigation={navigation} title="Receber Pix"><LoadingState /></PixLayout>;
  if (error) return <PixLayout navigation={navigation} title="Receber Pix"><ErrorState message="Não foi possível carregar suas chaves." onRetry={retry} /></PixLayout>;

  const generateQr = async () => {
    if (!selectedKey) {
      Alert.alert('Escolha uma chave');
      return;
    }
    const key = keys.find((item) => item.id === selectedKey);
    try { const qr = await generateReceiveQr({ keyId: selectedKey, keyValue: key?.value || '', amount }); navigation.navigate('PixReceiveQr', qr); } catch { Alert.alert('Serviço indisponível'); }
  };

  return (
    <PixLayout navigation={navigation} title="Receber Pix">
      <Text style={styles.title}>Selecione uma chave para receber</Text>
      {keys.map((item) => (
        <PixButton key={item.id} onPress={() => setSelectedKey(item.id)} secondary={selectedKey !== item.id}>
          {item.type}: {item.value}
        </PixButton>
      ))}
      <Text style={styles.selected}>Chave selecionada: {keys.find((item) => item.id === selectedKey)?.value || ''}</Text>
      <PixField keyboardType="decimal-pad" label="Valor" onChangeText={setAmount} placeholder="R$ 0,00" value={amount} />
      <Text style={styles.hint}>*Para não estipular valor deixar R$ 0,00</Text>
      <PixButton confirmation onPress={generateQr}>GERAR QR CODE</PixButton>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: PIX_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  selected: { color: PIX_COLORS.secondary, fontSize: 12, marginBottom: 18, marginTop: 18 },
  hint: { color: PIX_COLORS.secondary, fontSize: 11, marginBottom: 8, marginTop: -8 },
});
