import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

// Tabela genérica orientada a colunas — `columns: [{ key, label, flex,
// render(row) }]`. `render` é opcional; sem ele, mostra `row[column.key]`
// como texto. `onRowPress` é opcional (linha vira clicável quando presente).
export default function AdminTable({ columns, emptyMessage = 'Nenhum resultado encontrado.', onRowPress, rows, selectedId }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <Text key={column.key} numberOfLines={1} style={[styles.headerCell, { flex: column.flex || 1 }]}>{column.label}</Text>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ) : rows.map((row) => {
          const selected = row.id === selectedId;
          const RowWrapper = onRowPress ? TouchableOpacity : View;
          return (
            <RowWrapper
              activeOpacity={0.7}
              key={row.id}
              onPress={onRowPress ? () => onRowPress(row) : undefined}
              style={[styles.row, selected && styles.rowSelected]}
            >
              {columns.map((column) => (
                <View key={column.key} style={{ flex: column.flex || 1 }}>
                  {column.render ? column.render(row) : <Text numberOfLines={1} style={styles.cellText}>{row[column.key]}</Text>}
                </View>
              ))}
            </RowWrapper>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flex: 1, overflow: 'hidden' },
  headerRow: { backgroundColor: adminColors.surface, borderBottomColor: adminColors.border, borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  headerCell: { ...typography.label, color: adminColors.textMuted },
  row: { alignItems: 'center', borderTopColor: adminColors.border, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowSelected: { backgroundColor: adminColors.infoSoft },
  cellText: { ...typography.body, color: adminColors.textSecondary },
  empty: { ...typography.body, color: adminColors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
