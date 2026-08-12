import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default function SectionTitle({ actionLabel, children, onActionPress, style, title }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{children ?? title}</Text>
      {actionLabel ? (
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onActionPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...typography.heading3, color: colors.textPrimary },
  action: { ...typography.label, color: colors.purple300 },
});
