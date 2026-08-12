import React from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { InfoRow, PixButton } from '../../components/pix/PixForm';

export default function PixReceiveQrScreen({ navigation, route }) {
  const keyValue = route.params?.keyValue || '';
  const amount = route.params?.amount || '0,00';
  const mockPayload = route.params?.copyPaste || route.params?.payload || `PIX-DEMO|CHAVE=${keyValue}|VALOR=${amount || '0,00'}`;

  return (
    <PixLayout navigation={navigation} title="QR Code para receber">
      <Text style={styles.title}>Aqui está seu QRCode</Text>
      <Text style={styles.warning}>QR PIX SANDBOX · NÃO UTILIZÁVEL PARA PAGAMENTO REAL</Text>
      <View style={styles.qrPlaceholder}>
        <View style={styles.qrInner}><Text style={styles.qrText}>PIX{`\n`}QR</Text></View>
      </View>
      <View style={styles.dataCard}>
        <InfoRow label="Chave" value={keyValue} />
        <InfoRow label="Valor" value={`R$ ${amount || '0,00'}`} />
        <InfoRow label="Pix Copia e Cola" value={mockPayload} />
      </View>
      <PixButton confirmation onPress={() => Share.share({ message: mockPayload })}>COMPARTILHAR</PixButton>
      <PixButton onPress={() => navigation.goBack()} secondary>VOLTAR</PixButton>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: PIX_COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  warning: { color: PIX_COLORS.confirmation, fontSize: 11, marginTop: 8, textAlign: 'center' },
  qrPlaceholder: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: PIX_COLORS.border, borderRadius: 16, borderWidth: 1, height: 260, justifyContent: 'center', marginVertical: 20 },
  qrInner: { alignItems: 'center', borderColor: '#111111', borderWidth: 12, height: 180, justifyContent: 'center', width: 180 },
  qrText: { color: '#111111', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  dataCard: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.border, borderRadius: 16, borderWidth: 1, padding: 15 },
});
