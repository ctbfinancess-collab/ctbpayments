import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ca, fonts } from './theme';
import { Body, Brand, Eyebrow, GoldTitle, Page, useLayout } from './ui';

const emblem = require('../../assets/brand/ctbx-emblem.png');
const YEAR = new Date().getFullYear();

function Footer() {
  return <Text style={styles.footer}>© {YEAR} CTBX Payments · Conexão protegida</Text>;
}

// Páginas públicas (entrar, abrir conta, senha, links de e-mail). No
// computador: painel da marca à esquerda e formulário à direita. No
// celular: marca no topo e formulário abaixo.
export function AuthLayout({ eyebrow = 'Área do Cliente', title, subtitle, children }) {
  const { isDesktop } = useLayout();
  if (isDesktop) {
    return (
      <View style={styles.authRow}>
        <LinearGradient colors={['#1C1E21', '#141619']} style={styles.brandPanel}>
          <Brand size="md" />
          <View style={styles.brandCenter}>
            <Image source={emblem} style={styles.bigEmblem} />
            <Eyebrow>Área do Cliente</Eyebrow>
            <GoldTitle style={{ marginTop: 14 }}>Seu mundo financeiro{'\n'}em um só lugar.</GoldTitle>
            <Body style={{ marginTop: 16, maxWidth: 420 }}>Acesse sua conta CTBX Payments com segurança: seus dados ficam protegidos e cada acesso é registrado.</Body>
          </View>
          <Footer />
        </LinearGradient>
        <Page contentStyle={styles.formSide}>
          <View style={styles.formColumn}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <Text accessibilityRole="header" style={styles.formTitle}>{title}</Text>
            {subtitle ? <Body style={{ marginBottom: 26 }}>{subtitle}</Body> : <View style={{ height: 22 }} />}
            {children}
          </View>
        </Page>
      </View>
    );
  }
  return (
    <Page contentStyle={styles.mobileAuth}>
      <View style={styles.mobileBrand}><Brand size="md" /></View>
      <View style={styles.formColumn}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text accessibilityRole="header" style={[styles.formTitle, { fontSize: 26 }]}>{title}</Text>
        {subtitle ? <Body style={{ marginBottom: 22 }}>{subtitle}</Body> : <View style={{ height: 18 }} />}
        {children}
      </View>
      <Footer />
    </Page>
  );
}

const NAV = [
  { route: 'Dashboard', label: 'Painel' },
  { route: 'Profile', label: 'Meus dados' },
  { route: 'Kyc', label: 'Verificação de identidade' },
  { route: 'Companies', label: 'Empresas' },
  { route: 'Security', label: 'Segurança' },
];

function NavItem({ item, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ hovered }) => [styles.navItem, active && styles.navItemActive, hovered && !active && styles.navItemHover]}
    >
      {active ? <View style={styles.navMarker} /> : null}
      <Text style={[styles.navText, active && { color: ca.goldLight }]}>{item.label}</Text>
    </Pressable>
  );
}

