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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
