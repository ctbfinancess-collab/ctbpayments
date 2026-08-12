import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { AppHeader, Screen } from '../ui';
import { spacing } from '../../theme';

export default function TransferLayout({ children, navigation, scroll = true, title }) {
  const body = scroll ? <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView> : children;
  return (
    <Screen contentContainerStyle={styles.screen} gradient>
      <AppHeader leftContent={<Text style={styles.back}>‹</Text>} onLeftPress={() => navigation.goBack()} title={title} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  content: { flexGrow: 1, padding: spacing.xl },
  back: { color: '#F2F5F8', fontSize: 34, lineHeight: 34 },
});
