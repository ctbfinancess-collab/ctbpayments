import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '../../components/ui';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';

export default function AdminSearchInput({ onChangeText, placeholder, style, value }) {
  return (
    <View style={[styles.box, style]}>
      <Icon color={adminColors.textMuted} name="search-outline" size={16} style={styles.icon} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={adminColors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', maxWidth: 420, paddingHorizontal: spacing.md },
  icon: { marginRight: spacing.sm },
  input: { ...typography.body, color: adminColors.textPrimary, flex: 1, paddingVertical: spacing.sm },
});