// Área logada: menu lateral no computador; barra superior com menu
// recolhível no celular.
export function AppLayout({ active, title, subtitle, customerName, onLogout, children }) {
  const navigation = useNavigation();
  const { isDesktop } = useLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (route) => { setMenuOpen(false); if (route !== active) navigation.navigate(route); };
  const header = (
    <View style={{ marginBottom: 26 }}>
      <Text accessibilityRole="header" style={[styles.pageTitle, !isDesktop && { fontSize: 25 }]}>{title}</Text>
      {subtitle ? <Body style={{ marginTop: 6 }}>{subtitle}</Body> : null}
    </View>
  );
  if (isDesktop) {
    return (
      <View style={styles.appRow}>
        <View style={styles.sidebar}>
          <Brand size="sm" />
          <View style={styles.navList}>{NAV.map((item) => <NavItem active={item.route === active} item={item} key={item.route} onPress={() => go(item.route)} />)}</View>
          <View style={styles.sidebarFooter}>
            <Text numberOfLines={1} style={styles.userName}>{customerName}</Text>
            <Pressable accessibilityRole="button" onPress={onLogout} style={({ hovered }) => [styles.logout, hovered && styles.navItemHover]}>
              <Text style={styles.logoutText}>Sair</Text>
            </Pressable>
          </View>
        </View>
        <Page contentStyle={styles.appContent}>
          <View style={styles.contentColumn}>{header}{children}</View>
        </Page>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: ca.bg, flex: 1 }}>
      <View style={styles.topBar}>
        <Brand size="sm" />
        <Pressable accessibilityLabel={menuOpen ? 'Fechar menu' : 'Abrir menu'} accessibilityRole="button" accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen((v) => !v)} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>{menuOpen ? 'Fechar' : 'Menu'}</Text>
        </Pressable>
      </View>
      {menuOpen ? (
        <View style={styles.mobileMenu}>
          {NAV.map((item) => <NavItem active={item.route === active} item={item} key={item.route} onPress={() => go(item.route)} />)}
          <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logout}><Text style={styles.logoutText}>Sair</Text></Pressable>
        </View>
      ) : null}
      <Page contentStyle={styles.mobileContent}>{header}{children}</Page>
    </View>
  );
}

const styles = StyleSheet.create({
  authRow: { backgroundColor: ca.bg, flex: 1, flexDirection: 'row' },
  brandPanel: { borderRightColor: ca.border, borderRightWidth: 1, flex: 1, justifyContent: 'space-between', maxWidth: 640, padding: 48 },
  brandCenter: { maxWidth: 480 },
  bigEmblem: { height: 120, marginBottom: 28, width: 120 },
  formSide: { alignItems: 'center', justifyContent: 'center', padding: 48 },
  formColumn: { maxWidth: 440, width: '100%' },
  formTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 30, letterSpacing: -0.4, marginBottom: 10, marginTop: 10 },
  mobileAuth: { alignItems: 'center', paddingBottom: 28, paddingHorizontal: 20, paddingTop: 28 },
  mobileBrand: { alignSelf: 'stretch', marginBottom: 34 },
  footer: { color: ca.textMuted, fontFamily: fonts.regular, fontSize: 12, marginTop: 32 },
  appRow: { backgroundColor: ca.bg, flex: 1, flexDirection: 'row' },
  sidebar: { backgroundColor: ca.bgRaised, borderRightColor: ca.border, borderRightWidth: 1, padding: 28, width: 280 },
  navList: { gap: 4, marginTop: 40 },
  navItem: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 },
  navItemActive: { backgroundColor: 'rgba(197, 164, 108, 0.08)' },
  navItemHover: { backgroundColor: 'rgba(191, 194, 199, 0.06)' },
  navMarker: { backgroundColor: ca.gold, borderRadius: 2, height: 18, marginRight: 10, width: 3 },
  navText: { color: ca.textSoft, fontFamily: fonts.medium, fontSize: 15 },
  sidebarFooter: { borderTopColor: ca.border, borderTopWidth: 1, marginTop: 'auto', paddingTop: 18 },
  userName: { color: ca.text, fontFamily: fonts.medium, fontSize: 14, marginBottom: 8 },
  logout: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  logoutText: { color: ca.goldLight, fontFamily: fonts.medium, fontSize: 14 },
  appContent: { padding: 48 },
  contentColumn: { maxWidth: 980, width: '100%' },
  topBar: { alignItems: 'center', backgroundColor: ca.bgRaised, borderBottomColor: ca.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  menuButton: { borderColor: ca.borderStrong, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  menuButtonText: { color: ca.text, fontFamily: fonts.medium, fontSize: 14 },
  mobileMenu: { backgroundColor: ca.bgRaised, borderBottomColor: ca.border, borderBottomWidth: 1, gap: 2, padding: 12 },
  mobileContent: { padding: 20, paddingBottom: 40 },
  pageTitle: { color: ca.text, fontFamily: fonts.semibold, fontSize: 30, letterSpacing: -0.4 },
});
