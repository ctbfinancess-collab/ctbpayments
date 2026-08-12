import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { InfoRow, PixButton, PixField } from '../../components/pix/PixForm';
import { MissingDataState } from '../../components/ui';

export default function PixAuthorizationScreen({ navigation, route }) {
  const transfer = route.params?.transfer;
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [tokenRequested, setTokenRequested] = useState(false);

  const requestToken = () => {
    setTokenRequested(true);
    Alert.alert('Token de demonstração', 'Use qualquer código de 6 dígitos para continuar.');
  };

  const authorize = () => {
    if (password.length < 4) {
      Alert.alert('Digite sua senha');
      return;
    }
    if (!tokenRequested) {
      requestToken();
      return;
    }
    if (!/^\d{6}$/.test(token)) {
      Alert.alert('Token inválido', 'Digite um token de 6 dígitos.');
      return;
    }

    // MOCK TEMPORARIO: substitui senha transacional, biometria, push/OTP e API PIX.
    navigation.replace('PixReceipt', { transfer });
  };

  if (!transfer) return <MissingDataState navigation={navigation} title="Autorizar Pix" />;

  return (
    <PixLayout navigation={navigation} title="Confirmar PIX">
      <View style={styles.summaryCard}>
        <InfoRow label="Para" value={transfer.beneficiary.name} />
        <InfoRow label="Valor" value={`R$ ${transfer.amount}`} />
        <InfoRow label="Chave" value={transfer.key} />
        {transfer.message ? <InfoRow label="Mensagem" value={transfer.message} /> : null}
        {transfer.scheduled ? <InfoRow label="Agendamento" value={transfer.scheduleDate} /> : null}
      </View>
      <Text style={styles.instructions}>Digite sua senha para efetivar a transferência PIX.</Text>
      <PixField
        keyboardType="numeric"
        label="Senha"
        maxLength={6}
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      {tokenRequested ? (
        <PixField
          keyboardType="numeric"
          label="Token"
          maxLength={6}
          onChangeText={setToken}
          value={token}
        />
      ) : (
        <PixButton onPress={requestToken} secondary>ENVIAR TOKEN</PixButton>
      )}
      <PixButton confirmation onPress={authorize}>CONFIRMAR PIX</PixButton>
      <Text style={styles.mockNote}>Autorização simulada. Nenhuma transação bancária será enviada.</Text>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.border, borderRadius: 16, borderWidth: 1, marginBottom: 22, padding: 15 },
  instructions: { color: PIX_COLORS.text, fontSize: 14, lineHeight: 20, marginBottom: 18, textAlign: 'center' },
  mockNote: { color: PIX_COLORS.secondary, fontSize: 11, lineHeight: 16, marginTop: 16, textAlign: 'center' },
});
