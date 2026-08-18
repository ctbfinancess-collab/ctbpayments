import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ServiceScreenLayout from '../../../components/services/ServiceScreenLayout';
import { Card, ErrorState, Icon, LoadingState, MissingDataState, PrimaryButton } from '../../../components/ui';
import useAsyncResource from '../../../hooks/useAsyncResource';
import { getServiceProduct } from '../../../services/businessServicesService';
import { colors, radii, spacing, typography } from '../../../theme';

const SERVICES_BACKGROUND = require('../../../../assets/ctbx-services-background.png');

export default function ServiceProductScreen({ navigation, route }) {
  const productId = route.params?.productId;
  const load = useCallback(() => getServiceProduct(productId), [productId]);
  const { data: product, error, loading, retry } = useAsyncResource(load);

  if (!productId) return <MissingDataState navigation={navigation} title="Produto" />;
  if (loading) return <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title="Carregando…"><LoadingState /></ServiceScreenLayout>;
  if (error) return <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title="Produto"><ErrorState message="Não foi possível carregar este produto." onRetry={retry} /></ServiceScreenLayout>;
  if (!product) return <MissingDataState navigation={navigation} title="Produto" />;

  return (
    <ServiceScreenLayout atmospheric backgroundSource={SERVICES_BACKGROUND} navigation={navigation} title={product.title}>
      <Card elevated={false} style={styles.hero}>
        <View style={styles.iconWrap}><Icon color={colors.purple300} name={product.icon} size={26} /></View>
        <Text style={styles.tag}>{product.tag}</Text>
        <Text style={styles.headline}>{product.headline}</Text>
        <Text style={styles.summary}>{product.summary}</Text>
      </Card>
      <Card elevated={false} style={styles.card}>
        <Text style={styles.sectionTitle}>Como funciona</Text>
        {product.bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Icon color={colors.orange500} name="checkmark-circle" size={18} style={styles.bulletIcon} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </Card>
      <PrimaryButton onPress={() => navigation.navigate('ServiceProductRequest', { productId })}>{product.ctaLabel}</PrimaryButton>
      <Text style={styles.note}>{product.disclaimer}</Text>
    </ServiceScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  iconWrap: { alignItems: 'center', backgroundColor: 'rgba(119, 105, 232, 0.16)', borderRadius: radii.md, height: 44, justifyContent: 'center', width: 44 },
  tag: { ...typography.eyebrow, color: colors.purple300, marginTop: spacing.md },
  headline: { ...typography.heading2, color: colors.textPrimary, marginTop: spacing.sm },
  summary: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  card: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  sectionTitle: { ...typography.heading3, color: colors.textPrimary, marginBottom: spacing.sm },
  bulletRow: { alignItems: 'center', flexDirection: 'row', marginTop: spacing.sm },
  bulletIcon: { marginRight: spacing.sm },
  bulletText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  note: { ...typography.caption, color: colors.orange500, textAlign: 'center' },
});
