import React from 'react';
import ConfigErrorScreen from './src/screens/ConfigErrorScreen';
import { configError } from './src/config';

// Três apps no mesmo projeto, escolhidos NA HORA DO BUILD (variáveis
// gravadas no pacote, então cada pacote só contém o próprio código):
//  - EXPO_PUBLIC_APP_TARGET=STAFF → painel da equipe (análise de KYC);
//  - EXPO_PUBLIC_APP_MODE=PRODUCTION → Área do Cliente (Fase 3);
//  - DEMO/SANDBOX → app antigo de demonstração (src/LegacyApp.js).
const IS_STAFF = process.env.EXPO_PUBLIC_APP_TARGET === 'STAFF';
const StaffApp = IS_STAFF ? require('./src/staff-area/StaffApp').default : null;
const CustomerAreaApp = !IS_STAFF && process.env.EXPO_PUBLIC_APP_MODE === 'PRODUCTION' ? require('./src/customer-area/CustomerAreaApp').default : null;
const LegacyApp = !IS_STAFF && process.env.EXPO_PUBLIC_APP_MODE !== 'PRODUCTION' ? require('./src/LegacyApp').default : null;

export default function App() {
  if (configError) return <ConfigErrorScreen />;
  if (StaffApp) return <StaffApp />;
  if (CustomerAreaApp) return <CustomerAreaApp />;
  return <LegacyApp />;
}
