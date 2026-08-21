import React from 'react'; import { ScrollView, StyleSheet } from 'react-native'; import { AppHeader, Icon, Screen } from '../ui'; import { colors, spacing } from '../../theme';
// `atmospheric`/`backgroundSource` são opt-in — cada tela decide se usa o
// fundo padrão ou o tratamento premium (Extrato, Filtros, Detalhe,
// Comprovante e Movimentação bloqueada já usam o fundo atmosférico).
// `rightContent`/`onRightPress` permitem compor uma
// ação extra no cabeçalho (ex.: atalho de filtro) sem alterar o AppHeader
// compartilhado — o slot direito comporta só 1 ícone (largura fixa de 44).
export default function StatementLayout({ atmospheric = false, backgroundSource, children, navigation, onRightPress, rightContent, scroll = true, title }) { const body = scroll ? <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView> : children; return <Screen atmospheric={atmospheric} backgroundSource={backgroundSource} contentContainerStyle={styles.screen} gradient={!atmospheric}><AppHeader leftContent={<Icon color={colors.textPrimary} name="chevron-back" size={24} />} onLeftPress={() => navigation.goBack()} onRightPress={onRightPress} rightContent={rightContent} title={title} />{body}</Screen>; }
const styles = StyleSheet.create({ screen: { paddingHorizontal: 0 }, content: { flexGrow: 1, padding: spacing.xl } });
