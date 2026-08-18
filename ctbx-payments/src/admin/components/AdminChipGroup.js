import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

// Grupo horizontal de chips — usado tanto para filtros (status/tipo) quanto
// para abas de seção (ex.: PIX: Todas/Enviadas/Recebidas...). Ativo = borda +
// leve preenchimento de acento, seguindo o mesmo princípio já usado no resto
// do app (aba ativa nunca é preenchimento sólido).
export default function AdminChipGroup({ activeId, onSelect, options }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      {options.map((option) => {
        const active = option.id === activeId;
        return (
          <TouchableOpacity
            activeOpacity={0.75}
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  chip: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.pill, borderWidth: 1, marginRight: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipActive: { backgroundColor: adminColors.infoSoft, borderColor: 'rgba(119, 105, 232, 0.45)' },
  chipText: { ...typography.label, color: adminColors.textSecondary },
  chipTextActive: { color: adminColors.textPrimary },
});
