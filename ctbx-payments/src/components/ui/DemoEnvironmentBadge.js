import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
export default function DemoEnvironmentBadge() { return <View pointerEvents="none" style={styles.badge}><Text style={styles.text}>AMBIENTE DE DEMONSTRAÇÃO</Text></View>; }
const styles = StyleSheet.create({ badge: { alignSelf: 'center', backgroundColor: colors.orange500, borderBottomLeftRadius: radii.sm, borderBottomRightRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 3, position: 'absolute', top: 0, zIndex: 1000 }, text: { ...typography.caption, color: colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 } });
