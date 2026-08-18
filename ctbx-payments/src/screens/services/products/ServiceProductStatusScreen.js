import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ServiceScreenLayout from '../../../components/services/ServiceScreenLayout';
import { Card, ConfirmationButton, ErrorState, Icon, LoadingState, MissingDataState } from '../../../components/ui';
import useAsyncResource from '../../../hooks/useAsyncResource';
import { getServiceProduct } from '../../../services/businessServicesService';
import { colors, spacing, typography } from '../../../theme';

const SERVICES_BACKGROUND = require('../../../../assets/ctbx-services-background.png');

export default function ServiceProductStatusScreen({ navigation, route }) {
  const productId = route.params?.productId;
  const request = route.params?.request;
  const load = useCallback(() => getServiceProduct(productId), [productId]);
  const { data: product, error, loading, retry } = useAsyncResource(load);

  if (!productId || !request) return <MissingDataState navigation={navigation} title="Status da solicitação" />;
  if (loading) return <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title="Carregando…"><LoadingState /></ServiceScreenLayout>;
  if (error) return <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title="Status da solicitação"><ErrorState message="Não foi possível carregar este produto." onRetry={retry} /></ServiceScreenLayout>;
  if (!product) return <MissingDataState navigation={navigation} title="Status da solicitação" />;

  const submittedAt = request.submittedAt ? new Date(request.submittedAt) : null;
  const submittedLabel = submittedAt ? `${submittedAt.toLocaleDateString('pt-BR')} às ${submittedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—';

  return (
    <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title={product.requestTitle}>
      <Card elevated={false} style={styles.card}>
        <View style={styles.iconWrap}><Icon color={colors.orange500} name="checkmark-circle" size={30} /></View>
        <Text style={styles.status}>{product.statusLabel}</Text>
        <Text style={styles.title}>{product.title}</Text>
        {product.fields.map((field) => (
          request[field.key] ? <Row key={field.key} a={field.label} b={request[field.key]} /> : null
        ))}
        <Row a="Protocolo" b={request.protocol} />
        <Row a="Enviado em" b={submittedLabel} />
        <Text style={styles.note}>{product.disclaimer}</Text>
      </Card>
      <ConfirmationButton onPress={() => navigation.navigate('Services')}>Concluir</ConfirmationButton>
    </ServiceScreenLayout>
  );
}

const Row = ({ a, b }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{a}</Text>
    <Text style={styles.rowValue}>{b}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(242, 106, 33, 0.35)', borderWidth: 1, shadowColor: '#F26A21', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 6 },
  iconWrap: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(242, 106, 33, 0.14)', borderRadius: 999, height: 56, justifyContent: 'center', marginBottom: spacing.md, width: 56 },
  status: { ...typography.label, color: colors.orange500, letterSpacing: 1, textAlign: 'center' },
  title: { ...typography.heading2, color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.lg, textAlign: 'center' },
  row: { borderTopColor: 'rgba(92, 142, 220, 0.10)', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.bodyMedium, color: colors.textPrimary, maxWidth: '58%', textAlign: 'right' },
  note: { ...typography.caption, color: colors.orange500, marginTop: spacing.lg, textAlign: 'center' },
});
