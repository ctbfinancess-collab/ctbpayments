import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import { ADMIN_KYC_REQUESTS, ADMIN_KYC_TABS } from '../data/adminMockData';

const STATUS_TONE = { pending: 'warning', in_review: 'info', approved: 'success', rejected: 'danger' };

export default function AdminComplianceScreen() {
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => ADMIN_KYC_REQUESTS.filter((item) => item.status === tab), [tab]);

  const columns = [
    { key: 'client', label: 'Cliente', flex: 1.6 },
    { key: 'document', label: 'CPF/CNPJ', flex: 1.3 },
    { key: 'type', label: 'PF/PJ', flex: 0.6 },
    { key: 'requestedAt', label: 'Data da solicitação', flex: 1.1 },
    { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={STATUS_TONE[row.status]} /> },
    { key: 'reviewer', label: 'Responsável pela análise', flex: 1.3 },
  ];

  return (
    <View style={styles.wrap}>
      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelected(null); }} options={ADMIN_KYC_TABS} />
      <View style={styles.body}>
        <AdminTable columns={columns} emptyMessage="Nenhuma solicitação nesta categoria." onRowPress={setSelected} rows={filtered} selectedId={selected?.id} />
        {selected ? (
          <DetailDrawer onClose={() => setSelected(null)} title={selected.client}>
            <DetailSection title="Dados cadastrais">
              <DetailRow label="Nome" value={selected.registration.name} />
              <DetailRow label="CPF/CNPJ" value={selected.registration.document} />
              {selected.type === 'PF' ? <DetailRow label="Data de nascimento" value={selected.registration.birthDate} /> : null}
              <DetailRow label="Telefone" value={selected.registration.phone} />
              <DetailRow label="E-mail" value={selected.registration.email} />
              <DetailRow label="Endereço" value={selected.registration.address} />
            </DetailSection>
            <DetailSection title="Status da verificação">
              <DetailRow label="Status" value={selected.statusLabel} />
              <DetailRow label="Responsável pela análise" value={selected.reviewer} />
            </DetailSection>
            <DetailSection title="Documentos">
              {selected.documents.map((doc) => (
                <View key={doc} style={styles.docRow}>
                  <Icon color={adminColors.textMuted} name="document-outline" size={16} style={styles.docIcon} />
                  <Text style={styles.docText}>{doc}</Text>
                </View>
              ))}
              <Text style={styles.docNote}>Placeholders — nenhum arquivo real anexado neste ambiente.</Text>
            </DetailSection>
            <DetailSection title="Histórico">
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
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 480 },
  docRow: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.sm },
  docIcon: { marginRight: spacing.sm },
  docText: { ...typography.body, color: adminColors.textSecondary },
  docNote: { ...typography.caption, color: adminColors.textMuted, marginTop: spacing.xs },
});
