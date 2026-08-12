import React from 'react';
import { colors, shadows } from '../../theme';
import ButtonBase from './_ButtonBase';

export default function PrimaryButton(props) {
  return <ButtonBase backgroundColor={colors.primary} shadowStyle={shadows.glowPurple} {...props} />;
}
