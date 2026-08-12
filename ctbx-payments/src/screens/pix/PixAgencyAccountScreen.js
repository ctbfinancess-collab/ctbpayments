import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { PixButton, PixField } from '../../components/pix/PixForm';
import { buildMockPixTransfer } from '../../data/pixMockData';

export default function PixAgencyAccountScreen({ navigation }) {
  const [bank, setBank] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [document, setDocument] = useState('');

  const continueFlow = () => {
    if (![bank, agency, account, document].every((value) => value.trim())) {
      Alert.alert('Preencha os dados bancários');
      return;
    }
    navigation.navigate('PixTransfer', {
      transfer: buildMockPixTransfer({ key: `${agency}/${account}`, keyType: 'agency_account' }),
    });
  };

  return (
    <PixLayout navigation={navigation} title="Agência e conta">
      <Text style={styles.title}>Informe os dados de quem vai receber</Text>
      <PixField label="Banco" onChangeText={setBank} value={bank} />
      <PixField keyboardType="numeric" label="Agência" onChangeText={setAgency} value={agency} />
      <PixField keyboardType="numeric" label="Conta" onChangeText={setAccount} value={account} />
      <PixField keyboardType="numeric" label="CPF/CNPJ" onChangeText={setDocument} value={document} />
      <PixButton onPress={continueFlow}>CONTINUAR</PixButton>
      <Text style={styles.note}>Rota original `abrirModal(8)`, oculta na configuração ativa do APK.</Text>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: PIX_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  note: { color: PIX_COLORS.secondary, fontSize: 11, marginTop: 15, textAlign: 'center' },
});
