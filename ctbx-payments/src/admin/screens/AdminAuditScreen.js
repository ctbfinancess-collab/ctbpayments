import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection } from '../components/DetailDrawer';
import { spacing } from '../../theme';
import {
  ADMIN_AUDIT_LOGS, ADMIN_AUDIT_STATS, ADMIN_AUDIT_CATEGORY_TABS, ADMIN_AUDIT_STATUS_TABS,
  ADMIN_AUDIT_PERIOD_TABS, AUDIT_STATUS_TONE,
} from '../data/adminMockData';

// Tela somente leitura: trilha de auditoria estrutural/sandbox. Nenhuma ação
// aqui altera ou exclui nada de verdade. Nunca exibe senha, token, API key,
// secret, credencial, hash completo ou dado completo de cartão — IP sempre
// mascarado.
function AuditDrawer({ log, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={log.id}>
      <DetailSection title="Evento">
        <DetailRow label="ID do evento" value={log.id} />
        <DetailRow label="Data/Hora" value={log.at} />
        <DetailRow label="Evento" value={log.event} />
        <DetailRow label="Módulo" value={log.module} />
        <DetailRow label="Status" value={log.statusLabel} />
      </DetailSection>
      <DetailSection title="Usuário">
        <DetailRow label="Usuário" value={log.user} />
        <DetailRow label="Perfil" value={log.userProfile} />
        <DetailRow label="IP (mascarado)" value={log.ip} />
        <DetailRow label="Dispositivo/navegador" value={log.device} />
        <DetailRow label="Ambiente" value={log.environment} />
      </DetailSection>
      <DetailSection title="Descrição">
        <DetailRow label="Descrição do evento" value={log.description} />
        <DetailRow label="Referência relacionada" value={log.relatedRef} />
      </DetailSection>
      {log.previousValue || log.newValue ? (
        <DetailSection title="Alteração registrada">
          <DetailRow label="Valor anterior" value={log.previousValue} />
          <DetailRow label="Valor novo" value={log.newValue} />
        </DetailSection>
      ) : null}
    </DetailDrawer>
  );
}

export default function AdminAuditScreen() {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_AUDIT_LOGS.filter((log) => {
      if (category !== 'all' && log.categoryKey !== category) return false;
      if (status !== 'all' && log.statusKey !== status) return false;
      if (period !== 'all' && log.periodKey !== period) return false;
      if (!q) return true;
      return [log.user, log.event, log.module, log.id, log.ip].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [category, status, period, query]);

  const columns = [
    { key: 'at', label: 'Data/Hora', flex: 1.2 },
    { key: 'user', label: 'Usuário', flex: 1.4 },
    { key: 'event', label: 'Evento/Ação', flex: 1.8 },
    { key: 'module', label: 'Módulo', flex: 1 },
    { key: 'statusLabel', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.statusLabel} tone={AUDIT_STATUS_TONE[row.statusKey]} /> },
    { key: 'ip', label: 'IP', flex: 0.9 },
    { key: 'id', label: 'ID do evento', flex: 1 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_AUDIT_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup
        activeId={category}
        onSelect={(id) => {
          // Trocar de categoria reseta os demais filtros — mesmo ajuste feito
          // em Relatórios, pra nenhuma combinação deixada de uma aba anterior
          // esvaziar a próxima categoria selecionada.
          setCategory(id);
          setStatus('all');
          setPeriod('all');
          setQuery('');
          setSelectedLog(null);
        }}
        options={ADMIN_AUDIT_CATEGORY_TABS}
      />
      <View style={styles.filtersRow}>
        <AdminChipGroup activeId={status} onSelect={setStatus} options={ADMIN_AUDIT_STATUS_TABS} />
        <AdminChipGroup activeId={period} onSelect={setPeriod} options={ADMIN_AUDIT_PERIOD_TABS} />
      </View>

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por usuário, evento, módulo, ID do evento ou IP mascarado..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        <AdminTable columns={columns} emptyMessage="Nenhum evento encontrado para os filtros selecionados." onRowPress={setSelectedLog} rows={filtered} selectedId={selectedLog?.id} />
        {selectedLog ? <AuditDrawer log={selectedLog} onClose={() => setSelectedLog(null)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { maxWidth: 480 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 480 },
});
