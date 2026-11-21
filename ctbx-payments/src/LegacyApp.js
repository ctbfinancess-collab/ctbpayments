// App antigo (DEMO/SANDBOX): telas financeiras de demonstração. NUNCA entra
// no pacote de produção — ver App.js (Fase 3).
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
// Corrige o Alert.alert (no-op no Web) para todo o app — ver comentário no
// próprio arquivo. Import só por efeito colateral, precisa vir antes de
// qualquer tela renderizar.
import './utils/webAlertPolyfill';


import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import VerifyEmailScreen from './screens/auth/VerifyEmailScreen';
import CustomerForgotPasswordScreen from './screens/auth/CustomerForgotPasswordScreen';
import CustomerRegisterScreen from './screens/auth/CustomerRegisterScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import ConfirmEmailChangeScreen from './screens/auth/ConfirmEmailChangeScreen';
import OnboardingScreen from './screens/auth/OnboardingScreen';
import KycPersonalInfoScreen from './screens/auth/KycPersonalInfoScreen';
import ProductionHomePlaceholderScreen from './screens/ProductionHomePlaceholderScreen';
import HomeScreen from './screens/HomeScreen';
import GlobalAccountScreen from './screens/accounts/GlobalAccountScreen';
import PixScreen from './screens/PixScreen';
import PixAuthorizationScreen from './screens/pix/PixAuthorizationScreen';
import PixAgencyAccountScreen from './screens/pix/PixAgencyAccountScreen';
import PixCreateKeyScreen from './screens/pix/PixCreateKeyScreen';
import PixFavoritesScreen from './screens/pix/PixFavoritesScreen';
import PixKeyEntryScreen from './screens/pix/PixKeyEntryScreen';
import PixKeysScreen from './screens/pix/PixKeysScreen';
import PixQrScannerScreen from './screens/pix/PixQrScannerScreen';
import PixReceiptScreen from './screens/pix/PixReceiptScreen';
import PixReceiveQrScreen from './screens/pix/PixReceiveQrScreen';
import PixReceiveScreen from './screens/pix/PixReceiveScreen';
import PixRecentScreen from './screens/pix/PixRecentScreen';
import PixScheduledScreen from './screens/pix/PixScheduledScreen';
import PixLimitsScreen from './screens/pix/PixLimitsScreen';
import PixReceiptsListScreen from './screens/pix/PixReceiptsListScreen';
import PixTransferScreen from './screens/pix/PixTransferScreen';
import TransferAuthorizationScreen from './screens/transfers/TransferAuthorizationScreen';
import TransferBeneficiaryScreen from './screens/transfers/TransferBeneficiaryScreen';
import TransferDetailsScreen from './screens/transfers/TransferDetailsScreen';
import TransferFavoritesScreen from './screens/transfers/TransferFavoritesScreen';
import TransferReceiptScreen from './screens/transfers/TransferReceiptScreen';
import TransferReviewScreen from './screens/transfers/TransferReviewScreen';
import TransferStartScreen from './screens/transfers/TransferStartScreen';
import PaymentAuthorizationScreen from './screens/payments/PaymentAuthorizationScreen';
import PaymentCodeScreen from './screens/payments/PaymentCodeScreen';
import PaymentDetailsScreen from './screens/payments/PaymentDetailsScreen';
import PaymentInstallmentsScreen from './screens/payments/PaymentInstallmentsScreen';
import PaymentReceiptScreen from './screens/payments/PaymentReceiptScreen';
import PaymentReviewScreen from './screens/payments/PaymentReviewScreen';
import PaymentScannerScreen from './screens/payments/PaymentScannerScreen';
import PaymentStartScreen from './screens/payments/PaymentStartScreen';
import StatementBlockedResponseScreen from './screens/statement/StatementBlockedResponseScreen';
import StatementDetailScreen from './screens/statement/StatementDetailScreen';
import StatementFiltersScreen from './screens/statement/StatementFiltersScreen';
import StatementReceiptScreen from './screens/statement/StatementReceiptScreen';
import StatementScreen from './screens/statement/StatementScreen';
import CardsScreen from './screens/cards/CardsScreen';
import CardDetailsScreen from './screens/cards/CardDetailsScreen';
import CardActivationScreen from './screens/cards/CardActivationScreen';
import CardRechargeScreen from './screens/cards/CardRechargeScreen';
import CardPasswordScreen from './screens/cards/CardPasswordScreen';
import CardSecurityScreen from './screens/cards/CardSecurityScreen';
import CardStatementScreen from './screens/cards/CardStatementScreen';
import CardTransactionScreen from './screens/cards/CardTransactionScreen';
import CardReceiptsScreen from './screens/cards/CardReceiptsScreen';
import CardRequestScreen from './screens/cards/CardRequestScreen';
import CardRequestReceiptScreen from './screens/cards/CardRequestReceiptScreen';
import CardVirtualCreateScreen from './screens/cards/CardVirtualCreateScreen';
import CardVirtualDetailsScreen from './screens/cards/CardVirtualDetailsScreen';
import CardVirtualTransactionsScreen from './screens/cards/CardVirtualTransactionsScreen';
import TransportCardScreen from './screens/cards/TransportCardScreen';
import ServicesScreen from './screens/services/ServicesScreen';
import InvestmentsScreen from './screens/services/investments/InvestmentsScreen';
import InvestmentPositionDetailScreen from './screens/services/investments/InvestmentPositionDetailScreen';
import InvestmentSimulationScreen from './screens/services/investments/InvestmentSimulationScreen';
import InvestmentReviewScreen from './screens/services/investments/InvestmentReviewScreen';
import BillingStartScreen from './screens/services/billing/BillingStartScreen';
import BillingReviewScreen from './screens/services/billing/BillingReviewScreen';
import BillingReceiptScreen from './screens/services/billing/BillingReceiptScreen';
import ConsignedCreditScreen from './screens/services/credit/ConsignedCreditScreen';
import ConsignedRequestScreen from './screens/services/credit/ConsignedRequestScreen';
import ConsignedStatusScreen from './screens/services/credit/ConsignedStatusScreen';
import ServiceReceiptsScreen from './screens/services/ServiceReceiptsScreen';
import ServiceInfoScreen from './screens/services/ServiceInfoScreen';
import ServiceProductScreen from './screens/services/products/ServiceProductScreen';
import ServiceProductRequestScreen from './screens/services/products/ServiceProductRequestScreen';
import ServiceProductStatusScreen from './screens/services/products/ServiceProductStatusScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import ProfilePersonalDataScreen from './screens/profile/ProfilePersonalDataScreen';
import ProfileAccountDataScreen from './screens/profile/ProfileAccountDataScreen';
import ProfilePhotoScreen from './screens/profile/ProfilePhotoScreen';
import ProfileBiometricsScreen from './screens/profile/ProfileBiometricsScreen';
import ProfileDevicesScreen from './screens/profile/ProfileDevicesScreen';
import ProfileTokenScreen from './screens/profile/ProfileTokenScreen';
import ProfileTermsScreen from './screens/profile/ProfileTermsScreen';
import { DemoEnvironmentBadge, LoadingState } from './components/ui';
import { env, isProductionMode } from './config';

