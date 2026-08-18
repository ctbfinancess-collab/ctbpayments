import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import adminColors from '../theme/adminColors';
import { spacing } from '../../theme';

export default function AdminShell({ activeSection, children, onSelectSection, title }) {
  return (
    <View style={styles.root}>
      <AdminSidebar activeSection={activeSection} onSelect={onSelectSection} />
      <View style={styles.main}>
        <AdminTopbar title={title} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.contentScroll}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: adminColors.background, flex: 1, flexDirection: 'row', height: Platform.OS === 'web' ? '100vh' : '100%', width: '100%' },
  main: { flex: 1 },
  contentScroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
});
