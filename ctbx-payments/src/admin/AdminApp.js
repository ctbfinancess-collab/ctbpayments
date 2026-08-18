import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AdminShell from './components/AdminShell';
import { ADMIN_NAV_SECTIONS } from './components/AdminSidebar';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminClientsScreen from './screens/AdminClientsScreen';
import AdminAccountsScreen from './screens/AdminAccountsScreen';
import AdminPixScreen from './screens/AdminPixScreen';
import AdminComplianceScreen from './screens/AdminComplianceScreen';
import AdminTransfersScreen from './screens/AdminTransfersScreen';
import AdminPaymentsScreen from './screens/AdminPaymentsScreen';
import AdminInvestmentsScreen from './screens/AdminInvestmentsScreen';
import AdminCardsScreen from './screens/AdminCardsScreen';
import adminColors from './theme/adminColors';
import { radii, spacing, typography } from '../theme';

// Seções com tela própria nesta etapa. As demais (Transferências, Pagamentos,
// Investimentos, Cartões, Limites, Tarifas, Relatórios, Usuários
// administrativos, Configurações, Logs/Auditoria) seguem no placeholder
// "Em breve" até serem implementadas numa próxima etapa aprovada.
const SECTION_SCREENS = {
  dashboard: AdminDashboardScreen,
  clients: AdminClientsScreen,
  accounts: AdminAccountsScreen,
  pix: AdminPixScreen,
  compliance: AdminComplianceScreen,
  transfers: AdminTransfersScreen,
  payments: AdminPaymentsScreen,
  investments: AdminInvestmentsScreen,
  cards: AdminCardsScreen,
};

// Raiz isolada do Painel Administrativo — não usa WebFrame, SessionProvider
// ou navegação do app cliente (ver comentário em App.js). Estrutural: só a
// seção 'dashboard' tem tela própria nesta etapa; as demais mostram um
// placeholder até serem implementadas numa próxima etapa aprovada.
function ComingSoonPanel({ label }) {
  return (
    <View style={styles.comingSoon}>
      <Text style={styles.comingSoonTitle}>{label}</Text>
      <Text style={styles.comingSoonText}>Esta seção ainda não foi implementada — faz parte de uma próxima etapa do Painel Administrativo.</Text>
    </View>
  );
}

export default function AdminApp() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const section = ADMIN_NAV_SECTIONS.find((item) => item.id === activeSection) || ADMIN_NAV_SECTIONS[0];
  const SectionScreen = SECTION_SCREENS[activeSection];
  return (
    <AdminShell activeSection={activeSection} onSelectSection={setActiveSection} title={section.label}>
      {SectionScreen ? <SectionScreen /> : <ComingSoonPanel label={section.label} />}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  comingSoon: { alignItems: 'flex-start', backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  comingSoonTitle: { ...typography.heading2, color: adminColors.textPrimary, marginBottom: spacing.sm },
  comingSoonText: { ...typography.body, color: adminColors.textSecondary, maxWidth: 480 },
});
