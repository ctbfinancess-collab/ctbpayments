import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { PixButton, PixField } from '../../components/pix/PixForm';
import { buildMockPixTransfer } from '../../data/pixMockData';
import { validatePixKey } from '../../utils/pixValidation';

const KEY_CONFIG = {
  cpf: { title: 'PIX por CPF', label: 'Digite o CPF', keyboardType: 'numeric' },
  cnpj: { title: 'PIX por CNPJ', label: 'Digite o CNPJ', keyboardType: 'numeric' },
  phone: { title: 'PIX por celular', label: 'Digite o celular', keyboardType: 'phone-pad' },
  email: { title: 'PIX por e-mail', label: 'Digite o e-mail', keyboardType: 'email-address' },
  random_key: { title: 'Chave aleatória', label: 'Digite a chave aleatória', keyboardType: 'default' },
  copy_paste: { title: 'Pix Copia e Cola', label: 'Cole o Pix aqui', keyboardType: 'default' },
};

export default function PixKeyEntryScreen({ navigation, route }) {
  const type = route.params?.type || 'random_key';
  const config = KEY_CONFIG[type] || KEY_CONFIG.random_key;
  const [keyValue, setKeyValue] = useState('');

  const continueFlow = () => {
    const error = validatePixKey(type, keyValue);
    if (error) {
      Alert.alert(error);
      return;
    }

    // MOCK TEMPORARIO: no APK, consultar-chave/consultar-qrcode retorna o favorecido.
    navigation.navigate('PixTransfer', {
      transfer: buildMockPixTransfer({ key: keyValue.trim(), keyType: type }),
    });
  };

  return (
    <PixLayout navigation={navigation} title={config.title}>
      <Text style={styles.intro}>Transferência via pix</Text>
      <PixField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={config.keyboardType}
        label={config.label}
        onChangeText={setKeyValue}
        value={keyValue}
      />
      <PixButton onPress={continueFlow}>Pesquisar</PixButton>
      <Text style={styles.mockNote}>
        Consulta DICT simulada localmente para permitir a navegação do fluxo.
      </Text>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  intro: { color: PIX_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 22 },
  mockNote: { color: PIX_COLORS.secondary, fontSize: 11, lineHeight: 16, marginTop: 18, textAlign: 'center' },
});
