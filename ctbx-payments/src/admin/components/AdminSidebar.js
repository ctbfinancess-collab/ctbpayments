import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../components/ui';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

// Estrutura do menu aprovada no plano. Cada item leva um `id` de seção — só
// 'dashboard' tem tela implementada nesta etapa; os demais mostram o
// placeholder "Em breve" (ver AdminApp.js) até ganharem sua própria tela.
export const ADMIN_NAV_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { id: 'clients', label: 'Clientes', icon: 'people-outline' },
  { id: 'accounts', label: 'Contas', icon: 'wallet-outline' },
  { id: 'pix', label: 'PIX', icon: 'flash-outline' },
  { id: 'transfers', label: 'Transferências', icon: 'swap-horizontal-outline' },
  { id: 'payments', label: 'Pagamentos', icon: 'document-text-outline' },
  { id: 'investments', label: 'Investimentos', icon: 'trending-up-outline' },
  { id: 'cards', label: 'Cartões', icon: 'card-outline' },
  { id: 'compliance', label: 'Compliance / KYC', icon: 'shield-checkmark-outline' },
  { id: 'limits', label: 'Limites', icon: 'speedometer-outline' },
  { id: 'fees', label: 'Tarifas', icon: 'pricetag-outline' },
  { id: 'reports', label: 'Relatórios', icon: 'bar-chart-outline' },
  { id: 'admin_users', label: 'Usuários administrativos', icon: 'person-circle-outline' },
  { id: 'settings', label: 'Configurações', icon: 'settings-outline' },
  { id: 'audit', label: 'Logs / Auditoria', icon: 'reader-outline' },
];

export default function AdminSidebar({ activeSection, onSelect }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.logoArea}>
        <Text style={styles.logoText}>CTBX</Text>
        <Text style={styles.logoSubtext}>PAYMENTS</Text>
      </View>
      <View style={styles.nav}>
        {ADMIN_NAV_SECTIONS.map((section) => {
          const active = section.id === activeSection;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              key={section.id}
              onPress={() => onSelect(section.id)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <Icon color={active ? adminColors.accentPurpleSoft : adminColors.textSecondary} name={section.icon} size={18} style={styles.navIcon} />
              <Text numberOfLines={1} style={[styles.navLabel, active && styles.navLabelActive]}>{section.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>CTBX PAYMENTS</Text>
        <Text style={styles.footerVersion}>Admin v0.1.0 · estrutural</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: adminColors.sidebar, borderRightColor: adminColors.border, borderRightWidth: 1, paddingVertical: spacing.lg, width: 248 },
  logoArea: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  logoText: { ...typography.heading2, color: adminColors.textPrimary, letterSpacing: 0.5 },
  logoSubtext: { ...typography.caption, color: adminColors.textMuted, letterSpacing: 1.5 },
  nav: { flex: 1, gap: spacing.xs, paddingHorizontal: spacing.md },
  navItem: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  navItemActive: { backgroundColor: adminColors.infoSoft, borderColor: 'rgba(119, 105, 232, 0.35)', borderWidth: 1 },
  navIcon: { marginRight: spacing.sm, width: 18 },
  navLabel: { ...typography.bodyMedium, color: adminColors.textSecondary, flexShrink: 1 },
  navLabelActive: { color: adminColors.textPrimary },
  footer: { borderTopColor: adminColors.border, borderTopWidth: 1, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  footerText: { ...typography.caption, color: adminColors.textMuted },
  footerVersion: { ...typography.caption, color: adminColors.textMuted, marginTop: 2, opacity: 0.7 },
});
