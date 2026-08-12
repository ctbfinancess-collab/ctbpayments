// Poppins sera ativada aqui quando os arquivos locais forem adicionados e
// carregados no bootstrap. O fallback preserva compatibilidade imediata.
const fontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  preferred: 'Poppins',
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
  display: { fontFamily: fontFamily.bold, fontSize: 30, fontWeight: '700', lineHeight: 38 },
  heading1: { fontFamily: fontFamily.bold, fontSize: 24, fontWeight: '700', lineHeight: 31 },
  heading2: { fontFamily: fontFamily.semibold, fontSize: 20, fontWeight: '600', lineHeight: 27 },
  heading3: { fontFamily: fontFamily.semibold, fontSize: 17, fontWeight: '600', lineHeight: 23 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, fontWeight: '400', lineHeight: 21 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 14, fontWeight: '500', lineHeight: 21 },
  label: { fontFamily: fontFamily.semibold, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  caption: { fontFamily: fontFamily.regular, fontSize: 11, fontWeight: '400', lineHeight: 16 },
  button: { fontFamily: fontFamily.semibold, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  balance: { fontFamily: fontFamily.bold, fontSize: 26, fontWeight: '700', lineHeight: 34 },
};

export default typography;
