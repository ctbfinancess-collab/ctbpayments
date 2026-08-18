import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/ui';
import { appMode } from '../../config';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

export default function AdminTopbar({ title }) {
  return (
    <View style={styles.topbar}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.searchBox}>
        <Icon color={adminColors.textMuted} name="search-outline" size={16} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar por transação, cliente, chave PIX..."
          placeholderTextColor={adminColors.textMuted}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.envBadge}>
        <Text style={styles.envBadgeText}>Ambiente: {appMode}</Text>
      </View>
      <View style={styles.actions}>
        <Icon color={adminColors.textSecondary} name="notifications-outline" size={20} />
        <Icon color={adminColors.textSecondary} name="help-circle-outline" size={20} style={styles.actionSpacing} />
        <View style={[styles.actionSpacing, styles.avatarGroup]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>EB</Text></View>
          <View>
            <Text style={styles.userName}>Elma Bichara</Text>
            <Text style={styles.userRole}>Administrador</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { alignItems: 'center', backgroundColor: adminColors.topbar, borderBottomColor: adminColors.border, borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: spacing.xl, height: 64 },
  title: { ...typography.heading3, color: adminColors.textPrimary, marginRight: spacing.xl },
  searchBox: { alignItems: 'center', backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.md, borderWidth: 1, flex: 1, flexDirection: 'row', maxWidth: 420, paddingHorizontal: spacing.md },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { ...typography.body, color: adminColors.textPrimary, flex: 1, paddingVertical: spacing.sm },
  envBadge: { backgroundColor: adminColors.warningSoft, borderColor: 'rgba(234, 179, 8, 0.4)', borderRadius: radii.pill, borderWidth: 1, marginLeft: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  envBadgeText: { ...typography.label, color: adminColors.warning, letterSpacing: 0.5 },
  actions: { alignItems: 'center', flexDirection: 'row', marginLeft: spacing.lg },
  actionSpacing: { marginLeft: spacing.lg },
  avatarGroup: { alignItems: 'center', flexDirection: 'row' },
  avatar: { alignItems: 'center', backgroundColor: adminColors.accentPurple, borderRadius: radii.pill, height: 32, justifyContent: 'center', marginRight: spacing.sm, width: 32 },
  avatarText: { ...typography.label, color: '#FFFFFF' },
  userName: { ...typography.bodyMedium, color: adminColors.textPrimary },
  userRole: { ...typography.caption, color: adminColors.textMuted },
});
