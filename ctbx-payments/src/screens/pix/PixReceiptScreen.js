import React from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { InfoRow, PixButton } from '../../components/pix/PixForm';

export default function PixReceiptScreen({ navigation, route }) {
  const transfer = route.params?.transfer;
  if (!transfer) return null;

  const receiptText = [
    'PIX realizado com sucesso!',
    `Valor: R$ ${transfer.amount}`,
    `Para: ${transfer.beneficiary.name}`,
    `Chave: ${transfer.key}`,
  ].join('\n');

  return (
    <PixLayout navigation={navigation} title="Comprovante PIX">
      <View style={styles.successArea}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Pix realizado com sucesso!</Text>
      </View>
      <View style={styles.receiptCard}>
        <InfoRow label="Valor" value={`R$ ${transfer.amount}`} />
        <InfoRow label="Para" value={transfer.beneficiary.name} />
        <InfoRow label="CPF/CNPJ" value={transfer.beneficiary.document} />
        <InfoRow label="Instituição" value={transfer.beneficiary.bank} />
        <InfoRow label="Chave" value={transfer.key} />
        <InfoRow label="Identificador" value={transfer.id} />
        {transfer.scheduled ? <InfoRow label="Agendado para" value={transfer.scheduleDate} /> : null}
      </View>
      <PixButton onPress={() => Alert.alert('Comprovante mock', 'O PDF original depende da API de comprovantes.')} secondary>
        VISUALIZAR
      </PixButton>
      <PixButton confirmation onPress={() => Share.share({ message: receiptText })}>COMPARTILHAR</PixButton>
      <PixButton onPress={() => navigation.navigate('Pix')} secondary>VOLTAR AO PIX</PixButton>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  successArea: { alignItems: 'center', marginBottom: 22, marginTop: 10 },
  successIcon: { color: PIX_COLORS.success, fontSize: 58, fontWeight: '700' },
  successTitle: { color: PIX_COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 8 },
  receiptCard: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.borderStrong, borderRadius: 18, borderWidth: 1, marginBottom: 12, padding: 15 },
});
