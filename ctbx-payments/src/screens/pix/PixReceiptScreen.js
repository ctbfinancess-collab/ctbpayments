import React from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { InfoRow, PixButton } from '../../components/pix/PixForm';
import { MissingDataState } from '../../components/ui';

export default function PixReceiptScreen({ navigation, route }) {
  const transfer = route.params?.transfer;
  if (!transfer) return <MissingDataState navigation={navigation} title="Comprovante Pix" />;

  const receiptText = [
    transfer.simulated ? 'COMPROVANTE PIX SANDBOX · OPERAÇÃO SIMULADA' : 'PIX realizado com sucesso!',
    `Valor: R$ ${transfer.amount}`,
    `Para: ${transfer.beneficiary.name}`,
    `Chave: ${transfer.key}`,
  ].join('\n');

  return (
    <PixLayout navigation={navigation} title="Comprovante PIX">
      <View style={styles.successArea}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>{transfer.status === 'SCHEDULED' ? 'Pix agendado!' : 'Pix realizado com sucesso!'}</Text>
        <Text style={styles.demo}>{transfer.simulated ? `${transfer.status === 'SCHEDULED' ? 'AGENDAMENTO SANDBOX' : 'COMPROVANTE PIX SANDBOX'} · OPERAÇÃO SIMULADA` : 'Ambiente de demonstração'}</Text>
      </View>
      <View style={styles.receiptCard}>
        <InfoRow label="Valor" value={`R$ ${transfer.amount}`} />
        <InfoRow label="Para" value={transfer.beneficiary.name} />
        <InfoRow label="CPF/CNPJ" value={transfer.beneficiary.document} />
        <InfoRow label="Instituição" value={transfer.beneficiary.bank} />
        <InfoRow label="Chave" value={transfer.key} />
        <InfoRow label="Identificador" value={transfer.pixTransferId || transfer.id} />
        {transfer.sandboxReference ? <InfoRow label="Referência SANDBOX" value={transfer.sandboxReference} /> : null}
        {transfer.scheduled ? <InfoRow label="Agendado para" value={transfer.scheduleDate} /> : null}
      </View>
      <PixButton onPress={() => Alert.alert('Comprovante PIX SANDBOX', 'Não existe PDF bancário oficial para esta operação simulada.')} secondary>
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
  demo: { color: PIX_COLORS.muted, fontSize: 12, marginTop: 6 },
  receiptCard: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.borderStrong, borderRadius: 18, borderWidth: 1, marginBottom: 12, padding: 15 },
});
