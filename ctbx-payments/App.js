import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
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
import TransportCardScreen from './src/screens/cards/TransportCardScreen';
import ServicesScreen from './src/screens/services/ServicesScreen';
import InvestmentsScreen from './src/screens/services/investments/InvestmentsScreen';
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
import ProfileScreen from './src/screens/profile/ProfileScreen';
import ProfilePersonalDataScreen from './src/screens/profile/ProfilePersonalDataScreen';
import ProfileAccountDataScreen from './src/screens/profile/ProfileAccountDataScreen';
import ProfilePhotoScreen from './src/screens/profile/ProfilePhotoScreen';
import ProfileBiometricsScreen from './src/screens/profile/ProfileBiometricsScreen';
import ProfileDevicesScreen from './src/screens/profile/ProfileDevicesScreen';
import ProfileTokenScreen from './src/screens/profile/ProfileTokenScreen';
import ProfileTermsScreen from './src/screens/profile/ProfileTermsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
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
        <Stack.Screen name="TransportCard" component={TransportCardScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="Investments" component={InvestmentsScreen} />
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
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ProfilePersonalData" component={ProfilePersonalDataScreen} />
        <Stack.Screen name="ProfileAccountData" component={ProfileAccountDataScreen} />
        <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
        <Stack.Screen name="ProfileBiometrics" component={ProfileBiometricsScreen} />
        <Stack.Screen name="ProfileDevices" component={ProfileDevicesScreen} />
        <Stack.Screen name="ProfileToken" component={ProfileTokenScreen} />
        <Stack.Screen name="ProfileTerms" component={ProfileTermsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
