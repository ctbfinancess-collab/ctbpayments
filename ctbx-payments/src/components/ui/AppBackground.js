import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme';

// Camada atmosférica contínua. O gradiente ocupa toda a viewport e não usa
// formas circulares chapadas: assim nenhuma borda geométrica dura aparece
// atrás do conteúdo — só o arco (quando `arc`) desenha uma linha real.
const VARIANTS = {
  default: {
    colors: [colors.background, colors.backgroundSecondary, '#050F1E'],
    locations: [0, 0.52, 1],
  },
  homePremium: {
    colors: ['#0D1B2A', '#081B31', '#061426', '#07182A', '#050F1E'],
    locations: [0, 0.2, 0.5, 0.76, 1],
  },
  login: {
    colors: ['#0A1830', colors.background, '#050F1E'],
    locations: [0, 0.55, 1],
  },
};

// Arco fino e brilhante cruzando a tela na diagonal, com dois pontos de brilho
// (glow) mais intensos — referência visual oficial do fundo do Login.
// viewBox fixo em proporção ~1:2 (celular); preserveAspectRatio="none" estica
// pro tamanho real da tela, então uma leve elipse é esperada/aceitável.
function ArcGlow() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 200" preserveAspectRatio="none">
      <Defs>
        <RadialGradient cx="86" cy="13" gradientUnits="userSpaceOnUse" id="arcTipA" r="9">
          <Stop offset="0" stopColor="#5B9BFF" stopOpacity="0.95" />
          <Stop offset="0.45" stopColor="#3B78E8" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#3B78E8" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient cx="5" cy="167" gradientUnits="userSpaceOnUse" id="arcTipB" r="9">
          <Stop offset="0" stopColor="#5B9BFF" stopOpacity="0.95" />
          <Stop offset="0.45" stopColor="#3B78E8" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#3B78E8" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="-35" cy="95" fill="none" r="132" stroke="rgba(70,140,255,0.32)" strokeWidth="0.5" />
      <Circle cx="86" cy="13" fill="url(#arcTipA)" r="9" />
      <Circle cx="5" cy="167" fill="url(#arcTipB)" r="9" />
    </Svg>
  );
}

export default function AppBackground({ arc = false, backgroundSource, children, style, variant = 'default' }) {
  const config = VARIANTS[variant] || VARIANTS.default;
  const premiumHome = variant === 'homePremium';

  return (
    <View style={[styles.root, style]}>
      {backgroundSource ? (
        // Arte oficial (mapa-múndi + glow), usada como está. Sem
        // absoluteFillObject sozinho — no Expo Web isso não força largura
        // real e a imagem renderiza no tamanho nativo do arquivo (mesma
        // causa do bug já corrigido em AuthLayout).
        <Image pointerEvents="none" resizeMode="cover" source={backgroundSource} style={styles.backgroundImage} />
      ) : (
        <LinearGradient
          colors={config.colors}
          end={{ x: 0.5, y: 1 }}
          locations={config.locations}
          pointerEvents="none"
          start={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {premiumHome ? (
        <>
          <LinearGradient
            colors={['rgba(10,45,94,0.34)', 'rgba(10,45,94,0.05)', 'rgba(10,45,94,0)']}
            end={{ x: 0.82, y: 0.74 }}
            locations={[0, 0.48, 1]}
            pointerEvents="none"
            start={{ x: 0.06, y: 0.02 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(94,107,255,0)', 'rgba(94,107,255,0.055)', 'rgba(94,107,255,0)']}
            end={{ x: 0.08, y: 1 }}
            locations={[0, 0.57, 1]}
            pointerEvents="none"
            start={{ x: 0.94, y: 0.08 }}
            style={StyleSheet.absoluteFillObject}
          />
        </>
      ) : null}
      {arc ? <ArcGlow /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
  backgroundImage: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
});
