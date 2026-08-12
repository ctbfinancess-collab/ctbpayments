import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import TransferLayout from '../../components/transfers/TransferLayout';
import { Card, SectionTitle, ServiceCard } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';

export default function TransferStartScreen({ navigation }) {
  return <TransferLayout navigation={navigation} title="Transferências">
    <Card style={styles.hero}><Text style={styles.heroIcon}>↔</Text><View style={styles.copy}><Text style={styles.title}>Como deseja transferir?</Text><Text style={styles.subtitle}>Escolha o destino da transferência bancária.</Text></View></Card>
    <SectionTitle style={styles.section} title="Tipo de transferência" />
    <View style={styles.row}>
      <ServiceCard icon={<Image source={require('../../../assets/legacy/assets_icones_icone_tela_transferencia.png')} style={styles.iconImage} />} label="Entre contas CTBX" onPress={() => navigation.navigate('TransferBeneficiary', { mode: 'internal' })} style={styles.option} />
      <ServiceCard icon={<Image source={require('../../../assets/legacy/assets_icones_icone_para_outros_bancos.png')} style={styles.iconImage} />} label="Para outros bancos" onPress={() => navigation.navigate('TransferBeneficiary', { mode: 'external' })} style={styles.option} />
    </View>
    <Text style={styles.note}>Fluxo original: NavScreen68 → NavScreen69 / NavScreen6</Text>
  </TransferLayout>;
}
const styles = StyleSheet.create({
  hero: { alignItems: 'center', flexDirection: 'row', padding: spacing.xl }, heroIcon: { color: colors.orange400, fontSize: 32 }, copy: { flex: 1, marginLeft: spacing.lg }, title: { ...typography.heading2, color: colors.textPrimary }, subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 }, section: { marginBottom: spacing.md, marginTop: spacing.xxl }, row: { flexDirection: 'row', gap: spacing.md }, option: { flex: 1 }, iconImage: { height: 26, tintColor: colors.purple300, width: 26 }, note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xxl, textAlign: 'center' },
});
