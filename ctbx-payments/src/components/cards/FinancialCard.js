import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors, radii } from '../../theme';

// Arte por cor — mesmos arquivos oficiais enviados para a tela "Solicitar
// cartão". `blue` é a cor padrão usada em Home/Cartões/Detalhes do cartão.
export const CARD_COLOR_ASSETS = {
  blue: require('../../../assets/ctbx-card-financial.png'),
  orange: require('../../../assets/ctbx-card-financial-orange.png'),
  green: require('../../../assets/ctbx-card-financial-green.png'),
  purple: require('../../../assets/ctbx-card-financial-purple.png'),
  black: require('../../../assets/ctbx-card-financial-black.png'),
};

export default function FinancialCard({ card, color = 'blue' }) {
  return (
    <View style={styles.card}>
      <Image
        accessibilityLabel={`Cartão CTBX final ${card.lastFour}`}
        resizeMode="cover"
        source={CARD_COLOR_ASSETS[color] || CARD_COLOR_ASSETS.blue}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 1638 / 960, backgroundColor: colors.navy800, borderColor: colors.purple400, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', width: '100%' },
  image: { borderRadius: radii.xl, height: '100%', width: '100%' },
});
