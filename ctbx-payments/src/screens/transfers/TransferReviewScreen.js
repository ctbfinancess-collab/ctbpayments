import React from 'react';
import { StyleSheet, Text } from 'react-native';
import TransferLayout from '../../components/transfers/TransferLayout';
import { TransferInfoRow } from '../../components/transfers/TransferForm';
import { Card, ConfirmationButton, MissingDataState, OutlineButton } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';

export default function TransferReviewScreen({ navigation, route }) {
  const transfer = route.params?.transfer; if (!transfer) return <MissingDataState navigation={navigation} title="Revisar transferência" />; const b = transfer.beneficiary;
  return <TransferLayout navigation={navigation} title="Revisar transferência"><Text style={styles.intro}>Confira os dados antes de confirmar</Text><Card style={styles.card}><TransferInfoRow label="Valor" value={`R$ ${transfer.amount}`} /><TransferInfoRow label="Favorecido" value={b.name} /><TransferInfoRow label="CPF/CNPJ" value={b.document} /><TransferInfoRow label="Banco" value={b.bank} /><TransferInfoRow label="Agência e conta" value={`${b.agency} · ${b.account}-${b.digit}`} /><TransferInfoRow label="Tipo" value={b.mode === 'internal' ? 'Interna' : 'Externa'} /><TransferInfoRow label="Finalidade" value={transfer.purpose} />{transfer.description ? <TransferInfoRow label="Descrição" value={transfer.description} /> : null}<TransferInfoRow label="Data" value={transfer.scheduled ? transfer.date : 'Hoje'} /><TransferInfoRow label="Tarifa" value={`R$ ${transfer.fee}`} last /></Card>{transfer.scheduleNotice ? <Text style={styles.notice}>{transfer.scheduleNotice}</Text> : null}<ConfirmationButton onPress={() => navigation.navigate('TransferAuthorization', { transfer })}>Confirmar dados</ConfirmationButton><OutlineButton onPress={() => navigation.goBack()} style={styles.cancel}>Voltar e editar</OutlineButton></TransferLayout>;
}
const styles = StyleSheet.create({ intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }, card: { marginBottom: spacing.xl, padding: spacing.lg }, notice: { ...typography.caption, color: colors.orange400, marginBottom: spacing.lg, textAlign: 'center' }, cancel: { marginTop: spacing.md } });
