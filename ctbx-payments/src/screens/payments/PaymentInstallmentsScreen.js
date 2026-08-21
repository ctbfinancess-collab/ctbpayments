import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import PaymentLayout from '../../components/payments/PaymentLayout';
import { Card, ErrorState, LoadingState, MissingDataState, PrimaryButton } from '../../components/ui';
import useAsyncResource from '../../hooks/useAsyncResource';
import { getInstallments } from '../../services/paymentService';
import { colors, radii, shadows, spacing, typography } from '../../theme';
export default function PaymentInstallmentsScreen({ navigation, route }) {
  const payment = route.params?.payment;
  const loadInstallments = useCallback(
    () => getInstallments(payment),
    [payment],
  );
  const { data: installments, error, loading, retry } = useAsyncResource(loadInstallments, []);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!selected && installments.length > 0) setSelected(installments[0]);
  }, [installments, selected]);

  if (!payment) return <MissingDataState navigation={navigation} title="Pagamento parcelado" />;
  if (loading) return <PaymentLayout navigation={navigation} title="Pagamento parcelado"><LoadingState /></PaymentLayout>;
  if (error) return <PaymentLayout navigation={navigation} title="Pagamento parcelado"><ErrorState message="Não foi possível calcular as parcelas." onRetry={retry} /></PaymentLayout>;

  return (
    <PaymentLayout navigation={navigation} title="Pagamento parcelado">
      <Text style={styles.title}>Em quantas parcelas?</Text>
      <Text style={styles.subtitle}>Simulação temporária para pagamento com cartão.</Text>
      {installments.map((item) => (
        <TouchableOpacity key={item.count} onPress={() => setSelected(item)} style={[styles.option, selected?.count === item.count && styles.selected]}>
          <Text style={styles.installment}>{item.count}x de R$ {item.installmentValue}</Text>
          <Text style={styles.total}>Total R$ {item.total}</Text>
        </TouchableOpacity>
      ))}
      {selected ? (
        <>
          <Card elevated={false} style={styles.summary}>
            <Text style={styles.summaryLabel}>Você pagará</Text>
            <Text style={styles.summaryValue}>{selected.count}x de R$ {selected.installmentValue}</Text>
            <Text style={styles.summaryTotal}>Total: R$ {selected.total}</Text>
          </Card>
          <PrimaryButton onPress={() => navigation.navigate('PaymentReview', { payment: { ...payment, installmentData: selected, bill: { ...payment.bill, total: selected.total } } })}>Continuar</PrimaryButton>
        </>
      ) : null}
    </PaymentLayout>
  );
}
const styles = StyleSheet.create({ title: { ...typography.heading2, color: colors.textPrimary }, subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl, marginTop: spacing.sm }, option: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.lg }, selected: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(99, 102, 241, 0.55)', ...shadows.glowPurple }, installment: { ...typography.bodyMedium, color: colors.textPrimary }, total: { ...typography.caption, color: colors.textSecondary, marginTop: 3 }, summary: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(99, 102, 241, 0.35)', borderWidth: 1, marginBottom: spacing.xl, marginTop: spacing.lg, padding: spacing.lg, shadowColor: '#5946C8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 6 }, summaryLabel: { ...typography.caption, color: colors.textSecondary }, summaryValue: { ...typography.heading2, color: colors.textPrimary, marginTop: spacing.sm }, summaryTotal: { ...typography.body, color: colors.orange400, marginTop: spacing.sm } });
