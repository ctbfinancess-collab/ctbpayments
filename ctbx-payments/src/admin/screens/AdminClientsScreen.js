import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import DetailDrawer, { DetailRow, DetailSection } from '../components/DetailDrawer';
import StatusBadge from '../components/StatusBadge';
import adminColors from '../theme/adminColors';
import { spacing, typography } from '../../theme';
import { ADMIN_CLIENTS } from '../data/adminMockData';

const STATUS_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'Ativo', label: 'Ativos' },
  { id: 'Inativo', label: 'Inativos' },
  { id: 'Bloqueado', label: 'Bloqueados' },
];

const TYPE_TABS = [
  { id: 'all', label: 'PF e PJ' },
  { id: 'PF', label: 'Pessoa física' },
  { id: 'PJ', label: 'Pessoa jurídica' },
];

const STATUS_TONE = { Ativo: 'success', Inativo: 'neutral', Bloqueado: 'danger' };
const KYC_TONE = { Aprovado: 'success', 'Em análise': 'warning', Pendente: 'warning', Recusado: 'danger' };

export default function AdminClientsScreen() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_CLIENTS.filter((client) => {
      if (statusFilter !== 'all' && client.status !== statusFilter) return false;
      if (typeFilter !== 'all' && client.type !== typeFilter) return false;
      if (q && !client.name.toLowerCase().includes(q) && !client.document.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, statusFilter, typeFilter]);

  const columns = [
    { key: 'name', label: 'Nome', flex: 2 },
    { key: 'document', label: 'CPF/CNPJ', flex: 1.4 },
    { key: 'type', label: 'Tipo', flex: 0.7 },
    { key: 'account', label: 'Conta', flex: 1.3 },
    { key: 'status', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.status} tone={STATUS_TONE[row.status]} /> },
    { key: 'kycStatus', label: 'KYC', flex: 1, render: (row) => <StatusBadge label={row.kycStatus} tone={KYC_TONE[row.kycStatus]} /> },
    { key: 'balance', label: 'Saldo', flex: 1.2 },
    { key: 'createdAt', label: 'Cadastro', flex: 1 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.filtersRow}>
        <AdminSearchInput onChangeText={setQuery} placeholder="Buscar por nome ou CPF/CNPJ..." style={styles.search} value={query} />
      </View>
      <View style={styles.chipsRow}>
        <AdminChipGroup activeId={statusFilter} onSelect={setStatusFilter} options={STATUS_TABS} />
        <AdminChipGroup activeId={typeFilter} onSelect={setTypeFilter} options={TYPE_TABS} />
      </View>
      <View style={styles.body}>
        <AdminTable columns={columns} onRowPress={setSelected} rows={filtered} selectedId={selected?.id} />
        {selected ? (
          <DetailDrawer onClose={() => setSelected(null)} title={selected.name}>
            <DetailSection title="Dados cadastrais">
              <DetailRow label="Nome" value={selected.name} />
              <DetailRow label="CPF/CNPJ" value={selected.document} />
              <DetailRow label="Tipo" value={selected.type === 'PF' ? 'Pessoa física' : 'Pessoa jurídica'} />
              <DetailRow label="Conta" value={selected.account} />
              <DetailRow label="Cadastrado em" value={selected.createdAt} />
            </DetailSection>
            <DetailSection title="Situação">
              <DetailRow label="Status da conta" value={selected.status} />
              <DetailRow label="Status KYC" value={selected.kycStatus} />
              <DetailRow label="Saldo" value={selected.balance} />
            </DetailSection>
            <Text style={styles.mockNote}>Dados estruturais SANDBOX — nenhum dado real de cliente.</Text>
          </DetailDrawer>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  filtersRow: { flexDirection: 'row' },
  search: { flex: 1 },
  chipsRow: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 480 },
  mockNote: { ...typography.caption, color: adminColors.textMuted, marginTop: spacing.md },
});
