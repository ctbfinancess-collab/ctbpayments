import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppHeader, Screen } from '../ui';
import { colors, spacing } from '../../theme';

export default function CardScreenLayout({ children, navigation, title }) {
  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppHeader title={title} onLeftPress={() => navigation.goBack()} leftContent={<Text style={styles.back}>‹</Text>} />
      {children}
    </Screen>
  );
}
const styles = StyleSheet.create({ content: { paddingHorizontal: 0, paddingBottom: spacing.xxl }, back: { color: colors.textPrimary, fontSize: 34 }, });
