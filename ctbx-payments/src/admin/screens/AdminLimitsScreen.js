import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { spacing } from '../../theme';
import { ADMIN_LIMITS, ADMIN_LIMITS_STATS, ADMIN_LIMIT_TABS, LIMIT_STATUS_TONE } from '../data/adminMockData';

// Tela somente leitura: visualização de limites por cliente/conta (PIX
// diurno/noturno, transferência e saque). Nenhuma ação altera limite real.
function LimitDrawer({ limit, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={limit.client}>
      <DetailSection title="Cliente">
        <DetailRow label="Cliente" value={limit.client} />
        <DetailRow label="CPF/CNPJ" value={limit.document} />
        <DetailRow label="Conta" value={limit.account} />
        <DetailRow label="Tipo" value={limit.clientType} />
      </DetailSection>
      <DetailSection title="PIX diário">
        <DetailRow label="Utilizado" value={limit.pixDayUsed} />
        <DetailRow label="Disponível" value={limit.pixDayAvailable} />
        <DetailRow label="Limite total" value={limit.pixDayLimit} />
      </DetailSection>
      <DetailSection title="PIX noturno">
        <DetailRow label="Utilizado" value={limit.pixNightUsed} />
        <DetailRow label="Disponível" value={limit.pixNightAvailable} />
        <DetailRow label="Limite total" value={limit.pixNightLimit} />
      </DetailSection>
      <DetailSection title="Transferência (TED/TEF)">
        <DetailRow label="Utilizado" value={limit.transferUsed} />
        <DetailRow label="Disponível" value={limit.transferAvailable} />
        <DetailRow label="Limite total" value={limit.transferLimit} />
      </DetailSection>
      <DetailSection title="Saque">
        <DetailRow label="Utilizado" value={limit.withdrawalUsed} />
        <DetailRow label="Disponível" value={limit.withdrawalAvailable} />
        <DetailRow label="Limite total" value={limit.withdrawalLimit} />
      </DetailSection>
      <DetailSection title="Status">
        <DetailRow label="Situação" value={limit.statusLabel} />
        <DetailRow label="Última revisão" value={limit.lastReviewAt} />
      </DetailSection>
      <DetailSection title="Histórico/Timeline">
        <DetailTimeline steps={limit.timeline} />
      </DetailSection>
    </DetailDrawer>
  );
}

export default function AdminLimitsScreen() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedLimit, setSelectedLimit] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_LIMITS.filter((limit) => {
      if (tab !== 'all' && limit.statusKey !== tab) return false;
      if (!q) return true;
      return [limit.client, limit.document, limit.account, limit.id].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [tab, query]);

  const columns = [
    { key: 'client', label: 'Cliente', flex: 1.4 },
    { key: 'account', label: 'Conta', flex: 1 },
    { key: 'pixDaySummary', label: 'PIX diário', flex: 1.2 },
    { key: 'pixNightSummary', label: 'PIX noturno', flex: 1.2 },
    { key: 'transferSummary', label: 'Transferência', flex: 1.2 },
    { key: 'withdrawalSummary', label: 'Saque', flex: 1.1 },
    { key: 'statusLabel', label: 'Status', flex: 1.1, render: (row) => <StatusBadge label={row.statusLabel} tone={LIMIT_STATUS_TONE[row.statusKey]} /> },
    { key: 'lastReviewAt', label: 'Última revisão', flex: 0.9 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_LIMITS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelectedLimit(null); }} options={ADMIN_LIMIT_TABS} />

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por nome, CPF/CNPJ, conta ou ID do limite..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        <AdminTable columns={columns} onRowPress={setSelectedLimit} rows={filtered} selectedId={selectedLimit?.id} />
        {selectedLimit ? <LimitDrawer limit={selectedLimit} onClose={() => setSelectedLimit(null)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { maxWidth: 480 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 420 },
});
