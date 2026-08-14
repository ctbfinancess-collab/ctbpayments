import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, shadows, spacing, typography } from '../../theme';
import Icon from './Icon';

export const DEFAULT_TABS = [
  { key: 'home', label: 'Início' },
  { key: 'cards', label: 'Cartões' },
  { key: 'services', label: 'Serviços' },
  { key: 'pix', label: 'Pix' },
  { key: 'profile', label: 'Perfil' },
];

// [inativo, ativo] por chave de aba, na ordem de DEFAULT_TABS.
const TAB_ICONS = {
  home: ['home-outline', 'home'],
  cards: ['card-outline', 'card'],
  services: ['grid-outline', 'grid'],
  pix: ['flash-outline', 'flash'],
  profile: ['person-outline', 'person'],
};

function defaultRenderIcon(tab, active) {
  const names = TAB_ICONS[tab.key];
  if (!names) return <Text style={[styles.fallbackIcon, active && styles.activeText]}>○</Text>;
  return <Icon color={active ? colors.purple400 : colors.slate300} name={names[active ? 1 : 0]} size={20} />;
}

export default function BottomTabBar({ activeKey = 'home', onTabPress, renderIcon = defaultRenderIcon, tabs = DEFAULT_TABS, variant = 'default' }) {
  const premium = variant === 'homePremium';
  return (
    <View style={[styles.container, premium && styles.premiumContainer, shadows.card]}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity key={tab.key} activeOpacity={0.72} onPress={() => onTabPress?.(tab)} style={styles.item}>
            <View style={[styles.iconArea, active && styles.iconAreaActive, premium && active && styles.premiumIconAreaActive]}>
              {renderIcon(tab, active)}
            </View>
            <Text style={[styles.label, premium && styles.premiumLabel, active && styles.activeText, premium && active && styles.premiumActiveText]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 66, paddingBottom: spacing.xs, paddingTop: spacing.sm },
  premiumContainer: { backgroundColor: 'rgba(7, 24, 42, 0.98)', borderTopColor: 'rgba(91, 135, 187, 0.26)' },
  item: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  iconArea: { alignItems: 'center', borderRadius: 14, height: 30, justifyContent: 'center', marginBottom: spacing.xs, minWidth: 38 },
  iconAreaActive: { backgroundColor: colors.purpleAlpha20 },
  premiumIconAreaActive: { backgroundColor: 'transparent' },
  fallbackIcon: { color: colors.slate300, fontSize: 18 },
  label: { ...typography.caption, color: colors.slate300 },
  premiumLabel: { color: '#B9C5D4' },
  activeText: { color: colors.purple400, fontWeight: '700' },
  premiumActiveText: { color: '#5E6BFF' },
});
