import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import TransferLayout from '../../components/transfers/TransferLayout';
import { Card, Icon, SectionTitle, ServiceCard } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';

export default function TransferStartScreen({ navigation }) {
  return <TransferLayout navigation={navigation} title="Transferências">
    <Card elevated={false} style={styles.hero}><Icon color={colors.orange400} name="swap-horizontal-outline" size={30} /><View style={styles.copy}><Text style={styles.title}>Como deseja transferir?</Text><Text style={styles.subtitle}>Escolha o destino da transferência bancária.</Text></View></Card>
    <SectionTitle style={styles.section} title="Tipo de transferência" />
    <View style={styles.row}>
      <ServiceCard icon={<Image source={require('../../../assets/legacy/assets_icones_icone_tela_transferencia.png')} style={styles.iconImage} />} label="Entre contas CTBX" onPress={() => navigation.navigate('TransferBeneficiary', { mode: 'internal' })} style={styles.option} />
      <ServiceCard icon={<Image source={require('../../../assets/legacy/assets_icones_icone_para_outros_bancos.png')} style={styles.iconImage} />} label="Para outros bancos" onPress={() => navigation.navigate('TransferBeneficiary', { mode: 'external' })} style={styles.option} />
    </View>
    <Text style={styles.note}>Fluxo original: NavScreen68 → NavScreen69 / NavScreen6</Text>
  </TransferLayout>;
}
// "Dark glass": mesma linguagem visual do resto do app — fundo translúcido
// em vez de cor sólida, borda quase invisível, sombra própria.
const styles = StyleSheet.create({
  hero: { alignItems: 'center', backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', borderWidth: 1, flexDirection: 'row', padding: spacing.xl, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 }, copy: { flex: 1, marginLeft: spacing.lg }, title: { ...typography.heading2, color: colors.textPrimary }, subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 }, section: { marginBottom: spacing.md, marginTop: spacing.xxl }, row: { flexDirection: 'row', gap: spacing.md }, option: { backgroundColor: 'rgba(12, 43, 76, 0.72)', borderColor: 'rgba(92, 142, 220, 0.10)', flex: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 }, iconImage: { height: 26, tintColor: colors.purple300, width: 26 }, note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xxl, textAlign: 'center' },
});
