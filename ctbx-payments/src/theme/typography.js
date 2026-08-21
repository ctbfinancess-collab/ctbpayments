// Poppins é a fonte oficial da identidade CTBX Payments (ver src/App.js, que
// carrega estes pesos via @expo-google-fonts/poppins antes de montar a árvore
// de navegação — por isso é seguro referenciá-los diretamente aqui).
const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  preferred: 'Poppins_400Regular',
};

const typography = {
  fontFamily,
  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 17,
    xl: 20,
    xxl: 24,
  },
  lineHeight: {
    xs: 16,
    sm: 17,
    md: 21,
    lg: 23,
    xl: 27,
    xxl: 31,
  },
  display: { fontFamily: fontFamily.bold, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 35 },
  heading1: { fontFamily: fontFamily.bold, fontSize: 24, fontWeight: '700', lineHeight: 31 },
  heading2: { fontFamily: fontFamily.semibold, fontSize: 20, fontWeight: '600', lineHeight: 27 },
  heading3: { fontFamily: fontFamily.semibold, fontSize: 17, fontWeight: '600', lineHeight: 23 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, fontWeight: '400', lineHeight: 21 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 14, fontWeight: '500', lineHeight: 21 },
  label: { fontFamily: fontFamily.semibold, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  caption: { fontFamily: fontFamily.regular, fontSize: 11, fontWeight: '400', lineHeight: 16 },
  button: { fontFamily: fontFamily.semibold, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  balance: { fontFamily: fontFamily.bold, fontSize: 28, fontWeight: '700', letterSpacing: -0.4, lineHeight: 36 },
  eyebrow: { fontFamily: fontFamily.semibold, fontSize: 11, fontWeight: '600', letterSpacing: 1.4, lineHeight: 16, textTransform: 'uppercase' },
  input: { fontFamily: fontFamily.regular, fontSize: 15, fontWeight: '400', lineHeight: 21 },
};

export default typography;
