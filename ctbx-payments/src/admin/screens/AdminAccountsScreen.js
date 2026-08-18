import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import { spacing } from '../../theme';
import { ADMIN_ACCOUNTS } from '../data/adminMockData';

const STATUS_TABS = [
  { id: 'all', label: 'Todos os status' },
  { id: 'Ativa', label: 'Ativas' },
  { id: 'Bloqueada', label: 'Bloqueadas' },
  { id: 'Encerrada', label: 'Encerradas' },
];

const TYPE_TABS = [
  { id: 'all', label: 'Todos os tipos' },
  { id: 'Conta Corrente', label: 'Conta Corrente' },
  { id: 'Conta PJ', label: 'Conta PJ' },
];

const STATUS_TONE = { Ativa: 'success', Bloqueada: 'danger', Encerrada: 'neutral' };

export default function AdminAccountsScreen() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => ADMIN_ACCOUNTS.filter((account) => {
    if (statusFilter !== 'all' && account.status !== statusFilter) return false;
    if (typeFilter !== 'all' && account.type !== typeFilter) return false;
    return true;
  }), [statusFilter, typeFilter]);

  const columns = [
    { key: 'number', label: 'Número da conta', flex: 1.3 },
    { key: 'holder', label: 'Titular', flex: 1.6 },
    { key: 'document', label: 'CPF/CNPJ', flex: 1.3 },
    { key: 'type', label: 'Tipo', flex: 1 },
    { key: 'balance', label: 'Saldo', flex: 1.1 },
    { key: 'status', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.status} tone={STATUS_TONE[row.status]} /> },
    { key: 'openedAt', label: 'Abertura', flex: 0.9 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.chipsRow}>
        <AdminChipGroup activeId={statusFilter} onSelect={setStatusFilter} options={STATUS_TABS} />
        <AdminChipGroup activeId={typeFilter} onSelect={setTypeFilter} options={TYPE_TABS} />
      </View>
      <View style={styles.body}>
        <AdminTable columns={columns} rows={filtered} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  chipsRow: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, minHeight: 480 },
});
