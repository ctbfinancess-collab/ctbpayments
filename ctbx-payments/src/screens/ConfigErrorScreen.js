import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Mostrada quando o build não tem configuração válida (ver configError em
// src/config/env.js). Nunca expõe detalhes técnicos ao cliente; o motivo
// exato só vai para o console, para quem estiver publicando.
export default function ConfigErrorScreen() {
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.error('[ctbx-app] Configuração inválida:', require('../config/env').configError);
  }
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Serviço temporariamente indisponível</Text>
      <Text style={styles.text}>Estamos ajustando a Área do Cliente. Tente novamente em alguns minutos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', backgroundColor: '#1C1E21', flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#F4F4F2', fontSize: 20, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  text: { color: '#BFC2C7', fontSize: 15, lineHeight: 22, maxWidth: 420, textAlign: 'center' },
});
