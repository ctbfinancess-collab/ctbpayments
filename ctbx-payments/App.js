import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
// Corrige o Alert.alert (no-op no Web) para todo o app — ver comentário no
// próprio arquivo. Import só por efeito colateral, precisa vir antes de
// qualquer tela renderizar.
import './src/utils/webAlertPolyfill';

import AdminApp from './src/admin/AdminApp';

import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import VerifyEmailScreen from './src/screens/auth/VerifyEmailScreen';
import CustomerForgotPasswordScreen from './src/screens/auth/CustomerForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import ConfirmEmailChangeScreen from './src/screens/auth/ConfirmEmailChangeScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import GlobalAccountScreen from './src/screens/accounts/GlobalAccountScreen';
import PixScreen from './src/screens/PixScreen';
import PixAuthorizationScreen from './src/screens/pix/PixAuthorizationScreen';
import PixAgencyAccountScreen from './src/screens/pix/PixAgencyAccountScreen';
import PixCreateKeyScreen from './src/screens/pix/PixCreateKeyScreen';
import PixFavoritesScreen from './src/screens/pix/PixFavoritesScreen';
import PixKeyEntryScreen from './src/screens/pix/PixKeyEntryScreen';
import PixKeysScreen from './src/screens/pix/PixKeysScreen';
import PixQrScannerScreen from './src/screens/pix/PixQrScannerScreen';
import PixReceiptScreen from './src/screens/pix/PixReceiptScreen';
import PixReceiveQrScreen from './src/screens/pix/PixReceiveQrScreen';
import PixReceiveScreen from './src/screens/pix/PixReceiveScreen';
import PixRecentScreen from './src/screens/pix/PixRecentScreen';
import PixScheduledScreen from './src/screens/pix/PixScheduledScreen';
import PixLimitsScreen from './src/screens/pix/PixLimitsScreen';
import PixReceiptsListScreen from './src/screens/pix/PixReceiptsListScreen';
import PixTransferScreen from './src/screens/pix/PixTransferScreen';
import TransferAuthorizationScreen from './src/screens/transfers/TransferAuthorizationScreen';
import TransferBeneficiaryScreen from './src/screens/transfers/TransferBeneficiaryScreen';
import TransferDetailsScreen from './src/screens/transfers/TransferDetailsScreen';
import TransferFavoritesScreen from './src/screens/transfers/TransferFavoritesScreen';
import TransferReceiptScreen from './src/screens/transfers/TransferReceiptScreen';
import TransferReviewScreen from './src/screens/transfers/TransferReviewScreen';
import TransferStartScreen from './src/screens/transfers/TransferStartScreen';
import PaymentAuthorizationScreen from './src/screens/payments/PaymentAuthorizationScreen';
import PaymentCodeScreen from './src/screens/payments/PaymentCodeScreen';
import PaymentDetailsScreen from './src/screens/payments/PaymentDetailsScreen';
import PaymentInstallmentsScreen from './src/screens/payments/PaymentInstallmentsScreen';
import PaymentReceiptScreen from './src/screens/payments/PaymentReceiptScreen';
import PaymentReviewScreen from './src/screens/payments/PaymentReviewScreen';
import PaymentScannerScreen from './src/screens/payments/PaymentScannerScreen';
import PaymentStartScreen from './src/screens/payments/PaymentStartScreen';
import StatementBlockedResponseScreen from './src/screens/statement/StatementBlockedResponseScreen';
import StatementDetailScreen from './src/screens/statement/StatementDetailScreen';
import StatementFiltersScreen from './src/screens/statement/StatementFiltersScreen';
import StatementReceiptScreen from './src/screens/statement/StatementReceiptScreen';
import StatementScreen from './src/screens/statement/StatementScreen';
import CardsScreen from './src/screens/cards/CardsScreen';
import CardDetailsScreen from './src/screens/cards/CardDetailsScreen';
import CardActivationScreen from './src/screens/cards/CardActivationScreen';
import CardRechargeScreen from './src/screens/cards/CardRechargeScreen';
import CardPasswordScreen from './src/screens/cards/CardPasswordScreen';
import CardSecurityScreen from './src/screens/cards/CardSecurityScreen';
import CardStatementScreen from './src/screens/cards/CardStatementScreen';
import CardTransactionScreen from './src/screens/cards/CardTransactionScreen';
import CardReceiptsScreen from './src/screens/cards/CardReceiptsScreen';
import CardRequestScreen from './src/screens/cards/CardRequestScreen';
import CardRequestReceiptScreen from './src/screens/cards/CardRequestReceiptScreen';
import CardVirtualCreateScreen from './src/screens/cards/CardVirtualCreateScreen';
import CardVirtualDetailsScreen from './src/screens/cards/CardVirtualDetailsScreen';
import CardVirtualTransactionsScreen from './src/screens/cards/CardVirtualTransactionsScreen';
import TransportCardScreen from './src/screens/cards/TransportCardScreen';
import ServicesScreen from './src/screens/services/ServicesScreen';
import InvestmentsScreen from './src/screens/services/investments/InvestmentsScreen';
import InvestmentPositionDetailScreen from './src/screens/services/investments/InvestmentPositionDetailScreen';
import InvestmentSimulationScreen from './src/screens/services/investments/InvestmentSimulationScreen';
import InvestmentReviewScreen from './src/screens/services/investments/InvestmentReviewScreen';
import BillingStartScreen from './src/screens/services/billing/BillingStartScreen';
import BillingReviewScreen from './src/screens/services/billing/BillingReviewScreen';
import BillingReceiptScreen from './src/screens/services/billing/BillingReceiptScreen';
import ConsignedCreditScreen from './src/screens/services/credit/ConsignedCreditScreen';
import ConsignedRequestScreen from './src/screens/services/credit/ConsignedRequestScreen';
import ConsignedStatusScreen from './src/screens/services/credit/ConsignedStatusScreen';
import ServiceReceiptsScreen from './src/screens/services/ServiceReceiptsScreen';
import ServiceInfoScreen from './src/screens/services/ServiceInfoScreen';
import ServiceProductScreen from './src/screens/services/products/ServiceProductScreen';
import ServiceProductRequestScreen from './src/screens/services/products/ServiceProductRequestScreen';
import ServiceProductStatusScreen from './src/screens/services/products/ServiceProductStatusScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import ProfilePersonalDataScreen from './src/screens/profile/ProfilePersonalDataScreen';
import ProfileAccountDataScreen from './src/screens/profile/ProfileAccountDataScreen';
import ProfilePhotoScreen from './src/screens/profile/ProfilePhotoScreen';
import ProfileBiometricsScreen from './src/screens/profile/ProfileBiometricsScreen';
import ProfileDevicesScreen from './src/screens/profile/ProfileDevicesScreen';
import ProfileTokenScreen from './src/screens/profile/ProfileTokenScreen';
import ProfileTermsScreen from './src/screens/profile/ProfileTermsScreen';
import { LoadingState } from './src/components/ui';
import { SessionProvider, useSession } from './src/session';
import { colors, layout, shadows } from './src/theme';

