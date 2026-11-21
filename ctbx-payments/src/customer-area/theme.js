// Identidade da Área do Cliente (Fase 3) — a MESMA do site institucional
// (ctbx-site/src/styles/global.css, aprovada em 19/11/2026): grafite
// escuro, prata e dourado suave só nos detalhes; Inter para textos e
// Cormorant Garamond só nos grandes títulos dourados.
export const ca = Object.freeze({
  bg: '#141619',
  bgRaised: '#1C1E21',
  surface: '#232529',
  surfaceHigh: '#2C2F33',
  border: 'rgba(191, 194, 199, 0.14)',
  borderStrong: 'rgba(191, 194, 199, 0.28)',
  text: '#F4F4F2',
  textSoft: '#BFC2C7',
  textMuted: '#8E9298',
  silver: '#D4D6DA',
  gold: '#C5A46C',
  goldLight: '#D9BF8E',
  goldTitle: '#E6CD9C',
  goldGradient: ['#E6CC97', '#C5A46C', '#A98A52'],
  onGold: '#1C1D20',
  success: '#7FB88F',
  successBg: 'rgba(127, 184, 143, 0.12)',
  danger: '#E08A80',
  dangerBg: 'rgba(224, 138, 128, 0.12)',
  info: '#BFC2C7',
  infoBg: 'rgba(191, 194, 199, 0.08)',
  warning: '#D9BF8E',
  warningBg: 'rgba(197, 164, 108, 0.12)',
});

export const fonts = Object.freeze({
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  serif: 'CormorantGaramond_500Medium',
  serifSemibold: 'CormorantGaramond_600SemiBold',
});

// Larguras de quebra do layout web (mesma lógica do site: celular,
// tablet e computador).
export const breakpoints = Object.freeze({ tablet: 720, desktop: 1024 });
