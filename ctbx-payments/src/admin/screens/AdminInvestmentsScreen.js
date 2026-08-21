import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { spacing } from '../../theme';
import {
  ADMIN_INVESTMENTS_STATS, ADMIN_INVESTMENT_APPLICATIONS, ADMIN_INVESTMENT_MATURITIES,
  ADMIN_INVESTMENT_POSITIONS, ADMIN_INVESTMENT_PRODUCTS, ADMIN_INVESTMENT_REDEMPTIONS,
  ADMIN_INVESTMENT_TABS, OPERATION_STATUS_TONE, POSITION_STATUS_TONE,
} from '../data/adminMockData';

const MATURITY_STATUS_TONE = { Vencendo: 'warning', Vencido: 'danger', Programado: 'info' };

// Colunas mais enxutas que Transferências/Pagamentos de propósito — cada aba
// mostra só o essencial da própria aba, e o restante (rentabilidade
// acumulada, taxa/indexador, liquidez etc.) fica no DetailDrawer.
function buildPositionColumns() {
  return [
    { key: 'client', label: 'Cliente', flex: 1.4 },
    { key: 'product', label: 'Produto', flex: 1.6 },
    { key: 'category', label: 'Categoria', flex: 0.9 },
    { key: 'appliedValue', label: 'Valor aplicado', flex: 1 },
    { key: 'currentBalance', label: 'Saldo atual', flex: 1 },
    { key: 'rate', label: 'Rentabilidade', flex: 1.1 },
    { key: 'statusLabel', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.statusLabel} tone={POSITION_STATUS_TONE[row.statusKey]} /> },
  ];
}

