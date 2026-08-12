import React, { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout';
import { PixButton } from '../../components/pix/PixForm';
import useAsyncResource from '../../hooks/useAsyncResource';
import { deleteKey, getKeys } from '../../services/pixService';

export default function PixKeysScreen({ navigation, route }) {
  const { data: loadedKeys } = useAsyncResource(getKeys, []);
  const [keys, setKeys] = useState([]);

  useEffect(() => {
    setKeys(loadedKeys);
  }, [loadedKeys]);

  useEffect(() => {
    const createdKey = route.params?.createdKey;
    if (createdKey) {
      setKeys((current) => current.some((item) => item.id === createdKey.id)
        ? current
        : [...current, createdKey]);
    }
  }, [route.params?.createdKey]);

  const removeKey = (key) => {
    Alert.alert('Excluir chave', 'Deseja realmente excluir sua chave?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', style: 'destructive', onPress: async () => { try { await deleteKey(key); setKeys((current) => current.filter((item) => item.id !== key.id)); } catch { Alert.alert('Serviço indisponível'); } } },
    ]);
  };

  return (
    <PixLayout navigation={navigation} title="Minhas Chaves">
      <Text style={styles.title}>Minhas chaves</Text>
      {keys.length === 0 ? <Text style={styles.empty}>Sem chave cadastrada</Text> : null}
      {keys.map((item) => (
        <View key={item.id} style={styles.keyCard}>
          <View style={styles.keyContent}>
            <Text style={styles.keyType}>Chave: {item.type}</Text>
            <Text selectable style={styles.keyValue}>{item.value}</Text>
            <Text style={styles.keyStatus}>{item.status}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => Share.share({ message: item.value })} style={styles.actionButton}>
              <Text style={styles.actionText}>Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeKey(item)} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <PixButton onPress={() => navigation.navigate('PixCreateKey')}>+ CADASTRAR CHAVE</PixButton>
      <Text style={styles.mockNote}>Cadastro e exclusão são locais; a API PIX não é chamada.</Text>
    </PixLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: PIX_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 18 },
  empty: { color: PIX_COLORS.secondary, fontSize: 13, marginBottom: 18 },
  keyCard: { backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.border, borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 14 },
  keyContent: { marginBottom: 12 },
  keyType: { color: PIX_COLORS.secondary, fontSize: 11 },
  keyValue: { color: PIX_COLORS.text, fontSize: 14, fontWeight: '600', marginTop: 5 },
  keyStatus: { color: PIX_COLORS.success, fontSize: 11, marginTop: 5 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { paddingVertical: 6 },
  actionText: { color: PIX_COLORS.accent, fontSize: 12 },
  deleteButton: { paddingVertical: 6 },
  deleteText: { color: PIX_COLORS.danger, fontSize: 12 },
  mockNote: { color: PIX_COLORS.secondary, fontSize: 11, marginTop: 14, textAlign: 'center' },
});
