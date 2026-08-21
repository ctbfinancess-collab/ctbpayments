import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { spacing } from '../../theme';
import { ADMIN_FEES, ADMIN_FEES_STATS, ADMIN_FEE_TABS, FEE_STATUS_TONE } from '../data/adminMockData';

// Tela somente leitura: tarifas por produto/serviço. Nenhuma ação altera
// valor, vigência ou status real de tarifa.
function FeeDrawer({ fee, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={fee.product}>
      <DetailSection title="Tarifa">
        <DetailRow label="Produto/Serviço" value={fee.product} />
        <DetailRow label="Categoria" value={fee.categoryLabel} />
        <DetailRow label="Tipo de cobrança" value={fee.typeLabel} />
        <DetailRow label="Valor" value={fee.value} />
        <DetailRow label="Cobrança" value={fee.charge} />
      </DetailSection>
      <DetailSection title="Vigência">
        <DetailRow label="Vigente desde" value={fee.effectiveFrom} />
        <DetailRow label="Status" value={fee.statusLabel} />
      </DetailSection>
      <DetailSection title="Descrição/Regra">
        <DetailRow label="Regra" value={fee.description} />
      </DetailSection>
      <DetailSection title="Histórico/Timeline">
        <DetailTimeline steps={fee.timeline} />
      </DetailSection>
    </DetailDrawer>
  );
}

export default function AdminFeesScreen() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedFee, setSelectedFee] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_FEES.filter((fee) => {
      if (tab !== 'all' && fee.category !== tab) return false;
      if (!q) return true;
      return [fee.product, fee.categoryLabel, fee.id].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [tab, query]);

  const columns = [
    { key: 'product', label: 'Produto/Serviço', flex: 1.8 },
    { key: 'categoryLabel', label: 'Categoria', flex: 1 },
    { key: 'typeLabel', label: 'Tipo', flex: 0.8 },
    { key: 'value', label: 'Valor', flex: 0.8 },
    { key: 'charge', label: 'Cobrança', flex: 1.1 },
    { key: 'statusLabel', label: 'Status', flex: 0.8, render: (row) => <StatusBadge label={row.statusLabel} tone={FEE_STATUS_TONE[row.statusKey]} /> },
    { key: 'effectiveFrom', label: 'Vigência desde', flex: 0.9 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_FEES_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelectedFee(null); }} options={ADMIN_FEE_TABS} />

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por produto/serviço, categoria ou ID da tarifa..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        <AdminTable columns={columns} onRowPress={setSelectedFee} rows={filtered} selectedId={selectedFee?.id} />
        {selectedFee ? <FeeDrawer fee={selectedFee} onClose={() => setSelectedFee(null)} /> : null}
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
