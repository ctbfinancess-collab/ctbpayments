import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, shadows, spacing, typography } from '../../theme';

export const DEFAULT_TABS = [
  { key: 'home', label: 'Início' },
  { key: 'cards', label: 'Cartões' },
  { key: 'services', label: 'Serviços' },
  { key: 'pix', label: 'Pix' },
  { key: 'profile', label: 'Perfil' },
];

export default function BottomTabBar({ activeKey = 'home', onTabPress, renderIcon, tabs = DEFAULT_TABS }) {
  return (
    <View style={[styles.container, shadows.card]}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity key={tab.key} activeOpacity={0.72} onPress={() => onTabPress?.(tab)} style={styles.item}>
            <View style={[styles.iconArea, active && styles.iconAreaActive]}>
              {renderIcon ? renderIcon(tab, active) : <Text style={[styles.fallbackIcon, active && styles.activeText]}>○</Text>}
            </View>
            <Text style={[styles.label, active && styles.activeText]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: colors.navy900, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', minHeight: 70, paddingBottom: spacing.xs, paddingTop: spacing.sm },
  item: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  iconArea: { alignItems: 'center', borderRadius: 14, height: 30, justifyContent: 'center', marginBottom: spacing.xs, minWidth: 38 },
  iconAreaActive: { backgroundColor: 'rgba(94, 107, 255, 0.16)' },
  fallbackIcon: { color: colors.slate300, fontSize: 18 },
  label: { ...typography.caption, color: colors.slate300 },
  activeText: { color: colors.purple400, fontWeight: '700' },
});
