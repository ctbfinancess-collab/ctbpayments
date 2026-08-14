import React from 'react';
import { StyleSheet } from 'react-native';
import { AppHeader, Icon, Screen } from '../ui';
import { colors, spacing } from '../../theme';

const CARD_BACKGROUND = require('../../../assets/ctbx-investments-background.png');

export default function CardScreenLayout({ children, navigation, title }) {
  return (
    <Screen atmospheric backgroundSource={CARD_BACKGROUND} gradient={false} scroll contentContainerStyle={styles.content}>
      <AppHeader title={title} onLeftPress={() => navigation.goBack()} leftContent={<Icon color={colors.textPrimary} name="chevron-back" size={24} />} />
      {children}
    </Screen>
  );
}
const styles = StyleSheet.create({ content: { paddingHorizontal: 0, paddingBottom: spacing.xxl } });
