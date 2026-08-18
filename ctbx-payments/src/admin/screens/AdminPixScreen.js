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
import { ADMIN_PIX_KEYS, ADMIN_PIX_STATS, ADMIN_PIX_TABS, ADMIN_PIX_TRANSACTIONS } from '../data/adminMockData';

const STATUS_TONE = { completed: 'success', pending: 'warning', failed: 'danger' };
const KEY_STATUS_TONE = { Ativa: 'success', Bloqueada: 'danger' };

function PixTransactionsTable({ onSelect, rows, selectedId }) {
  const columns = [
    { key: 'occurredAt', label: 'Data/hora', flex: 1.2 },
    { key: 'client', label: 'Cliente', flex: 1.4 },
    { key: 'typeLabel', label: 'Tipo', flex: 0.9 },
    { key: 'value', label: 'Valor', flex: 1 },
    { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={STATUS_TONE[row.status]} /> },
    { key: 'endToEndId', label: 'End-to-End ID', flex: 1.6 },
  ];
  return <AdminTable columns={columns} onRowPress={onSelect} rows={rows} selectedId={selectedId} />;
}

function PixKeysTable({ rows }) {
  const columns = [
    { key: 'owner', label: 'Titular', flex: 1.4 },
    { key: 'type', label: 'Tipo', flex: 0.9 },
    { key: 'value', label: 'Chave', flex: 1.6 },
    { key: 'createdAt', label: 'Criada em', flex: 0.9 },
    { key: 'status', label: 'Status', flex: 0.8, render: (row) => <StatusBadge label={row.status} tone={KEY_STATUS_TONE[row.status]} /> },
  ];
  return <AdminTable columns={columns} rows={rows} />;
}

function QrCodesPlaceholder() {
  return (
    <View style={styles.qrEmpty}>
      <Text style={styles.qrEmptyTitle}>Nenhum QR Code gerado neste ambiente</Text>
      <Text style={styles.qrEmptyText}>Esta seção lista os QR Codes estáticos e dinâmicos gerados pelos clientes — ainda não há dado estrutural suficiente pra popular aqui além do mock de transações.</Text>
    </View>
  );
}

export default function AdminPixScreen() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_PIX_TRANSACTIONS.filter((tx) => {
      if (tab !== 'all' && tab !== 'keys' && tab !== 'qr' && tx.type !== tab) return false;
      if (!q) return true;
      return [tx.client, tx.payerDocument, tx.payeeDocument, tx.endToEndId, tx.txId, tx.key].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [tab, query]);

  const filteredKeys = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_PIX_KEYS;
    return ADMIN_PIX_KEYS.filter((key) => [key.owner, key.value].some((field) => field.toLowerCase().includes(q)));
  }, [query]);

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_PIX_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelected(null); }} options={ADMIN_PIX_TABS} />

      {tab !== 'qr' ? (
        <AdminSearchInput
          onChangeText={setQuery}
          placeholder="Buscar por nome, CPF/CNPJ, EndToEndId, TxId ou chave PIX..."
          style={styles.search}
          value={query}
        />
      ) : null}

      <View style={styles.body}>
        {tab === 'qr' ? <QrCodesPlaceholder /> : tab === 'keys' ? <PixKeysTable rows={filteredKeys} /> : (
          <>
            <PixTransactionsTable onSelect={setSelected} rows={filteredTransactions} selectedId={selected?.id} />
            {selected ? (
              <DetailDrawer onClose={() => setSelected(null)} title={selected.id}>
                <DetailSection title="Transação">
                  <DetailRow label="Valor" value={selected.value} />
                  <DetailRow label="Status" value={selected.statusLabel} />
                  <DetailRow label="Data/hora" value={selected.occurredAt} />
                  <DetailRow label="Descrição" value={selected.description} />
                  <DetailRow label="Origem" value={selected.origin} />
                </DetailSection>
                <DetailSection title="Pagador">
                  <DetailRow label="Nome" value={selected.payer} />
                  <DetailRow label="CPF/CNPJ" value={selected.payerDocument} />
                </DetailSection>
                <DetailSection title="Recebedor">
                  <DetailRow label="Nome" value={selected.payee} />
                  <DetailRow label="CPF/CNPJ" value={selected.payeeDocument} />
                </DetailSection>
                <DetailSection title="Identificadores">
                  <DetailRow label="End-to-End ID" value={selected.endToEndId} />
                  <DetailRow label="TxId" value={selected.txId} />
                </DetailSection>
                {selected.errorMessage ? (
                  <DetailSection title="Erro">
                    <Text style={styles.errorText}>{selected.errorMessage}</Text>
                  </DetailSection>
                ) : null}
                <DetailSection title="Timeline da transação">
                  <DetailTimeline steps={selected.timeline} />
                </DetailSection>
              </DetailDrawer>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { maxWidth: 480 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 420 },
  qrEmpty: { alignItems: 'flex-start', backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flex: 1, padding: spacing.xxl },
  qrEmptyTitle: { ...typography.heading3, color: adminColors.textPrimary, marginBottom: spacing.sm },
  qrEmptyText: { ...typography.body, color: adminColors.textSecondary, maxWidth: 480 },
  errorText: { ...typography.body, color: adminColors.danger },
});
