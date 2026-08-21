import React from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import AppBackground from '../ui/AppBackground';
import Icon from '../ui/Icon';

// `atmospheric` liga o fundo com profundidade (AppBackground) nesta tela.
// Opt-in e não o padrão: outras telas que usam AuthLayout (ForgotPassword)
// continuam com o fundo chapado até serem avaliadas também.
// `premium` liga o tratamento oficial de identidade (logo grande sem
// moldura + tipografia maior) usado por Login e Onboarding. Cada tela passa
// sua própria `backgroundSource` — a arte de fundo é a imagem oficial
// fornecida, usada como está, sem gradiente/arco gerado por código.
// No Android, com edgeToEdgeEnabled (obrigatório a partir do Android 15,
// já ligado em app.json) + newArchEnabled, o KeyboardAvoidingView entra em
// conflito com o próprio redimensionamento nativo do Android ao focar um
// campo — resultado: a tela pisca e o teclado nem chega a abrir (o
// KeyboardAvoidingView some do layout e volta em loop, competindo com o
// SO). iOS não tem esse redimensionamento nativo automático, então
// continua precisando do KeyboardAvoidingView de verdade.
function KeyboardWrapper({ children, style }) {
  if (Platform.OS !== 'ios') return <View style={style}>{children}</View>;
  return <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={style}>{children}</KeyboardAvoidingView>;
}

export default function AuthLayout({ atmospheric = false, backgroundSource, children, eyebrow, footer = true, onBack, premium = false, showLogo = true, subtitle, title }) {
  const Background = atmospheric && !premium ? AppBackground : View;
  return (
    <Background style={[styles.screen, premium && styles.premiumScreen]}>
      {premium && backgroundSource ? (
        <Image
          pointerEvents="none"
          resizeMode="cover"
          source={backgroundSource}
          style={styles.backgroundImage}
        />
      ) : null}
      <StatusBar style="light" />
      <KeyboardWrapper style={styles.flex}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={[styles.content, premium && styles.premiumContent]}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        >
          {onBack ? <View style={styles.topRow}><TouchableOpacity accessibilityLabel="Voltar" onPress={onBack} style={styles.back}><Icon color={colors.textPrimary} name="chevron-back" size={26} /></TouchableOpacity></View> : null}
          {showLogo ? (
            <View style={[styles.logoRow, premium && styles.premiumLogoRow]}>
              {premium ? (
                <Image accessibilityLabel="CTBX Payments" resizeMode="contain" source={require('../../../assets/ctbx-logo-official-transparent.png')} style={styles.premiumLogo} />
              ) : (
                <View style={styles.logoBadge}>
                  <Image accessibilityLabel="CTBX Payments" resizeMode="cover" source={require('../../../assets/ctbx-payments-logo-app.png')} style={styles.logo} />
                </View>
              )}
            </View>
          ) : null}
          {eyebrow ? <Text style={[styles.eyebrow, premium && styles.premiumEyebrow]}>{eyebrow}</Text> : null}
          {title ? <Text style={[styles.title, premium && styles.premiumTitle]}>{title}</Text> : null}
          {subtitle ? <Text style={[styles.subtitle, premium && styles.premiumSubtitle]}>{subtitle}</Text> : null}
          <View style={[styles.body, premium && styles.premiumBody]}>{children}</View>
          {footer ? <Text style={[styles.footer, premium && styles.premiumFooter]}>Segurança  •  Privacidade  •  Ajuda</Text> : null}
        </ScrollView>
      </KeyboardWrapper>
    </Background>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: colors.background, flex: 1, overflow: 'hidden' },
  premiumScreen: { backgroundColor: colors.background },
  // No Expo Web, `resizeMode="cover"` só escala corretamente quando o
  // elemento tem uma caixa CSS definida — `absoluteFillObject` sozinho (só
  // top/left/right/bottom:0) não é suficiente, a imagem renderizava no
  // tamanho nativo e cortava do canto, escondendo mapa e arco.
  backgroundImage: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.screenHorizontal, paddingTop: Platform.OS === 'android' ? 36 : 50 },
  premiumContent: { paddingBottom: 20, paddingHorizontal: 26, paddingTop: Platform.OS === 'android' ? 18 : 28 },
  topRow: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.xl, marginLeft: -spacing.sm },
  back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  logoRow: { alignItems: 'center', marginBottom: spacing.xl },
  logoBadge: { borderRadius: radii.xl, height: 88, overflow: 'hidden', width: 88, ...shadows.card },
  logo: { height: '100%', width: '100%' },
  premiumLogoRow: { marginBottom: spacing.md },
  // Largura+altura explícitas (não `aspectRatio`) — no Expo Web o
  // `aspectRatio` em <Image> é inconsistente e a logo saía esticada.
  // Proporção real do arquivo oficial: 1425×1104.
  premiumLogo: { height: 147, width: 190 },
  eyebrow: { ...typography.eyebrow, color: colors.purple300 },
  premiumEyebrow: { color: colors.purple500, marginBottom: spacing.xs },
  title: { ...typography.display, color: colors.textPrimary, maxWidth: 340 },
  premiumTitle: { color: colors.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: 26, fontWeight: '600', lineHeight: 32 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, maxWidth: 350 },
  premiumSubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs },
  body: { marginTop: spacing.xxl },
  premiumBody: { marginTop: spacing.lg },
  footer: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xxxl, paddingBottom: spacing.sm, textAlign: 'center' },
  premiumFooter: { color: colors.purple300 },
});
