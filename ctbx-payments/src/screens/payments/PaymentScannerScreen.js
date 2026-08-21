import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PaymentLayout from '../../components/payments/PaymentLayout';
import { PrimaryButton } from '../../components/ui';
import { colors, radii, spacing, typography } from '../../theme';
const MOCK_SCAN = '00190500954014481606906809350314337370000000100';
export default function PaymentScannerScreen({ navigation }) { return <PaymentLayout navigation={navigation} title="Ler código"><View style={styles.camera}><View style={styles.frame} /><Text style={styles.title}>Leitor de código de barras</Text><Text style={styles.subtitle}>Câmera indisponível nesta reconstrução</Text></View><PrimaryButton onPress={() => navigation.navigate('PaymentCode', { code: MOCK_SCAN, source: 'scanner' })}>Inserir código</PrimaryButton></PaymentLayout>; }
const styles = StyleSheet.create({ camera: { alignItems: 'center', backgroundColor: '#08111D', borderColor: colors.borderStrong, borderRadius: radii.xl, borderWidth: 1, height: 360, justifyContent: 'center', marginBottom: spacing.xl, overflow: 'hidden' }, frame: { borderColor: colors.orange400, borderWidth: 2, height: 130, position: 'absolute', width: '82%' }, title: { ...typography.bodyMedium, color: colors.textPrimary }, subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm } });
