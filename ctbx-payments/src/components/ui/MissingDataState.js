import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import AppHeader from './AppHeader';
import Card from './Card';
import OutlineButton from './OutlineButton';
import PrimaryButton from './PrimaryButton';
import Screen from './Screen';

export default function MissingDataState({ navigation, title = 'Dados indisponíveis' }) {
  const canGoBack = navigation?.canGoBack?.();
  return (
    <Screen contentContainerStyle={styles.screen} gradient>
      <AppHeader leftContent={canGoBack ? <Text style={styles.back}>‹</Text> : null} onLeftPress={canGoBack ? () => navigation.goBack() : undefined} title={title} />
      <Card style={styles.card}>
        <Text style={styles.heading}>Não foi possível carregar os dados necessários.</Text>
        <Text style={styles.copy}>Volte à etapa anterior e tente novamente. Nenhuma operação foi realizada.</Text>
        {canGoBack ? <PrimaryButton onPress={() => navigation.goBack()} style={styles.button}>Voltar</PrimaryButton> : null}
        <OutlineButton onPress={() => navigation.navigate('Home')} style={styles.button}>Ir para o início</OutlineButton>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  back: { color: colors.textPrimary, fontSize: 36, lineHeight: 38 },
  card: { margin: spacing.xl, padding: spacing.xl },
  heading: { ...typography.heading3, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  button: { marginTop: spacing.lg },
});
