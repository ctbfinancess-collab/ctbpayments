import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TransferLayout from '../../components/transfers/TransferLayout';
import { TransferField } from '../../components/transfers/TransferForm';
import { Card, PrimaryButton, SectionTitle } from '../../components/ui';
import { getTransferFormData, lookupBeneficiary } from '../../services/transferService'; import useAsyncResource from '../../hooks/useAsyncResource';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { onlyTransferDigits, validateTransferDocument } from '../../utils/transferValidation';

const INTERNAL_METHODS = [{ id: 'phone', label: 'Telefone' }, { id: 'document', label: 'CPF/CNPJ' }, { id: 'account', label: 'Agência e conta' }];
export default function TransferBeneficiaryScreen({ navigation, route }) {
  const mode = route.params?.mode === 'external' ? 'external' : 'internal';
  const {data: formData} = useAsyncResource(getTransferFormData, {banks: [], accountTypes: []}); const [method, setMethod] = useState('phone'); const [form, setForm] = useState({});
  useEffect(() => { if (formData.banks[0]) setForm((current) => ({ bank: formData.banks[0].name, bankId: formData.banks[0].id, accountType: formData.accountTypes[0], ...current })); }, [formData]);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const continueFlow = async () => {
    if (mode === 'internal') {
      if (method === 'phone' && onlyTransferDigits(form.phone).length < 10) return Alert.alert('Informe um telefone válido');
      if (method === 'document' && !validateTransferDocument(form.document)) return Alert.alert('Informe um CPF ou CNPJ válido');
      if (method === 'account' && (!form.agency?.trim() || !form.account?.trim())) return Alert.alert('Informe agência e conta');
    } else if (!form.name?.trim() || !validateTransferDocument(form.document) || !form.agency?.trim() || !form.account?.trim() || !form.digit?.trim()) return Alert.alert('Preencha os dados do favorecido');
    try { navigation.navigate('TransferDetails', { beneficiary: await lookupBeneficiary(mode, form) }); } catch { Alert.alert('Serviço indisponível', 'A consulta do favorecido ainda não está configurada.'); }
  };
  return <TransferLayout navigation={navigation} title={mode === 'internal' ? 'Entre contas CTBX' : 'Outros bancos'}>
    <SectionTitle title="Favorecido" />
    {mode === 'internal' ? <>
      <View style={styles.methods}>{INTERNAL_METHODS.map((item) => <TouchableOpacity key={item.id} onPress={() => setMethod(item.id)} style={[styles.chip, method === item.id && styles.chipActive]}><Text style={[styles.chipText, method === item.id && styles.chipTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
      {method === 'phone' ? <TransferField keyboardType="phone-pad" label="Telefone" onChangeText={set('phone')} value={form.phone || ''} /> : null}
      {method === 'document' ? <TransferField keyboardType="numeric" label="CPF/CNPJ" onChangeText={set('document')} value={form.document || ''} /> : null}
      {method === 'account' ? <><TransferField keyboardType="numeric" label="Agência" onChangeText={set('agency')} value={form.agency || ''} /><TransferField keyboardType="numeric" label="Conta" onChangeText={set('account')} value={form.account || ''} /></> : null}
    </> : <Card elevated={false} style={styles.formCard}>
      <TransferField label="Banco" onChangeText={set('bank')} value={form.bank || ''} /><TransferField keyboardType="numeric" label="Agência" onChangeText={set('agency')} value={form.agency || ''} /><TransferField keyboardType="numeric" label="Conta" onChangeText={set('account')} value={form.account || ''} /><TransferField keyboardType="numeric" label="Dígito" onChangeText={set('digit')} value={form.digit || ''} /><TransferField label="Nome do favorecido" onChangeText={set('name')} value={form.name || ''} /><TransferField keyboardType="numeric" label="CPF/CNPJ" onChangeText={set('document')} value={form.document || ''} /><TransferField label="Tipo de conta" onChangeText={set('accountType')} value={form.accountType || ''} />
    </Card>}
    <PrimaryButton onPress={() => navigation.navigate('TransferFavorites', { mode })} style={styles.button}>Escolher favorito</PrimaryButton>
    <PrimaryButton onPress={continueFlow} style={styles.button}>Pesquisar e continuar</PrimaryButton>
    
  </TransferLayout>;
}
const styles = StyleSheet.create({ methods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl, marginTop: spacing.lg }, chip: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(92, 142, 220, 0.10)', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipActive: { backgroundColor: 'rgba(12, 43, 76, 0.6)', borderColor: 'rgba(99, 102, 241, 0.55)', ...shadows.glowPurple }, chipText: { ...typography.caption, color: colors.textSecondary }, chipTextActive: { color: colors.purple300 }, formCard: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, marginTop: spacing.lg, padding: spacing.lg, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 }, button: { marginTop: spacing.md }, mock: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' } });
