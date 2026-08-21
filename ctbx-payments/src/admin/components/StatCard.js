import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

// Card de estatística reutilizável (mesmo visual do Dashboard aprovado,
// extraído aqui para as novas telas — o Dashboard em si não foi tocado).
export default function StatCard({ stat }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={styles.statIconWrap}><Icon color={adminColors.accentPurpleSoft} name={stat.icon} size={18} /></View>
        {stat.trend && stat.trend !== 'flat' ? <Text style={styles.statDelta}>{stat.delta}</Text> : null}
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: 200, flexGrow: 1, padding: spacing.lg },
  statHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  statIconWrap: { alignItems: 'center', backgroundColor: adminColors.infoSoft, borderRadius: radii.sm, height: 32, justifyContent: 'center', width: 32 },
  statDelta: { ...typography.caption, color: adminColors.success },
  statValue: { ...typography.heading2, color: adminColors.textPrimary },
  statLabel: { ...typography.caption, color: adminColors.textSecondary, marginTop: spacing.xs },
});
