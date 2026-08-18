import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { spacing } from '../../theme';
import { ADMIN_TRANSFERS, ADMIN_TRANSFERS_STATS, ADMIN_TRANSFER_TABS } from '../data/adminMockData';

const STATUS_TONE = { completed: 'success', pending: 'warning', failed: 'danger', cancelled: 'neutral' };

export default function AdminTransfersScreen() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_TRANSFERS.filter((transfer) => {
      if (tab === 'sent' && transfer.direction !== 'sent') return false;
      if (tab === 'received' && transfer.direction !== 'received') return false;
      if (['pending', 'completed', 'failed', 'cancelled'].includes(tab) && transfer.statusKey !== tab) return false;
      if (!q) return true;
      return [transfer.client, transfer.document, transfer.id, transfer.originAccount, transfer.destinationAccount].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [tab, query]);

  const columns = [
    { key: 'occurredAt', label: 'Data/Hora', flex: 1.2 },
    { key: 'client', label: 'Cliente', flex: 1.3 },
    { key: 'originAccount', label: 'Origem', flex: 1 },
    { key: 'destinationAccount', label: 'Destino', flex: 1 },
    { key: 'typeLabel', label: 'Tipo', flex: 1.2 },
    { key: 'value', label: 'Valor', flex: 0.9 },
    { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={STATUS_TONE[row.statusKey]} /> },
    { key: 'id', label: 'ID da transferência', flex: 1.3 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_TRANSFERS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelected(null); }} options={ADMIN_TRANSFER_TABS} />

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por nome, CPF/CNPJ, ID da transferência, conta de origem ou destino..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        <AdminTable columns={columns} onRowPress={setSelected} rows={filtered} selectedId={selected?.id} />
        {selected ? (
          <DetailDrawer onClose={() => setSelected(null)} title={selected.id}>
            <DetailSection title="Transferência">
              <DetailRow label="Data/hora" value={selected.occurredAt} />
              <DetailRow label="Tipo" value={selected.typeLabel} />
              <DetailRow label="Status" value={selected.statusLabel} />
              <DetailRow label="Descrição" value={selected.description} />
            </DetailSection>
            <DetailSection title="Cliente">
              <DetailRow label="Nome" value={selected.client} />
              <DetailRow label="CPF/CNPJ" value={selected.document} />
            </DetailSection>
            <DetailSection title="Contas">
              <DetailRow label="Conta origem" value={selected.originAccount} />
              <DetailRow label="Conta destino" value={selected.destinationAccount} />
              {selected.destinationBank ? <DetailRow label="Banco destino" value={selected.destinationBank} /> : null}
              <DetailRow label="Agência" value={selected.agency} />
              <DetailRow label="Número da conta" value={selected.accountNumber} />
            </DetailSection>
            <DetailSection title="Valores">
              <DetailRow label="Valor" value={selected.value} />
              <DetailRow label="Tarifa" value={selected.fee} />
              <DetailRow label="Valor líquido" value={selected.netValue} />
            </DetailSection>
            <DetailSection title="Histórico/Timeline">
              <DetailTimeline steps={selected.timeline} />
            </DetailSection>
          </DetailDrawer>
        ) : null}
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
