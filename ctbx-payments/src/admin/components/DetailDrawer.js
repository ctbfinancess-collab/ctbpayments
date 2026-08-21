import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../components/ui';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

// Painel lateral de detalhes — fica dentro da própria tela (não é Modal),
// ao lado da tabela, então nunca sai da tela nem quebra o layout desktop.
export default function DetailDrawer({ children, onClose, title }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        <TouchableOpacity accessibilityLabel="Fechar detalhes" accessibilityRole="button" onPress={onClose}>
          <Icon color={adminColors.textMuted} name="close-outline" size={20} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

export function DetailRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

export function DetailSection({ children, title }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function DetailTimeline({ steps = [] }) {
  return (
    <View>
      {steps.map((step, index) => (
        <View key={step.label} style={styles.timelineRow}>
          <View style={styles.timelineMarkerColumn}>
            <View style={styles.timelineDot} />
            {index < steps.length - 1 ? <View style={styles.timelineLine} /> : null}
          </View>
          <View style={styles.timelineTextColumn}>
            <Text style={styles.timelineLabel}>{step.label}</Text>
            {step.at ? <Text style={styles.timelineAt}>{step.at}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, width: 360 },
  header: { alignItems: 'center', borderBottomColor: adminColors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  title: { ...typography.heading3, color: adminColors.textPrimary, flexShrink: 1, marginRight: spacing.md },
  content: { padding: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: adminColors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
  row: { borderTopColor: adminColors.border, borderTopWidth: 1, paddingVertical: spacing.sm },
  rowLabel: { ...typography.caption, color: adminColors.textMuted },
  rowValue: { ...typography.bodyMedium, color: adminColors.textPrimary, marginTop: 2 },
  timelineRow: { flexDirection: 'row' },
  timelineMarkerColumn: { alignItems: 'center', width: 20 },
  timelineDot: { backgroundColor: adminColors.success, borderRadius: radii.pill, height: 8, width: 8 },
  timelineLine: { backgroundColor: adminColors.border, flex: 1, marginVertical: 2, width: 1 },
  timelineTextColumn: { flex: 1, paddingBottom: spacing.md },
  timelineLabel: { ...typography.bodyMedium, color: adminColors.textPrimary },
  timelineAt: { ...typography.caption, color: adminColors.textMuted, marginTop: 2 },
});
