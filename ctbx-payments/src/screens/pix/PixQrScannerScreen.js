import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { PixButton, PixField } from '../../components/pix/PixForm';
import { buildMockPixTransfer } from '../../data/pixMockData';

export default function PixQrScannerScreen({ navigation }) {
  const [emv, setEmv] = useState('00020101021226800014BR.GOV.BCB.PIX');

  const simulateScan = () => {
    navigation.navigate('PixTransfer', {
      transfer: buildMockPixTransfer({ key: emv, keyType: 'qr_code', amount: '125,00' }),
      lockedAmount: true,
    });
  };

  return (
    <PixLayout navigation={navigation} title="Pagar QR Code">
      <View style={styles.cameraPlaceholder}>
        <View style={styles.scanFrame} />
        <Text style={styles.cameraText}>Leitor de QR Code</Text>
        <Text style={styles.cameraSubtext}>Câmera indisponível nesta reconstrução</Text>
      </View>
      <PixField label="Código EMV para teste" multiline onChangeText={setEmv} value={emv} />
      <PixButton onPress={simulateScan}>Simular leitura</PixButton>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  cameraPlaceholder: {
    alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 16,
    height: 300, justifyContent: 'center', marginBottom: 20, overflow: 'hidden',
  },
  scanFrame: { borderColor: '#FFFFFF', borderWidth: 3, height: 180, position: 'absolute', width: '75%' },
  cameraText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cameraSubtext: { color: '#CCCCCC', fontSize: 11, marginTop: 8 },
});
