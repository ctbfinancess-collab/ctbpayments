import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import { ADMIN_USERS, ADMIN_USERS_STATS, ADMIN_USER_TABS, USER_STATUS_TONE } from '../data/adminMockData';

// Tela somente leitura: usuários com acesso ao Painel Admin. Nenhum botão
// aqui cria, edita, bloqueia, reseta senha ou reenvia convite de verdade —
// são apenas estruturais/desabilitados. Nunca exibe senha, hash, token,
// segredo, chave MFA ou qualquer credencial — só um indicador Ativo/Inativo.
const STATUS_TAB_IDS = new Set(['active', 'blocked', 'pending']);
const STRUCTURAL_ACTIONS = ['Novo usuário', 'Editar', 'Bloquear', 'Reenviar convite'];

function UserDrawer({ onClose, user }) {
  return (
    <DetailDrawer onClose={onClose} title={user.name}>
      <DetailSection title="Identificação">
        <DetailRow label="Nome completo" value={user.name} />
        <DetailRow label="E-mail" value={user.email} />
        <DetailRow label="ID" value={user.id} />
        <DetailRow label="Função" value={user.role} />
      </DetailSection>
      <DetailSection title="Acesso">
        <DetailRow label="Perfil" value={user.profileLabel} />
        <DetailRow label="Status" value={user.statusLabel} />
        <DetailRow label="MFA" value={user.mfaLabel} />
        <DetailRow label="Data de criação" value={user.createdAt} />
        <DetailRow label="Último acesso" value={user.lastAccessAt} />
        <DetailRow label="IP do último acesso (mock)" value={user.lastAccessIp} />
        <DetailRow label="Dispositivo (mock)" value={user.device} />
      </DetailSection>
      <DetailSection title="Permissões">
        {user.permissions.map((permission) => (
          <View key={permission.module} style={styles.permissionRow}>
            <Text style={styles.permissionModule}>{permission.module}</Text>
            <StatusBadge label={permission.access} tone={permission.access === 'Visualizar' ? 'info' : 'neutral'} />
          </View>
        ))}
      </DetailSection>
      <DetailSection title="Ações">
        <View style={styles.actionsRow}>
          {STRUCTURAL_ACTIONS.map((action) => (
            <View key={action} style={styles.actionPill}>
              <Text style={styles.actionPillText}>{action}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.actionsNote}>Ações estruturais — nenhuma alteração real é aplicada neste ambiente.</Text>
      </DetailSection>
      <DetailSection title="Timeline de atividades recentes">
        <DetailTimeline steps={user.timeline} />
      </DetailSection>
    </DetailDrawer>
  );
}

export default function AdminUsersScreen() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_USERS.filter((user) => {
      if (STATUS_TAB_IDS.has(tab) && user.statusKey !== tab) return false;
      if (!STATUS_TAB_IDS.has(tab) && tab !== 'all' && user.profileKey !== tab) return false;
      if (!q) return true;
      return [user.name, user.email, user.role, user.id].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [tab, query]);

  const columns = [
    { key: 'name', label: 'Nome', flex: 1.5 },
    { key: 'email', label: 'E-mail', flex: 1.6 },
    { key: 'role', label: 'Função', flex: 1.5 },
    { key: 'profileLabel', label: 'Perfil', flex: 1 },
    { key: 'mfaLabel', label: 'MFA', flex: 0.6 },
    { key: 'lastAccessAt', label: 'Último acesso', flex: 1.2 },
    { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={USER_STATUS_TONE[row.statusKey]} /> },
    { key: 'id', label: 'ID', flex: 0.8 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.statsGrid}>
          {ADMIN_USERS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
        </View>
        <View style={styles.newUserButton}>
          <Text style={styles.newUserButtonText}>+ Novo usuário</Text>
        </View>
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelectedUser(null); }} options={ADMIN_USER_TABS} />

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por nome, e-mail, função ou ID do usuário..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        <AdminTable columns={columns} emptyMessage="Nenhum usuário encontrado para os filtros selecionados." onRowPress={setSelectedUser} rows={filtered} selectedId={selectedUser?.id} />
        {selectedUser ? <UserDrawer onClose={() => setSelectedUser(null)} user={selectedUser} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  statsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Estrutural/desabilitado — nenhuma criação real de usuário nesta etapa.
  newUserButton: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.md, borderWidth: 1, opacity: 0.5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  newUserButtonText: { ...typography.bodyMedium, color: adminColors.textMuted },
  search: { maxWidth: 480 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 480 },
  permissionRow: { alignItems: 'center', borderTopColor: adminColors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  permissionModule: { ...typography.body, color: adminColors.textSecondary },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  actionPill: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.pill, borderWidth: 1, opacity: 0.5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  actionPillText: { ...typography.label, color: adminColors.textMuted },
  actionsNote: { ...typography.caption, color: adminColors.textMuted },
});