const Stack = createNativeStackNavigator();

const stackOptions = { headerShown: false, animation: 'fade' };

function AuthenticatedStack() {
  return (
      <Stack.Navigator initialRouteName="Home" screenOptions={stackOptions}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="GlobalAccount" component={GlobalAccountScreen} />
        <Stack.Screen name="Pix" component={PixScreen} />
        <Stack.Screen name="PixKeyEntry" component={PixKeyEntryScreen} />
        <Stack.Screen name="PixAgencyAccount" component={PixAgencyAccountScreen} />
        <Stack.Screen name="PixQrScanner" component={PixQrScannerScreen} />
        <Stack.Screen name="PixFavorites" component={PixFavoritesScreen} />
        <Stack.Screen name="PixTransfer" component={PixTransferScreen} />
        <Stack.Screen name="PixAuthorization" component={PixAuthorizationScreen} />
        <Stack.Screen name="PixReceipt" component={PixReceiptScreen} />
        <Stack.Screen name="PixReceive" component={PixReceiveScreen} />
        <Stack.Screen name="PixReceiveQr" component={PixReceiveQrScreen} />
        <Stack.Screen name="PixKeys" component={PixKeysScreen} />
        <Stack.Screen name="PixRecent" component={PixRecentScreen} />
        <Stack.Screen name="PixScheduled" component={PixScheduledScreen} />
        <Stack.Screen name="PixLimits" component={PixLimitsScreen} />
        <Stack.Screen name="PixReceiptsList" component={PixReceiptsListScreen} />
        <Stack.Screen name="PixCreateKey" component={PixCreateKeyScreen} />
        <Stack.Screen name="Transfers" component={TransferStartScreen} />
        <Stack.Screen name="TransferBeneficiary" component={TransferBeneficiaryScreen} />
        <Stack.Screen name="TransferFavorites" component={TransferFavoritesScreen} />
        <Stack.Screen name="TransferDetails" component={TransferDetailsScreen} />
        <Stack.Screen name="TransferReview" component={TransferReviewScreen} />
        <Stack.Screen name="TransferAuthorization" component={TransferAuthorizationScreen} />
        <Stack.Screen name="TransferReceipt" component={TransferReceiptScreen} />
        <Stack.Screen name="Payments" component={PaymentStartScreen} />
        <Stack.Screen name="PaymentCode" component={PaymentCodeScreen} />
        <Stack.Screen name="PaymentScanner" component={PaymentScannerScreen} />
        <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
        <Stack.Screen name="PaymentInstallments" component={PaymentInstallmentsScreen} />
        <Stack.Screen name="PaymentReview" component={PaymentReviewScreen} />
        <Stack.Screen name="PaymentAuthorization" component={PaymentAuthorizationScreen} />
        <Stack.Screen name="PaymentReceipt" component={PaymentReceiptScreen} />
        <Stack.Screen name="Statement" component={StatementScreen} />
        <Stack.Screen name="StatementFilters" component={StatementFiltersScreen} />
        <Stack.Screen name="StatementDetail" component={StatementDetailScreen} />
        <Stack.Screen name="StatementReceipt" component={StatementReceiptScreen} />
        <Stack.Screen name="StatementBlockedResponse" component={StatementBlockedResponseScreen} />
        <Stack.Screen name="Cards" component={CardsScreen} />
        <Stack.Screen name="CardDetails" component={CardDetailsScreen} />
        <Stack.Screen name="CardActivation" component={CardActivationScreen} />
        <Stack.Screen name="CardRecharge" component={CardRechargeScreen} />
        <Stack.Screen name="CardPassword" component={CardPasswordScreen} />
        <Stack.Screen name="CardSecurity" component={CardSecurityScreen} />
        <Stack.Screen name="CardStatement" component={CardStatementScreen} />
        <Stack.Screen name="CardTransaction" component={CardTransactionScreen} />
        <Stack.Screen name="CardReceipts" component={CardReceiptsScreen} />
        <Stack.Screen name="CardRequest" component={CardRequestScreen} />
        <Stack.Screen name="CardRequestReceipt" component={CardRequestReceiptScreen} />
        <Stack.Screen name="CardVirtualCreate" component={CardVirtualCreateScreen} />
        <Stack.Screen name="CardVirtualDetails" component={CardVirtualDetailsScreen} />
        <Stack.Screen name="CardVirtualTransactions" component={CardVirtualTransactionsScreen} />
        <Stack.Screen name="TransportCard" component={TransportCardScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="Investments" component={InvestmentsScreen} />
        <Stack.Screen name="InvestmentPositionDetail" component={InvestmentPositionDetailScreen} />
        <Stack.Screen name="InvestmentSimulation" component={InvestmentSimulationScreen} />
        <Stack.Screen name="InvestmentReview" component={InvestmentReviewScreen} />
        <Stack.Screen name="BillingStart" component={BillingStartScreen} />
        <Stack.Screen name="BillingReview" component={BillingReviewScreen} />
        <Stack.Screen name="BillingReceipt" component={BillingReceiptScreen} />
        <Stack.Screen name="ConsignedCredit" component={ConsignedCreditScreen} />
        <Stack.Screen name="ConsignedRequest" component={ConsignedRequestScreen} />
        <Stack.Screen name="ConsignedStatus" component={ConsignedStatusScreen} />
        <Stack.Screen name="ServiceReceipts" component={ServiceReceiptsScreen} />
        <Stack.Screen name="ServiceInfo" component={ServiceInfoScreen} />
        <Stack.Screen name="ServiceProduct" component={ServiceProductScreen} />
        <Stack.Screen name="ServiceProductRequest" component={ServiceProductRequestScreen} />
        <Stack.Screen name="ServiceProductStatus" component={ServiceProductStatusScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ProfilePersonalData" component={ProfilePersonalDataScreen} />
        <Stack.Screen name="ProfileAccountData" component={ProfileAccountDataScreen} />
        <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
        <Stack.Screen name="ProfileBiometrics" component={ProfileBiometricsScreen} />
        <Stack.Screen name="ProfileDevices" component={ProfileDevicesScreen} />
        <Stack.Screen name="ProfileToken" component={ProfileTokenScreen} />
        <Stack.Screen name="ProfileTerms" component={ProfileTermsScreen} />
      </Stack.Navigator>
  );
}

function PublicStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { status } = useSession();
  if (status === 'loading') return <LoadingState label="Preparando sessão…" />;
  return <NavigationContainer>{status === 'authenticated' ? <AuthenticatedStack /> : <PublicStack />}</NavigationContainer>;
}

// No Expo Web, o app é centralizado numa moldura de largura fixa (proporção
// de celular) em vez de esticar o layout para a largura do navegador. No
// nativo isso é um passthrough — a tela já É a moldura. useAppWidth() usa a
// mesma largura (layout.webFrameWidth) para os cálculos de layout baseados em
// largura de janela (ver src/hooks/useAppWidth.js).
function WebFrame({ children }) {
  if (Platform.OS !== 'web') return children;
  return (
    <View style={styles.webBackdrop}>
      <View style={styles.webFrame}>{children}</View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  // Se a fonte falhar ao carregar (ex.: offline na primeira instalação), seguimos
  // com o fallback do sistema em vez de travar o app numa tela de carregamento.
  if (!fontsLoaded && !fontError) return <LoadingState label="Preparando identidade visual…" />;
  // Painel Administrativo: árvore totalmente separada da área do cliente,
  // sem WebFrame (precisa da largura cheia do desktop, não da moldura de
  // celular) e sem a sessão/navegação do app cliente. Só existe no Web.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return <AdminApp />;
  }
  // Verificação de e-mail (Customer Identity, Etapa 3): destino do botão
  // "VERIFICAR MEU E-MAIL" enviado por e-mail — mesmo motivo do /admin
  // acima, uma URL alcançada de fora do app (nunca por navigation.navigate
  // interno), então fica fora da árvore normal de sessão/navegação.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/verify-email')) {
    return <VerifyEmailScreen />;
  }
  // Recuperação de senha real (Customer Identity) — mesmo motivo do
  // /verify-email acima. /reset-password é o destino do botão "REDEFINIR
  // MINHA SENHA" enviado por e-mail; /forgot-password é o pedido inicial
  // (link direto, ainda sem entrada na navegação normal do app). Nomes
  // distintos do ForgotPasswordScreen SANDBOX (rota nenhuma, só
  // navigation.navigate) — não colide com ele.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/reset-password')) {
    return <ResetPasswordScreen />;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/forgot-password')) {
    return <CustomerForgotPasswordScreen />;
  }
  // Confirmação de troca de e-mail — mesmo motivo dos três acima.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/confirm-email-change')) {
    return <ConfirmEmailChangeScreen />;
  }
  return (
    <WebFrame>
      <SessionProvider>
        <View style={styles.appRoot}>
          <AppNavigator />
        </View>
      </SessionProvider>
    </WebFrame>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  webBackdrop: { alignItems: 'center', backgroundColor: '#05070C', flex: 1, height: '100vh', justifyContent: 'center' },
  // `position: relative` + `overflow: hidden` são o que permite o `Modal` do
  // React Native (ver ModalSheet.js) ficar contido dentro da moldura no Web,
  // em vez de ocupar a largura inteira do navegador — o `Modal` nativo do RN
  // "porta" pra fora da árvore normal, e sem um ancestral posicionado ele
  // vaza pro viewport inteiro.
  webFrame: { aspectRatio: layout.webFrameAspectRatio, borderColor: colors.borderStrong, borderLeftWidth: 1, borderRightWidth: 1, maxHeight: '100%', maxWidth: layout.webFrameWidth, overflow: 'hidden', position: 'relative', width: '100%', ...shadows.card },
});
