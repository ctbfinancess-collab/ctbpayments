import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import AppBackground from './AppBackground';

export default function Screen({
  atmospheric = false,
  atmosphericVariant = 'default',
  backgroundSource,
  children,
  contentContainerStyle,
  gradient = true,
  safeAreaStyle,
  scroll = false,
  statusBarStyle = 'light-content',
  style,
}) {
  const premiumAtmosphere = atmosphericVariant === 'homePremium';
  const content = scroll ? (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      style={styles.flex}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  const body = atmospheric
    ? <AppBackground backgroundSource={backgroundSource} variant={atmosphericVariant}>{content}</AppBackground>
    : content;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        atmospheric && styles.atmosphericSafeArea,
        premiumAtmosphere && styles.premiumAtmosphericSafeArea,
        safeAreaStyle,
      ]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={premiumAtmosphere ? '#0D1B2A' : atmospheric ? '#0B1C33' : colors.navy900}
      />
      <View style={[styles.screen, atmospheric && styles.transparent, style]}>
        {gradient ? (
          <>
            <View pointerEvents="none" style={styles.gradientTop} />
            <View pointerEvents="none" style={styles.gradientGlow} />
          </>
        ) : null}
        {body}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.navy900, flex: 1 },
  atmosphericSafeArea: { backgroundColor: '#0B1C33' },
  premiumAtmosphericSafeArea: { backgroundColor: '#0D1B2A' },
  screen: { backgroundColor: colors.background, flex: 1, overflow: 'hidden' },
  transparent: { backgroundColor: 'transparent' },
  content: { flex: 1, paddingHorizontal: spacing.screenHorizontal },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.screenHorizontal },
  gradientTop: {
    backgroundColor: colors.navy700,
    height: '42%',
    left: 0,
    opacity: 0.35,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  gradientGlow: {
    backgroundColor: colors.purple500,
    borderRadius: 220,
    height: 320,
    opacity: 0.08,
    position: 'absolute',
    right: -170,
    top: -90,
    width: 320,
  },
});
