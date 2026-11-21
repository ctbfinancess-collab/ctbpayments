import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { CormorantGaramond_500Medium, CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { env } from '../config';
import { SessionProvider, useSession } from '../session';
import { ConfirmEmailChangePage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from './authPages';
import { CustomerDataProvider, DashboardPage, ProfilePage, SecurityPage } from './appPages';
import { KycPage } from './kycPage';
import { CompaniesPage, CompanyPage } from './companyPage';
import { linking, TITLES } from './routes';
import { ca } from './theme';
import { LoadingBlock } from './ui';

// Área do Cliente (Fase 3) — usada SÓ no modo PRODUCTION. Layout web de
// verdade (sem moldura de celular), um endereço por página e a mesma
// identidade do site. DEMO/SANDBOX continuam com o app antigo, intacto.
const Stack = createNativeStackNavigator();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: ca.bg, card: ca.bgRaised, primary: ca.gold, text: ca.text, border: ca.border } };
const screenOptions = { headerShown: false, animation: 'none', contentStyle: { backgroundColor: ca.bg } };
const opts = (name) => ({ title: TITLES[name] });

// Encerra a sessão após inatividade (padrão: 15 minutos, mesmo valor do
// app). No navegador, qualquer clique, tecla ou toque conta como atividade.
function useInactivityLogout() {
  const { status, logout } = useSession();
  const last = useRef(Date.now());
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    last.current = Date.now();
    const mark = () => { last.current = Date.now(); };
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    if (Platform.OS === 'web' && typeof window !== 'undefined') events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const timer = setInterval(() => { if (Date.now() - last.current > env.sessionTimeoutMs) logout(); }, 30_000);
    return () => {
      clearInterval(timer);
      if (Platform.OS === 'web' && typeof window !== 'undefined') events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [status, logout]);
}

function Navigator() {
  const { status } = useSession();
  useInactivityLogout();
  if (status === 'loading') return <LoadingBlock label="Preparando…" />;
  const authenticated = status === 'authenticated';
  const nav = (
    <NavigationContainer
      documentTitle={{ formatter: (options, route) => `${options?.title ?? TITLES[route?.name] ?? 'Área do Cliente'} · CTBX Payments` }}
      fallback={<LoadingBlock />}
      linking={linking}
      theme={theme}
    >
      <Stack.Navigator screenOptions={screenOptions}>
        {authenticated ? (
          <>
            <Stack.Screen component={DashboardPage} name="Dashboard" options={opts('Dashboard')} />
            <Stack.Screen component={ProfilePage} name="Profile" options={opts('Profile')} />
            <Stack.Screen component={KycPage} name="Kyc" options={opts('Kyc')} />
            <Stack.Screen component={SecurityPage} name="Security" options={opts('Security')} />
            <Stack.Screen component={CompaniesPage} name="Companies" options={opts('Companies')} />
            <Stack.Screen component={CompanyPage} name="Company" options={opts('Company')} />
          </>
        ) : (
          <>
            <Stack.Screen component={LoginPage} name="Login" options={opts('Login')} />
            <Stack.Screen component={RegisterPage} name="Register" options={opts('Register')} />
            <Stack.Screen component={ForgotPasswordPage} name="ForgotPassword" options={opts('ForgotPassword')} />
          </>
        )}
        {/* Links recebidos por e-mail: funcionam logado ou não. */}
        <Stack.Screen component={VerifyEmailPage} name="VerifyEmail" options={opts('VerifyEmail')} />
        <Stack.Screen component={ResetPasswordPage} name="ResetPassword" options={opts('ResetPassword')} />
        <Stack.Screen component={ConfirmEmailChangePage} name="ConfirmEmailChange" options={opts('ConfirmEmailChange')} />
      </Stack.Navigator>
    </NavigationContainer>
  );
  return authenticated ? <CustomerDataProvider>{nav}</CustomerDataProvider> : nav;
}

export default function CustomerAreaApp() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, CormorantGaramond_500Medium, CormorantGaramond_600SemiBold });
  // Sem as fontes (ex.: rede lenta) segue com a fonte do sistema.
  if (!loaded && !error) return <View style={{ backgroundColor: ca.bg, flex: 1 }} />;
  return <SessionProvider><Navigator /></SessionProvider>;
}
