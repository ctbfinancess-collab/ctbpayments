import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import { ADMIN_PAYMENTS, ADMIN_PAYMENTS_STATS, ADMIN_PAYMENT_TABS } from '../data/adminMockData';

const STATUS_TONE = { completed: 'success', scheduled: 'info', pending: 'warning', failed: 'danger', cancelled: 'neutral' };

export default function AdminPaymentsScreen() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_PAYMENTS.filter((payment) => {
      if (tab === 'boleto' && payment.type !== 'boleto') return false;
      if (tab === 'bill' && payment.type !== 'consumption' && payment.type !== 'convenio') return false;
      if (['scheduled', 'completed', 'pending', 'failed', 'cancelled'].includes(tab) && payment.statusKey !== tab) return false;
      if (!q) return true;
      return [payment.client, payment.document, payment.identifier, payment.id, payment.payee].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [tab, query]);

  const columns = [
    { key: 'occurredAt', label: 'Data/Hora', flex: 1.2 },
    { key: 'client', label: 'Cliente', flex: 1.2 },
    { key: 'typeLabel', label: 'Tipo', flex: 1 },
    { key: 'payee', label: 'Favorecido', flex: 1.3 },
    { key: 'identifier', label: 'Identificador', flex: 1.4 },
    { key: 'value', label: 'Valor', flex: 0.8 },
    { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={STATUS_TONE[row.statusKey]} /> },
    { key: 'id', label: 'ID do pagamento', flex: 1.1 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_PAYMENTS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelected(null); }} options={ADMIN_PAYMENT_TABS} />

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por nome, CPF/CNPJ, código de barras, ID do pagamento ou favorecido..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        <AdminTable columns={columns} onRowPress={setSelected} rows={filtered} selectedId={selected?.id} />
        {selected ? (
          <DetailDrawer onClose={() => setSelected(null)} title={selected.id}>
            <DetailSection title="Pagamento">
              <DetailRow label="Data/hora" value={selected.occurredAt} />
              <DetailRow label="Tipo" value={selected.typeLabel} />
              <DetailRow label="Status" value={selected.statusLabel} />
              <DetailRow label="Descrição" value={selected.description} />
            </DetailSection>
            <DetailSection title="Cliente">
              <DetailRow label="Nome" value={selected.client} />
              <DetailRow label="CPF/CNPJ" value={selected.document} />
            </DetailSection>
            <DetailSection title="Favorecido">
              <DetailRow label="Favorecido" value={selected.payee} />
              <DetailRow label="Código de barras / identificador" value={selected.identifier} />
            </DetailSection>
            <DetailSection title="Valores e datas">
              <DetailRow label="Valor" value={selected.value} />
              <DetailRow label="Tarifa" value={selected.fee} />
              <DetailRow label="Valor total" value={selected.totalValue} />
              <DetailRow label="Data de vencimento" value={selected.dueDate} />
              <DetailRow label="Data de pagamento" value={selected.paymentDate} />
            </DetailSection>
            {selected.errorMessage ? (
              <DetailSection title="Erro">
                <Text style={styles.errorText}>{selected.errorMessage}</Text>
              </DetailSection>
            ) : null}
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
  errorText: { ...typography.body, color: adminColors.danger },
});
