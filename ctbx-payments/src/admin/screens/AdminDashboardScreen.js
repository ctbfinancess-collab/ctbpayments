import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import { ADMIN_ALERTS, ADMIN_DASHBOARD_STATS, ADMIN_RECENT_ACTIVITY, ADMIN_RECENT_TRANSACTIONS } from '../data/adminMockData';

const STATUS_STYLE = {
  'Concluído': { color: adminColors.success, background: adminColors.successSoft },
  'Em processamento': { color: adminColors.warning, background: adminColors.warningSoft },
  'Falha': { color: adminColors.danger, background: adminColors.dangerSoft },
};

const ALERT_STYLE = {
  warning: { color: adminColors.warning, icon: 'warning-outline' },
  danger: { color: adminColors.danger, icon: 'alert-circle-outline' },
  info: { color: adminColors.info, icon: 'information-circle-outline' },
};

function StatCard({ stat }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={styles.statIconWrap}><Icon color={adminColors.accentPurpleSoft} name={stat.icon} size={18} /></View>
        {stat.trend !== 'flat' ? <Text style={styles.statDelta}>{stat.delta}</Text> : null}
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );
}

function StatusPill({ status }) {
  const style = STATUS_STYLE[status] || { color: adminColors.textSecondary, background: adminColors.surfaceElevated };
  return (
    <View style={[styles.pill, { backgroundColor: style.background }]}>
      <Text style={[styles.pillText, { color: style.color }]}>{status}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_DASHBOARD_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <View style={styles.row}>
        <View style={[styles.panel, styles.panelWide]}>
          <Text style={styles.panelTitle}>Transações recentes</Text>
          {ADMIN_RECENT_TRANSACTIONS.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txMain}>
                <Text style={styles.txClient}>{tx.client}</Text>
                <Text style={styles.txMeta}>{tx.type} · {tx.at}</Text>
              </View>
              <Text style={[styles.txValue, tx.value.startsWith('-') && styles.txValueNegative]}>{tx.value}</Text>
              <StatusPill status={tx.status} />
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Alertas</Text>
          {ADMIN_ALERTS.map((alert) => {
            const style = ALERT_STYLE[alert.level] || ALERT_STYLE.info;
            return (
              <View key={alert.id} style={styles.alertRow}>
                <Icon color={style.color} name={style.icon} size={16} style={styles.alertIcon} />
                <Text style={styles.alertText}>{alert.message}</Text>
              </View>
            );
          })}

          <Text style={[styles.panelTitle, styles.panelTitleSpaced]}>Atividades administrativas recentes</Text>
          {ADMIN_RECENT_ACTIVITY.map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <Text style={styles.activityText}><Text style={styles.activityActor}>{activity.actor}</Text> {activity.action}</Text>
              <Text style={styles.activityAt}>{activity.at}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: 220, flexGrow: 1, padding: spacing.lg },
  statHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  statIconWrap: { alignItems: 'center', backgroundColor: adminColors.infoSoft, borderRadius: radii.sm, height: 32, justifyContent: 'center', width: 32 },
  statDelta: { ...typography.caption, color: adminColors.success },
  statValue: { ...typography.heading2, color: adminColors.textPrimary },
  statLabel: { ...typography.caption, color: adminColors.textSecondary, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  panel: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flex: 1, padding: spacing.lg },
  panelWide: { flex: 2 },
  panelTitle: { ...typography.heading3, color: adminColors.textPrimary, marginBottom: spacing.md },
  panelTitleSpaced: { marginTop: spacing.xl },
  txRow: { alignItems: 'center', borderTopColor: adminColors.border, borderTopWidth: 1, flexDirection: 'row', paddingVertical: spacing.sm },
  txMain: { flex: 1 },
  txClient: { ...typography.bodyMedium, color: adminColors.textPrimary },
  txMeta: { ...typography.caption, color: adminColors.textMuted, marginTop: 2 },
  txValue: { ...typography.bodyMedium, color: adminColors.success, marginRight: spacing.md },
  txValueNegative: { color: adminColors.textPrimary },
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  pillText: { ...typography.caption },
  alertRow: { flexDirection: 'row', marginBottom: spacing.sm },
  alertIcon: { marginRight: spacing.sm, marginTop: 2 },
  alertText: { ...typography.body, color: adminColors.textSecondary, flex: 1 },
  activityRow: { borderTopColor: adminColors.border, borderTopWidth: 1, paddingVertical: spacing.sm },
  activityText: { ...typography.body, color: adminColors.textSecondary },
  activityActor: { color: adminColors.textPrimary, fontFamily: typography.fontFamily.semibold },
  activityAt: { ...typography.caption, color: adminColors.textMuted, marginTop: 2 },
});
