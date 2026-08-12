import React from 'react';
import { colors, shadows } from '../../theme';
import ButtonBase from './_ButtonBase';

export default function ConfirmationButton(props) {
  return <ButtonBase backgroundColor={colors.confirmation} shadowStyle={shadows.glowOrange} {...props} />;
}
