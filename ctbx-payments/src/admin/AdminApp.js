import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AdminShell from './components/AdminShell';
import { ADMIN_NAV_SECTIONS } from './components/AdminSidebar';
import AdminLoginScreen from './screens/AdminLoginScreen';
import { adminGetSession, adminLogout } from './services/adminAuthClient';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminClientsScreen from './screens/AdminClientsScreen';
import AdminAccountsScreen from './screens/AdminAccountsScreen';
import AdminPixScreen from './screens/AdminPixScreen';
import AdminComplianceScreen from './screens/AdminComplianceScreen';
import AdminTransfersScreen from './screens/AdminTransfersScreen';
import AdminPaymentsScreen from './screens/AdminPaymentsScreen';
import AdminInvestmentsScreen from './screens/AdminInvestmentsScreen';
import AdminCardsScreen from './screens/AdminCardsScreen';
import AdminLimitsScreen from './screens/AdminLimitsScreen';
import AdminFeesScreen from './screens/AdminFeesScreen';
import AdminReportsScreen from './screens/AdminReportsScreen';
import AdminUsersScreen from './screens/AdminUsersScreen';
import AdminSettingsScreen from './screens/AdminSettingsScreen';
import AdminAuditScreen from './screens/AdminAuditScreen';
import AdminCmsScreen from './screens/AdminCmsScreen';
import adminColors from './theme/adminColors';
import { radii, spacing, typography } from '../theme';

// Todas as seções da estrutura administrativa têm tela própria a partir
// desta etapa — o placeholder "Em breve" abaixo fica só como salvaguarda
// para uma futura seção nova ainda não mapeada aqui.
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
  limits: AdminLimitsScreen,
  fees: AdminFeesScreen,
  reports: AdminReportsScreen,
  admin_users: AdminUsersScreen,
  settings: AdminSettingsScreen,
  audit: AdminAuditScreen,
  cms: AdminCmsScreen,
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

// Estados possíveis da sessão do admin nesta árvore isolada:
// 'loading' (checando sessão existente) → 'unauthenticated' (mostra login)
// ou 'authenticated' (mostra o shell). Nenhum outro componente do app
// cliente compartilha esse state — sessão de admin é um domínio à parte.
export default function AdminApp() {
  const [session, setSession] = useState({ status: 'loading', admin: null });
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    let cancelled = false;
    adminGetSession()
      .then((data) => {
        if (cancelled) return;
        setSession(data?.admin ? { status: 'authenticated', admin: data.admin } : { status: 'unauthenticated', admin: null });
      })
      .catch(() => { if (!cancelled) setSession({ status: 'unauthenticated', admin: null }); });
    return () => { cancelled = true; };
  }, []);

  const handleLoginSuccess = (admin) => setSession({ status: 'authenticated', admin });
  const handleLogout = async () => {
    try { await adminLogout(); } catch { /* revoga do lado do servidor mesmo se a chamada falhar visualmente */ }
    setSession({ status: 'unauthenticated', admin: null });
  };

  if (session.status === 'loading') {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }
  if (session.status === 'unauthenticated') {
    return <AdminLoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const section = ADMIN_NAV_SECTIONS.find((item) => item.id === activeSection) || ADMIN_NAV_SECTIONS[0];
  const SectionScreen = SECTION_SCREENS[activeSection];
  return (
    <AdminShell activeSection={activeSection} admin={session.admin} onLogout={handleLogout} onSelectSection={setActiveSection} title={section.label}>
      {SectionScreen ? <SectionScreen /> : <ComingSoonPanel label={section.label} />}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  comingSoon: { alignItems: 'flex-start', backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  comingSoonTitle: { ...typography.heading2, color: adminColors.textPrimary, marginBottom: spacing.sm },
  comingSoonText: { ...typography.body, color: adminColors.textSecondary, maxWidth: 480 },
  loadingRoot: { alignItems: 'center', backgroundColor: adminColors.background, flex: 1, height: '100vh', justifyContent: 'center' },
  loadingText: { ...typography.body, color: adminColors.textMuted },
});
