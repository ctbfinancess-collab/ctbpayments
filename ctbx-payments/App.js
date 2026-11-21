import React from 'react';
import ConfigErrorScreen from './src/screens/ConfigErrorScreen';
import CustomerAreaApp from './src/customer-area/CustomerAreaApp';
import { configError } from './src/config';

// Área do Cliente (Fase 3): no modo PRODUCTION o app inteiro é a Área do
// Cliente nova (visual do site, layout web, um endereço por página).
// O app antigo de demonstração (src/LegacyApp.js) só é incluído em builds
// DEMO/SANDBOX: a comparação abaixo usa a variável gravada no build, então
// o pacote de produção nem contém aquele código nem seus dados fictícios.
const LegacyApp = process.env.EXPO_PUBLIC_APP_MODE === 'PRODUCTION' ? null : require('./src/LegacyApp').default;

export default function App() {
  if (configError) return <ConfigErrorScreen />;
  if (!LegacyApp) return <CustomerAreaApp />;
  return <LegacyApp />;
}
