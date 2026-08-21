import React, { useEffect, useState } from 'react'; import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'; import PixLayout, { PIX_COLORS } from '../../components/pix/PixLayout'; import { EmptyState, ErrorState, Icon, LoadingState, ModalSheet, PrimaryButton } from '../../components/ui'; import { getFavorites, lookupKey, removeFavorite, renameFavorite } from '../../services/pixService'; import useAsyncResource from '../../hooks/useAsyncResource'; import { colors } from '../../theme';
function initials(name) { return (name || '').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
export default function PixFavoritesScreen({ navigation }) {
  const { data: loaded, error, loading, retry } = useAsyncResource(getFavorites, []);
  const [favorites, setFavorites] = useState([]);
  const [editing, setEditing] = useState(null);
  const [nickname, setNickname] = useState('');
  useEffect(() => { setFavorites(loaded); }, [loaded]);

  const selectFavorite = async (favorite) => { try { navigation.navigate('PixTransfer', { transfer: await lookupKey({ key: favorite.key, keyType: favorite.type }) }); } catch { Alert.alert('Serviço indisponível', 'A consulta PIX ainda não está configurada.'); } };
  const openEdit = (favorite) => { setEditing(favorite); setNickname(favorite.name); };
  const saveEdit = async () => { if (!nickname.trim()) return Alert.alert('Informe um apelido'); try { const updated = await renameFavorite(editing, nickname.trim()); setFavorites((current) => current.map((item) => item.id === editing.id ? updated : item)); setEditing(null); } catch { Alert.alert('Serviço indisponível', 'Não foi possível renomear este favorito agora.'); } };
  const remove = (favorite) => Alert.alert('Remover favorito?', favorite.name, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Remover', style: 'destructive', onPress: async () => { try { await removeFavorite(favorite); setFavorites((current) => current.filter((item) => item.id !== favorite.id)); } catch { Alert.alert('Serviço indisponível', 'Não foi possível remover este favorito agora.'); } } }]);

  if (loading) return <PixLayout navigation={navigation} title="Favoritos"><LoadingState /></PixLayout>;
  if (error) return <PixLayout navigation={navigation} title="Favoritos"><ErrorState message="Não foi possível carregar os favoritos." onRetry={retry} /></PixLayout>;
  return (
    <PixLayout navigation={navigation} title="Favoritos">
      <Text style={styles.title}>Escolha um favorito</Text>
      {favorites.length ? favorites.map((favorite) => (
        <View key={favorite.id} style={styles.card}>
          <TouchableOpacity onPress={() => selectFavorite(favorite)} style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(favorite.name)}</Text></View>
            <View style={styles.copy}>
              <Text style={styles.name}>{favorite.name}</Text>
              <Text style={styles.key}>{favorite.key}</Text>
              <Text style={styles.bank}>{favorite.bank}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityLabel="Editar apelido" onPress={() => openEdit(favorite)} style={styles.actionButton}><Icon color={PIX_COLORS.secondary} name="create-outline" size={17} /></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Remover favorito" onPress={() => remove(favorite)} style={styles.actionButton}><Icon color={colors.danger} name="trash-outline" size={17} /></TouchableOpacity>
          </View>
        </View>
      )) : <EmptyState message="Nenhum favorito cadastrado." />}

      <ModalSheet onClose={() => setEditing(null)} title="Editar apelido" visible={Boolean(editing)}>
        <TextInput onChangeText={setNickname} placeholder="Apelido do favorito" placeholderTextColor={colors.textMuted} style={styles.input} value={nickname} />
        <PrimaryButton onPress={saveEdit} style={styles.saveButton}>Salvar</PrimaryButton>
      </ModalSheet>
    </PixLayout>
  );
}
const styles = StyleSheet.create({ title: { color: PIX_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 18 }, card: { alignItems: 'center', backgroundColor: PIX_COLORS.card, borderColor: PIX_COLORS.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 15 }, row: { alignItems: 'center', flex: 1, flexDirection: 'row' }, avatar: { alignItems: 'center', backgroundColor: colors.purpleAlpha20, borderRadius: 20, height: 40, justifyContent: 'center', marginRight: 12, width: 40 }, avatarText: { color: colors.purple300, fontSize: 13, fontWeight: '700' }, copy: { flex: 1 }, name: { color: PIX_COLORS.text, fontSize: 14, fontWeight: '700' }, key: { color: PIX_COLORS.secondary, fontSize: 12, marginTop: 5 }, bank: { color: PIX_COLORS.accent, fontSize: 11, marginTop: 5 }, actions: { flexDirection: 'row', gap: 6, marginLeft: 8 }, actionButton: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 }, input: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle, borderRadius: 14, borderWidth: 1, color: colors.textPrimary, marginTop: 6, padding: 14 }, saveButton: { marginTop: 18 } });
