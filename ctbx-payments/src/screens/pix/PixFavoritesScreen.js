import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { MOCK_PIX_FAVORITES, buildMockPixTransfer } from '../../data/pixMockData';

export default function PixFavoritesScreen({ navigation }) {
  const selectFavorite = (favorite) => {
    navigation.navigate('PixTransfer', {
      transfer: buildMockPixTransfer({ key: favorite.key, keyType: favorite.type }),
    });
  };

  return (
    <PixLayout navigation={navigation} title="Favoritos PIX">
      <Text style={styles.title}>Selecione um favorito</Text>
      {MOCK_PIX_FAVORITES.map((favorite) => (
        <TouchableOpacity key={favorite.id} activeOpacity={0.75} onPress={() => selectFavorite(favorite)} style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.name}>{favorite.name}</Text>
            <Text style={styles.detail}>Chave: {favorite.key}</Text>
            <Text style={styles.detail}>Banco: {favorite.bank}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: PIX_COLORS.text, fontSize: 16, marginBottom: 20 },
  card: {
    alignItems: 'center', backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.border,
    borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 15,
  },
  cardContent: { flex: 1 },
  name: { color: PIX_COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 5 },
  detail: { color: PIX_COLORS.secondary, fontSize: 12, marginTop: 2 },
  chevron: { color: PIX_COLORS.accent, fontSize: 26 },
});
