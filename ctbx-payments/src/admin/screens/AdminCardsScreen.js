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
import {
  ADMIN_CARDS, ADMIN_CARDS_STATS, ADMIN_CARD_INVOICES, ADMIN_CARD_TABS, ADMIN_CARD_TRANSACTIONS,
  CARD_STATUS_TONE, INVOICE_STATUS_TONE, TRANSACTION_STATUS_TONE,
} from '../data/adminMockData';

const CARD_FILTER_TABS = new Set(['all', 'physical', 'virtual', 'active', 'blocked', 'cancelled']);
// Mesmo estilo de célula do AdminTable — só pra formatar "•••• 1234" sem
// nunca guardar/exibir o número completo do cartão em nenhum lugar do mock.
const maskedLastFour = (lastFour) => <Text numberOfLines={1} style={styles.maskedCell}>{`•••• ${lastFour}`}</Text>;

function CardDrawer({ card, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={card.id}>
      <DetailSection title="Cliente">
        <DetailRow label="Cliente" value={card.client} />
        <DetailRow label="CPF/CNPJ" value={card.document} />
      </DetailSection>
      <DetailSection title="Cartão">
        <DetailRow label="Tipo" value={card.typeLabel} />
        <DetailRow label="Final do cartão" value={`•••• ${card.lastFour}`} />
        <DetailRow label="Bandeira" value={card.brand} />
        <DetailRow label="Data de emissão" value={card.issuedAt} />
        <DetailRow label="Status" value={card.statusLabel} />
      </DetailSection>
      <DetailSection title="Limites">
        <DetailRow label="Limite total" value={card.limitTotal} />
        <DetailRow label="Limite disponível" value={card.limitAvailable} />
        <DetailRow label="Limite utilizado" value={card.limitUsed} />
      </DetailSection>
      <DetailSection title="Fatura">
        <DetailRow label="Vencimento da fatura" value={card.invoiceDueDate} />
        <DetailRow label="Melhor dia de compra" value={card.bestPurchaseDay} />
      </DetailSection>
      <DetailSection title="Histórico/Timeline">
        <DetailTimeline steps={card.timeline} />
      </DetailSection>
    </DetailDrawer>
  );
}

function InvoiceDrawer({ invoice, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={invoice.id}>
      <DetailSection title="Fatura">
        <DetailRow label="Cliente" value={invoice.client} />
        <DetailRow label="Final do cartão" value={`•••• ${invoice.lastFour}`} />
        <DetailRow label="Competência" value={invoice.competence} />
        <DetailRow label="Status" value={invoice.statusLabel} />
      </DetailSection>
      <DetailSection title="Valores">
        <DetailRow label="Valor total" value={invoice.totalValue} />
        <DetailRow label="Pagamento mínimo" value={invoice.minPayment} />
        <DetailRow label="Vencimento" value={invoice.dueDate} />
        <DetailRow label="Pagamento realizado" value={invoice.paidValue} />
        <DetailRow label="Saldo restante" value={invoice.remainingBalance} />
      </DetailSection>
      <DetailSection title="Histórico/Timeline">
        <DetailTimeline steps={invoice.timeline} />
      </DetailSection>
    </DetailDrawer>
  );
}

export default function AdminCardsScreen() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const matches = (fields) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return fields.some((field) => (field || '').toLowerCase().includes(q));
  };

  const filteredCards = useMemo(() => {
    if (!CARD_FILTER_TABS.has(tab)) return [];
    return ADMIN_CARDS.filter((card) => {
      if (tab === 'physical' && card.type !== 'physical') return false;
      if (tab === 'virtual' && card.type !== 'virtual') return false;
      if (tab === 'active' && card.statusKey !== 'active') return false;
      if (tab === 'blocked' && card.statusKey !== 'blocked' && card.statusKey !== 'temp_blocked') return false;
      if (tab === 'cancelled' && card.statusKey !== 'cancelled') return false;
      return matches([card.client, card.document, card.lastFour, card.id]);
    });
  }, [tab, query]);

  const filteredInvoices = useMemo(() => ADMIN_CARD_INVOICES.filter((invoice) => matches([invoice.client, invoice.lastFour, invoice.id])), [query]);
  const filteredTransactions = useMemo(() => ADMIN_CARD_TRANSACTIONS.filter((tx) => matches([tx.client, tx.lastFour, tx.merchant, tx.id])), [query]);

  const cardColumns = [
    { key: 'client', label: 'Cliente', flex: 1.5 },
    { key: 'typeLabel', label: 'Tipo', flex: 0.8 },
    { key: 'lastFour', label: 'Final', flex: 0.6, render: (row) => maskedLastFour(row.lastFour) },
    { key: 'brand', label: 'Bandeira', flex: 0.9 },
    { key: 'limitTotal', label: 'Limite', flex: 1 },
    { key: 'limitAvailable', label: 'Disponível', flex: 1 },
    { key: 'statusLabel', label: 'Status', flex: 1.1, render: (row) => <StatusBadge label={row.statusLabel} tone={CARD_STATUS_TONE[row.statusKey]} /> },
    { key: 'invoiceDueDate', label: 'Venc. fatura', flex: 0.9 },
  ];

  const invoiceColumns = [
    { key: 'client', label: 'Cliente', flex: 1.4 },
    { key: 'lastFour', label: 'Final', flex: 0.6, render: (row) => maskedLastFour(row.lastFour) },
    { key: 'competence', label: 'Competência', flex: 0.9 },
    { key: 'invoiceValue', label: 'Valor da fatura', flex: 1 },
    { key: 'minPayment', label: 'Pagamento mínimo', flex: 1 },
    { key: 'dueDate', label: 'Vencimento', flex: 0.9 },
    { key: 'statusLabel', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.statusLabel} tone={INVOICE_STATUS_TONE[row.statusKey]} /> },
  ];

  const transactionColumns = [
    { key: 'occurredAt', label: 'Data/Hora', flex: 1.2 },
    { key: 'client', label: 'Cliente', flex: 1.2 },
    { key: 'lastFour', label: 'Final', flex: 0.6, render: (row) => maskedLastFour(row.lastFour) },
    { key: 'merchant', label: 'Estabelecimento', flex: 1.3 },
    { key: 'category', label: 'Categoria', flex: 0.9 },
    { key: 'value', label: 'Valor', flex: 0.8 },
    { key: 'typeLabel', label: 'Tipo', flex: 0.8 },
    { key: 'statusLabel', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.statusLabel} tone={TRANSACTION_STATUS_TONE[row.statusKey]} /> },
  ];

  let content;
  if (tab === 'invoices') {
    content = <AdminTable columns={invoiceColumns} onRowPress={setSelectedInvoice} rows={filteredInvoices} selectedId={selectedInvoice?.id} />;
  } else if (tab === 'transactions') {
    content = <AdminTable columns={transactionColumns} rows={filteredTransactions} />;
  } else {
    content = <AdminTable columns={cardColumns} onRowPress={setSelectedCard} rows={filteredCards} selectedId={selectedCard?.id} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_CARDS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelectedCard(null); setSelectedInvoice(null); }} options={ADMIN_CARD_TABS} />

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por nome, CPF/CNPJ, final do cartão, ID do cartão ou da transação..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        {content}
        {tab !== 'transactions' && tab !== 'invoices' && selectedCard ? <CardDrawer card={selectedCard} onClose={() => setSelectedCard(null)} /> : null}
        {tab === 'invoices' && selectedInvoice ? <InvoiceDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { maxWidth: 480 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 420 },
  maskedCell: { ...typography.body, color: adminColors.textSecondary },
});
