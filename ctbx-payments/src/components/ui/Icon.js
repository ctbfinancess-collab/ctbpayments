import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

// Camada única sobre @expo/vector-icons: centraliza a família de ícone usada
// no app (Ionicons, estilo outline, igual à referência visual) para que uma
// eventual troca de biblioteca no futuro mude só este arquivo.
export default function Icon({ color = colors.textPrimary, name, size = 20, style }) {
  return <Ionicons color={color} name={name} size={size} style={style} />;
}
