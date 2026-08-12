import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { PixButton, PixField } from '../../components/pix/PixForm';
import { MOCK_PIX_KEYS } from '../../data/pixMockData';

export default function PixReceiveScreen({ navigation }) {
  const [selectedKey, setSelectedKey] = useState(MOCK_PIX_KEYS[0]?.value || '');
  const [amount, setAmount] = useState('');

  const generateQr = () => {
    if (!selectedKey) {
      Alert.alert('Escolha uma chave');
      return;
    }
    navigation.navigate('PixReceiveQr', { keyValue: selectedKey, amount });
  };

  return (
    <PixLayout navigation={navigation} title="Receber Pix">
      <Text style={styles.title}>Selecione uma chave para receber</Text>
      {MOCK_PIX_KEYS.map((item) => (
        <PixButton key={item.id} onPress={() => setSelectedKey(item.value)} secondary={selectedKey !== item.value}>
          {item.type}: {item.value}
        </PixButton>
      ))}
      <Text style={styles.selected}>Chave selecionada: {selectedKey}</Text>
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
