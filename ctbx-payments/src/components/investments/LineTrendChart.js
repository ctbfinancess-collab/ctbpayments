import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../../theme';

// Gráfico de linha genérico (percentual ou moeda — quem chama define a
// escala via min/max) reaproveitado pela aba "Rentabilidade", pela tela de
// detalhe de posição ("Evolução do investimento") e pela aba "Gráficos" da
// conta global. `dots`/`highlightIndex`/`gradientColors` são opt-in (default
// sem pontos e linha lisa roxa, como antes) — só a conta global usa até
// agora, pro visual do mockup com marcadores e gradiente de cor.
export default function LineTrendChart({ dots = false, gradientColors, height = 130, highlightIndex, max, min, points, width = 260 }) {
  const stepX = width / (points.length - 1);
  const scaleY = (value) => height - ((value - min) / (max - min)) * height;
  const path = points.map((value, index) => `${index === 0 ? 'M' : 'L'} ${index * stepX} ${scaleY(value)}`).join(' ');
  const gradientId = 'lineTrendGradient';
  const strokeColor = gradientColors ? `url(#${gradientId})` : colors.purple400;
  return (
    <Svg height={height} width={width}>
      {gradientColors ? (
        <Defs>
          {/* x1/x2 em porcentagem (objectBoundingBox, o padrão do SVG) — usar
              valores em pixel aqui faria o degradê inteiro cair fora da área
              visível do path, e a linha renderizaria só na 1ª cor. */}
          <LinearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            {gradientColors.map((color, index) => (
              <Stop key={color} offset={index / (gradientColors.length - 1)} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
      ) : null}
      <Path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={colors.purpleAlpha20} stroke="none" />
      <Path d={path} fill="none" stroke={strokeColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
      {dots ? points.map((value, index) => (
        <Circle
          key={index}
          cx={index * stepX}
          cy={scaleY(value)}
          fill={index === highlightIndex ? colors.white : colors.purple400}
          r={index === highlightIndex ? 5 : 3.5}
          stroke={colors.navy900}
          strokeWidth={index === highlightIndex ? 2 : 1.5}
        />
      )) : null}
    </Svg>
  );
}