// Painel admin embutido: só carregado quando EXPO_PUBLIC_ENABLE_ADMIN=true
// (uso interno). A Área do Cliente publicada nunca serve /admin.
const AdminApp = env.adminEnabled ? require('./admin/AdminApp').default : null;
import { SessionProvider, useSession } from './session';
import { colors, layout, shadows } from './theme';

const Stack = createNativeStackNavigator();

const stackOptions = { headerShown: false, animation: 'fade' };

// PRODUCTION: nenhuma tela financeira do SANDBOX (todas em cima de dados
// mock) pode ser exibida pra um cliente real autenticado — ver
// ProductionHomePlaceholderScreen. DEMO/SANDBOX continuam com a stack
// completa de sempre, sem nenhuma mudança.
function AuthenticatedStack() {
  if (isProductionMode) {
    return (
      <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name="Home" component={ProductionHomePlaceholderScreen} />
        {/* KYC real (Customer Identity), Etapa 1 — único destino financeiro
            além do placeholder em PRODUCTION até o núcleo real existir. */}
        <Stack.Screen name="KycPersonalInfo" component={KycPersonalInfoScreen} />
      </Stack.Navigator>
    );
  }
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

// PRODUCTION troca "ForgotPassword"/"Onboarding" pelas telas reais
// (Customer Identity) mantendo os MESMOS nomes de rota — LoginScreen
// (component('ForgotPassword')/navigate('Onboarding')) não precisa saber
// qual modo está ativo. DEMO/SANDBOX continuam com os componentes mock
// de sempre, sem nenhuma mudança.
function PublicStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={isProductionMode ? CustomerForgotPasswordScreen : ForgotPasswordScreen} />
      <Stack.Screen name="Onboarding" component={isProductionMode ? CustomerRegisterScreen : OnboardingScreen} />
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

export default function LegacyApp() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  // Se a fonte falhar ao carregar (ex.: offline na primeira instalação), seguimos
  // com o fallback do sistema em vez de travar o app numa tela de carregamento.
  if (!fontsLoaded && !fontError) return <LoadingState label="Preparando identidade visual…" />;
  // Painel Administrativo: árvore totalmente separada da área do cliente,
  // sem WebFrame (precisa da largura cheia do desktop, não da moldura de
  // celular) e sem a sessão/navegação do app cliente. Só existe no Web.
  // Build sem configuração válida: nunca abre um modo inseguro ou de
  // demonstração — só a tela de serviço indisponível.
  if (AdminApp && Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
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
          {/* Aviso sempre visível fora de PRODUCTION (DEMO/SANDBOX). */}
          <DemoEnvironmentBadge />
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
