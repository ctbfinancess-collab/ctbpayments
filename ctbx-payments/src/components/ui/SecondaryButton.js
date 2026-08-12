import React from 'react';
import { colors } from '../../theme';
import ButtonBase from './_ButtonBase';

export default function SecondaryButton(props) {
  return <ButtonBase backgroundColor={colors.surfaceElevated} borderColor={colors.borderStrong} {...props} />;
}