function buildOperationColumns(valueLabel) {
  return [
    { key: 'occurredAt', label: 'Data/Hora', flex: 1.1 },
    { key: 'client', label: 'Cliente', flex: 1.3 },
    { key: 'product', label: 'Produto', flex: 1.5 },
    { key: valueLabel.key, label: valueLabel.label, flex: 1 },
    { key: 'operationStatusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.operationStatusLabel} tone={OPERATION_STATUS_TONE[row.operationStatusKey]} /> },
    { key: 'id', label: 'ID da operação', flex: 1.2 },
  ];
}

function RecordDrawer({ kind, onClose, record }) {
  const valueRows = kind === 'redemption'
    ? [<DetailRow key="req" label="Valor solicitado" value={record.requestedValue} />, <DetailRow key="net" label="Valor líquido" value={record.netValue} />]
    : [<DetailRow key="val" label={kind === 'application' ? 'Valor' : 'Valor aplicado'} value={kind === 'application' ? record.value : record.appliedValue} />];
  return (
    <DetailDrawer onClose={onClose} title={record.id}>
      <DetailSection title="Cliente">
        <DetailRow label="Cliente" value={record.client} />
        <DetailRow label="CPF/CNPJ" value={record.document} />
        <DetailRow label="Conta" value={record.account} />
      </DetailSection>
      <DetailSection title="Produto">
        <DetailRow label="Produto" value={record.product} />
        <DetailRow label="Emissor" value={record.issuer} />
        <DetailRow label="Categoria" value={record.category} />
      </DetailSection>
      <DetailSection title="Valores">
        {valueRows}
        <DetailRow label="Saldo atual" value={record.currentBalance} />
        <DetailRow label="Rentabilidade acumulada" value={record.accumulatedReturn} />
        <DetailRow label="Taxa/Indexador" value={`${record.rate} · ${record.indexer}`} />
      </DetailSection>
      <DetailSection title="Datas e liquidez">
        <DetailRow label="Data da aplicação" value={record.appliedAt} />
        <DetailRow label="Vencimento" value={record.maturity} />
        <DetailRow label="Liquidez" value={record.liquidity} />
        <DetailRow label="Status" value={record.statusLabel || record.operationStatusLabel} />
      </DetailSection>
      <DetailSection title="Histórico/Timeline">
        <DetailTimeline steps={record.timeline} />
      </DetailSection>
    </DetailDrawer>
  );
}

export default function AdminInvestmentsScreen() {
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const positionColumns = buildPositionColumns();
  const applicationColumns = buildOperationColumns({ key: 'value', label: 'Valor' });
  const redemptionColumns = buildOperationColumns({ key: 'requestedValue', label: 'Valor solicitado' });

  const matches = (fields) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return fields.some((field) => (field || '').toLowerCase().includes(q));
  };

  const positions = useMemo(() => ADMIN_INVESTMENT_POSITIONS.filter((p) => matches([p.client, p.document, p.product, p.id])), [query]);
  const applications = useMemo(() => ADMIN_INVESTMENT_APPLICATIONS.filter((a) => matches([a.client, a.document, a.product, a.id])), [query]);
  const redemptions = useMemo(() => ADMIN_INVESTMENT_REDEMPTIONS.filter((r) => matches([r.client, r.document, r.product, r.id])), [query]);
  const products = useMemo(() => ADMIN_INVESTMENT_PRODUCTS.filter((p) => matches([p.name, p.category, p.issuer])), [query]);
  const maturities = useMemo(() => ADMIN_INVESTMENT_MATURITIES.filter((m) => matches([m.client, m.product])), [query]);

  const productColumns = [
    { key: 'name', label: 'Nome', flex: 1.5 },
    { key: 'category', label: 'Categoria', flex: 0.9 },
    { key: 'issuer', label: 'Emissor', flex: 1.3 },
    { key: 'rate', label: 'Rentabilidade/Taxa', flex: 1.2 },
    { key: 'liquidity', label: 'Liquidez', flex: 0.9 },
    { key: 'appliedPatrimony', label: 'Patrimônio aplicado', flex: 1.1 },
    { key: 'investorsCount', label: 'Investidores', flex: 0.7 },
    { key: 'status', label: 'Status', flex: 0.8, render: (row) => <StatusBadge label={row.status} tone={row.status === 'Ativo' ? 'success' : 'neutral'} /> },
  ];

  const maturityColumns = [
    { key: 'date', label: 'Data', flex: 0.9 },
    { key: 'client', label: 'Cliente', flex: 1.2 },
    { key: 'product', label: 'Produto', flex: 1.4 },
    { key: 'estimatedValue', label: 'Valor estimado', flex: 1 },
    { key: 'daysLeft', label: 'Dias restantes', flex: 0.9 },
    { key: 'status', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.status} tone={MATURITY_STATUS_TONE[row.status]} /> },
  ];

  let content;
  if (tab === 'overview' || tab === 'positions') {
    content = <AdminTable columns={positionColumns} onRowPress={(row) => setSelected({ kind: 'position', record: row })} rows={positions} selectedId={selected?.record.id} />;
  } else if (tab === 'applications') {
    content = <AdminTable columns={applicationColumns} onRowPress={(row) => setSelected({ kind: 'application', record: row })} rows={applications} selectedId={selected?.record.id} />;
  } else if (tab === 'redemptions') {
    content = <AdminTable columns={redemptionColumns} onRowPress={(row) => setSelected({ kind: 'redemption', record: row })} rows={redemptions} selectedId={selected?.record.id} />;
  } else if (tab === 'products') {
    content = <AdminTable columns={productColumns} rows={products} />;
  } else {
    content = <AdminTable columns={maturityColumns} rows={maturities} />;
  }

  const showDrawer = selected && ['overview', 'positions', 'applications', 'redemptions'].includes(tab);

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_INVESTMENTS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelected(null); }} options={ADMIN_INVESTMENT_TABS} />

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por cliente, CPF/CNPJ, produto ou ID da operação..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        {content}
        {showDrawer ? <RecordDrawer kind={selected.kind} onClose={() => setSelected(null)} record={selected.record} /> : null}
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
