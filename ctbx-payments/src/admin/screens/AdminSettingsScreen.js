import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import {
  ADMIN_SETTINGS_TABS, ADMIN_SETTINGS_BY_TAB, ADMIN_SETTINGS_INTEGRATIONS, ADMIN_SETTINGS_CHANGE_HISTORY,
  SETTINGS_STATUS_TONE, INTEGRATION_STATUS_TONE,
} from '../data/adminMockData';

// Tela somente leitura: parâmetros da plataforma organizados por aba. Nenhum
// controle aqui altera configuração real — tudo é visual/desabilitado.
// Nunca exibe segredo, chave de API, token ou credencial.
function SettingCard({ setting }) {
  return (
    <View style={styles.settingCard}>
      <View style={styles.settingHeader}>
        <Text style={styles.settingName}>{setting.name}</Text>
        <StatusBadge label={setting.statusLabel} tone={SETTINGS_STATUS_TONE[setting.statusKey]} />
      </View>
      <Text style={styles.settingDescription}>{setting.description}</Text>
      <Text style={styles.settingValue}>{setting.value}</Text>
      <Text style={styles.settingFooter}>Última alteração: {setting.lastChangedAt} · por {setting.changedBy}</Text>
    </View>
  );
}

function IntegrationsTable() {
  const columns = [
    { key: 'name', label: 'Integração', flex: 1.3 },
    { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={INTEGRATION_STATUS_TONE[row.statusKey]} /> },
    { key: 'environment', label: 'Ambiente', flex: 0.9 },
    { key: 'lastSyncAt', label: 'Última sincronização', flex: 1.3 },
    { key: 'latency', label: 'Latência (mock)', flex: 0.9 },
    { key: 'availability', label: 'Disponibilidade (mock)', flex: 1 },
  ];
  return (
    <View style={styles.integrationsWrap}>
      <AdminTable columns={columns} rows={ADMIN_SETTINGS_INTEGRATIONS} />
      <Text style={styles.integrationsNote}>Integrações estruturais/mock — nenhuma URL, chave de API, token ou credencial é exibida aqui.</Text>
    </View>
  );
}

export default function AdminSettingsScreen() {
  const [tab, setTab] = useState('general');

  const historyColumns = [
    { key: 'at', label: 'Data/Hora', flex: 1.1 },
    { key: 'setting', label: 'Configuração', flex: 1.4 },
    { key: 'previousValue', label: 'Valor anterior', flex: 1.2 },
    { key: 'newValue', label: 'Valor novo', flex: 1.2 },
    { key: 'user', label: 'Usuário', flex: 1.3 },
    { key: 'environment', label: 'Ambiente', flex: 0.8 },
  ];

  const settings = ADMIN_SETTINGS_BY_TAB[tab];

  return (
    <View style={styles.wrap}>
      <AdminChipGroup activeId={tab} onSelect={setTab} options={ADMIN_SETTINGS_TABS} />

      {tab === 'integrations' ? (
        <IntegrationsTable />
      ) : (
        <View style={styles.settingsGrid}>
          {settings.map((setting) => <SettingCard key={setting.id} setting={setting} />)}
        </View>
      )}

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Histórico recente de alterações</Text>
        <AdminTable columns={historyColumns} rows={ADMIN_SETTINGS_CHANGE_HISTORY} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  settingCard: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: 320, flexGrow: 1, padding: spacing.lg },
  settingHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', marginBottom: spacing.xs },
  settingName: { ...typography.bodyMedium, color: adminColors.textPrimary, flex: 1 },
  settingDescription: { ...typography.caption, color: adminColors.textSecondary, marginBottom: spacing.sm },
  settingValue: { ...typography.heading3, color: adminColors.textPrimary, marginBottom: spacing.xs },
  settingFooter: { ...typography.caption, color: adminColors.textMuted },
  integrationsWrap: { gap: spacing.sm, minHeight: 280 },
  integrationsNote: { ...typography.caption, color: adminColors.textMuted },
  historySection: { gap: spacing.sm, minHeight: 320 },
  historyTitle: { ...typography.heading3, color: adminColors.textPrimary },
});
