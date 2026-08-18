import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import ServiceScreenLayout from '../../../components/services/ServiceScreenLayout';
import { Card, ConfirmationButton, ErrorState, FormField, LoadingState, MissingDataState } from '../../../components/ui';
import useAsyncResource from '../../../hooks/useAsyncResource';
import { getServiceProduct, submitServiceProductRequest } from '../../../services/businessServicesService';
import { colors, spacing, typography } from '../../../theme';

const SERVICES_BACKGROUND = require('../../../../assets/ctbx-services-background.png');

export default function ServiceProductRequestScreen({ navigation, route }) {
  const productId = route.params?.productId;
  const load = useCallback(() => getServiceProduct(productId), [productId]);
  const { data: product, error, loading, retry } = useAsyncResource(load);
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!productId) return <MissingDataState navigation={navigation} title="Solicitação" />;
  if (loading) return <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title="Carregando…"><LoadingState /></ServiceScreenLayout>;
  if (error) return <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title="Solicitação"><ErrorState message="Não foi possível carregar este produto." onRetry={retry} /></ServiceScreenLayout>;
  if (!product) return <MissingDataState navigation={navigation} title="Solicitação" />;

  const setField = (key) => (text) => setValues((current) => ({ ...current, [key]: text }));

  const send = async () => {
    const missing = product.fields.some((field) => !values[field.key]?.trim());
    if (missing) return Alert.alert('Preencha todos os campos para continuar.');
    try {
      setSubmitting(true);
      const request = await submitServiceProductRequest(productId, values);
      navigation.replace('ServiceProductStatus', { productId, request });
    } catch (submitError) {
      Alert.alert('Não foi possível enviar', submitError?.message || 'Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title={product.requestTitle}>
      <Card elevated={false} style={styles.card}>
        <Text style={styles.title}>Dados da solicitação</Text>
        {product.fields.map((field) => (
          <FormField
            key={field.key}
            keyboardType={field.keyboardType}
            label={field.label}
            onChangeText={setField(field.key)}
            placeholder={field.placeholder}
            value={values[field.key] || ''}
          />
        ))}
        <Text style={styles.note}>{product.disclaimer}</Text>
      </Card>
      <ConfirmationButton disabled={submitting} loading={submitting} onPress={send}>{product.submitLabel}</ConfirmationButton>
    </ServiceScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  title: { ...typography.heading2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.caption, color: colors.orange500, marginTop: spacing.md },
});
