import React from 'react';
import { colors } from '../../theme';
import ButtonBase from './_ButtonBase';

export default function OutlineButton(props) {
  return (
    <ButtonBase
      backgroundColor={colors.transparent}
      borderColor={colors.primary}
      textColor={colors.purple300}
      {...props}
    />
  );
}
