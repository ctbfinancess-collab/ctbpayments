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
import {
  ADMIN_REPORTS, ADMIN_REPORTS_STATS, ADMIN_REPORT_TABS, ADMIN_REPORT_STATUS_TABS,
  ADMIN_REPORT_PERSON_TABS, ADMIN_REPORT_PERIOD_TABS, ADMIN_REPORT_PERIOD_SUMMARY_BY_CATEGORY, REPORT_STATUS_TONE,
} from '../data/adminMockData';

// Tela somente leitura: relatórios gerados (mock) e resumo comparativo por
// período. Nenhum botão aqui produz download, exportação ou geração real de
// arquivo — "PDF"/"CSV"/"XLSX" no drawer são apenas indicadores visuais do
// formato do relatório mock, desabilitados.
const EXPORT_FORMATS = ['PDF', 'CSV', 'XLSX'];

function ReportDrawer({ onClose, report }) {
  return (
    <DetailDrawer onClose={onClose} title={report.id}>
      <DetailSection title="Relatório">
        <DetailRow label="Tipo" value={report.type} />
        <DetailRow label="Categoria" value={report.categoryLabel} />
        <DetailRow label="Período" value={report.periodLabel} />
        <DetailRow label="Formato" value={report.format} />
      </DetailSection>
      <DetailSection title="Filtros aplicados">
        <DetailRow label="Segmento" value={report.personLabel} />
        <DetailRow label="Status" value={report.statusLabel} />
      </DetailSection>
      <DetailSection title="Geração">
        <DetailRow label="Solicitado em" value={report.requestedAt} />
        <DetailRow label="Solicitado por" value={report.requestedBy} />
        <DetailRow label="Disponível em" value={report.generatedAt} />
        <DetailRow label="Tamanho do arquivo" value={report.fileSize} />
      </DetailSection>
      <DetailSection title="Exportar">
        <View style={styles.exportRow}>
          {EXPORT_FORMATS.map((format) => (
            <View key={format} style={styles.exportPill}>
              <Text style={styles.exportPillText}>{format}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.exportNote}>Exportação estrutural — nenhum download real é gerado neste ambiente.</Text>
      </DetailSection>
      <DetailSection title="Histórico/Timeline">
        <DetailTimeline steps={report.timeline} />
      </DetailSection>
    </DetailDrawer>
  );
}

export default function AdminReportsScreen() {
  const [categoryTab, setCategoryTab] = useState('overview');
  const [statusTab, setStatusTab] = useState('all');
  const [personTab, setPersonTab] = useState('all');
  const [periodTab, setPeriodTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_REPORTS.filter((report) => {
      if (categoryTab !== 'overview' && report.categoryKey !== categoryTab) return false;
      if (statusTab !== 'all' && report.statusKey !== statusTab) return false;
      if (personTab !== 'all' && report.personKey !== personTab) return false;
      if (periodTab !== 'all' && report.periodKey !== periodTab) return false;
      if (!q) return true;
      return [report.type, report.categoryLabel, report.id, report.requestedBy].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [categoryTab, statusTab, personTab, periodTab, query]);

  const reportColumns = [
    { key: 'requestedAt', label: 'Data/Hora', flex: 1.2 },
    { key: 'type', label: 'Tipo de relatório', flex: 1.7 },
    { key: 'periodLabel', label: 'Período', flex: 1 },
    { key: 'format', label: 'Formato', flex: 0.7 },
    { key: 'requestedBy', label: 'Solicitado por', flex: 1.4 },
    { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={REPORT_STATUS_TONE[row.statusKey]} /> },
    { key: 'id', label: 'ID do relatório', flex: 1 },
  ];

  const summaryColumns = [
    { key: 'indicator', label: 'Indicador', flex: 1.6 },
    { key: 'today', label: 'Hoje', flex: 1 },
    { key: 'last7d', label: 'Últimos 7 dias', flex: 1 },
    { key: 'month', label: 'Mês atual', flex: 1 },
    { key: 'lastMonth', label: 'Mês anterior', flex: 1 },
    { key: 'variation', label: 'Variação', flex: 0.8, render: (row) => <Text style={[styles.variation, row.trend === 'down' && styles.variationDown]}>{row.variation}</Text> },
  ];

  // O resumo por período reage à aba de categoria — cada categoria tem seu
  // próprio conjunto de indicadores; 'overview' mostra a visão consolidada.
  const activeCategory = ADMIN_REPORT_TABS.find((tab) => tab.id === categoryTab);
  const periodSummary = ADMIN_REPORT_PERIOD_SUMMARY_BY_CATEGORY[categoryTab] || ADMIN_REPORT_PERIOD_SUMMARY_BY_CATEGORY.overview;

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_REPORTS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup
        activeId={categoryTab}
        onSelect={(id) => {
          // Trocar de categoria reseta os demais filtros — evita que um filtro
          // deixado de uma aba anterior esvazie a próxima aba selecionada.
          setCategoryTab(id);
          setStatusTab('all');
          setPersonTab('all');
          setPeriodTab('all');
          setQuery('');
          setSelectedReport(null);
        }}
        options={ADMIN_REPORT_TABS}
      />
      <View style={styles.filtersRow}>
        <AdminChipGroup activeId={statusTab} onSelect={setStatusTab} options={ADMIN_REPORT_STATUS_TABS} />
        <AdminChipGroup activeId={personTab} onSelect={setPersonTab} options={ADMIN_REPORT_PERSON_TABS} />
        <AdminChipGroup activeId={periodTab} onSelect={setPeriodTab} options={ADMIN_REPORT_PERIOD_TABS} />
      </View>

      <AdminSearchInput
        onChangeText={setQuery}
        placeholder="Buscar por tipo de relatório, categoria, ID ou solicitante..."
        style={styles.search}
        value={query}
      />

      <View style={styles.body}>
        <AdminTable columns={reportColumns} emptyMessage="Nenhum relatório encontrado para os filtros selecionados." onRowPress={setSelectedReport} rows={filteredReports} selectedId={selectedReport?.id} />
        {selectedReport ? <ReportDrawer onClose={() => setSelectedReport(null)} report={selectedReport} /> : null}
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Resumo por período — {activeCategory?.label || 'Visão geral'}</Text>
        <AdminTable columns={summaryColumns} rows={periodSummary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { maxWidth: 480 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 420 },
  summarySection: { gap: spacing.sm, minHeight: 340 },
  summaryTitle: { ...typography.heading3, color: adminColors.textPrimary },
  variation: { ...typography.bodyMedium, color: adminColors.success },
  variationDown: { color: adminColors.danger },
  exportRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  exportPill: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.pill, borderWidth: 1, opacity: 0.5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  exportPillText: { ...typography.label, color: adminColors.textMuted },
  exportNote: { ...typography.caption, color: adminColors.textMuted },
});
