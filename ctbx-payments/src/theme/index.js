export { default as colors } from './colors';
export { default as gradients } from './gradients';
export { default as layout } from './layout';
export { default as radii } from './radii';
export { default as shadows } from './shadows';
export { default as spacing } from './spacing';
export { default as typography } from './typography';

import colors from './colors';
import gradients from './gradients';
import layout from './layout';
import radii from './radii';
import shadows from './shadows';
import spacing from './spacing';
import typography from './typography';

const theme = { colors, gradients, layout, radii, shadows, spacing, typography };

export default theme;
