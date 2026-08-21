// Paleta dedicada do Painel Administrativo CTBX — deliberadamente separada da
// paleta navy do app cliente (src/theme/colors.js). O brief do admin pede
// fundo preto/grafite neutro, evitando grandes áreas azuis; os tons de marca
// (azul/roxo/laranja CTBX) aparecem só como acento pontual (seleção, links,
// pequenos destaques). Cores funcionais (verde/amarelo/vermelho) são
// reservadas exclusivamente para status.
import { colors as clientColors } from '../../theme';

const adminColors = {
  // Fundos
  background: '#0A0A0C',
  surface: '#111113',
  surfaceElevated: '#17171A',
  card: '#1A1A1D',
  sidebar: '#0D0D0F',
  topbar: '#0D0D0F',

  // Bordas
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',

  // Texto
  textPrimary: '#F5F5F7',
  textSecondary: '#A3A3AB',
  textMuted: '#6B6B72',

  // Acento de marca CTBX — uso pontual (seleção, links, ícones ativos)
  accentBlue: clientColors.navy700,
  accentPurple: clientColors.purple500,
  accentPurpleSoft: clientColors.purple400,
  accentOrange: clientColors.orange500,

  // Status funcional
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.16)',
  warning: '#EAB308',
  warningSoft: 'rgba(234, 179, 8, 0.16)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.16)',
  info: clientColors.purple400,
  infoSoft: 'rgba(119, 105, 232, 0.16)',
};

export default adminColors;
