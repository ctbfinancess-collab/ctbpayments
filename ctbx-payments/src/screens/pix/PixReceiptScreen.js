import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { InfoRow, PixButton } from '../../components/pix/PixForm';
import { Icon, MissingDataState } from '../../components/ui';
import { addFavorite } from '../../services/pixService';

export default function PixReceiptScreen({ navigation, route }) {
  const transfer = route.params?.transfer;
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!transfer) return <MissingDataState navigation={navigation} title="Comprovante Pix" />;

  const saveFavorite = async () => { try { setSaving(true); await addFavorite({ name: transfer.beneficiary.name, key: transfer.key, bank: transfer.beneficiary.bank, type: transfer.keyType || 'chave' }); setSaved(true); } catch { Alert.alert('Serviço indisponível', 'Não foi possível salvar este favorito agora.'); } finally { setSaving(false); } };

  const receiptText = [
    'PIX realizado com sucesso!',
    `Valor: R$ ${transfer.amount}`,
    `Para: ${transfer.beneficiary.name}`,
    `Chave: ${transfer.key}`,
  ].join('\n');

  return (
    <PixLayout navigation={navigation} title="Comprovante PIX">
      <View style={styles.successArea}>
        <Icon color={PIX_COLORS.success} name="checkmark-circle" size={52} />
        <Text style={styles.successTitle}>{transfer.status === 'SCHEDULED' ? 'Pix agendado!' : 'Pix realizado com sucesso!'}</Text>
        
      </View>
      <View style={styles.receiptCard}>
        <InfoRow label="Valor" value={`R$ ${transfer.amount}`} />
        <InfoRow label="Para" value={transfer.beneficiary.name} />
        <InfoRow label="CPF/CNPJ" value={transfer.beneficiary.document} />
        <InfoRow label="Instituição" value={transfer.beneficiary.bank} />
        <InfoRow label="Chave" value={transfer.key} />
        <InfoRow label="Identificador" value={transfer.pixTransferId || transfer.id} />
        {transfer.sandboxReference ? <InfoRow label="Referência" value={transfer.sandboxReference} /> : null}
        {transfer.scheduled ? <InfoRow label="Agendado para" value={transfer.scheduleDate} /> : null}
      </View>
      {transfer.key && !saved ? (
        <PixButton disabled={saving} loading={saving} onPress={saveFavorite} secondary>+ ADICIONAR AOS FAVORITOS</PixButton>
      ) : null}
      {saved ? <Text style={styles.savedNote}>Favorito salvo.</Text> : null}
      <PixButton onPress={() => Alert.alert('Comprovante indisponível', 'O PDF deste comprovante ainda não está disponível.')} secondary>
        VISUALIZAR
      </PixButton>
      <PixButton confirmation onPress={() => Share.share({ message: receiptText })}>COMPARTILHAR</PixButton>
      <PixButton onPress={() => navigation.navigate('Pix')} secondary>VOLTAR AO PIX</PixButton>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  successArea: { alignItems: 'center', marginBottom: 22, marginTop: 10 },
  successTitle: { color: PIX_COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 8 },
  demo: { color: PIX_COLORS.muted, fontSize: 12, marginTop: 6 },
  savedNote: { color: PIX_COLORS.success, fontSize: 12, marginBottom: 12, marginTop: -4, textAlign: 'center' },
  receiptCard: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.borderStrong, borderRadius: 18, borderWidth: 1, marginBottom: 12, padding: 15 },
});
