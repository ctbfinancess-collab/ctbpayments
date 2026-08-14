import { Platform, useWindowDimensions } from 'react-native';
import { layout } from '../theme';

// No nativo, a largura da janela É a largura do app. No Expo Web, App.js
// centraliza o app numa moldura de largura fixa (ver layout.webFrameWidth)
// para preservar a proporção de celular no navegador — então qualquer tela
// que calcule tamanhos a partir da largura da janela (carrosséis, cards com
// snap, grids) deve usar este hook em vez de useWindowDimensions() direto,
// ou o cálculo usa a largura do navegador inteiro em vez da moldura.
export default function useAppWidth() {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return width;
  return Math.min(width, layout.webFrameWidth);
}
