import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../components/ui';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection } from '../components/DetailDrawer';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import {
  AdminCmsError, BANNER_STATUS_OPTIONS, LINK_STATUS_OPTIONS, NAV_GROUPS, PRODUCT_STATUS_OPTIONS, bannerValueFromFields,
  createBanner, createLink, createNavItem, createProduct, createService, createText, deleteBanner, deleteLink,
  deleteNavItem, deleteProduct, deleteService, deleteText, linkValueFromFields, listBanners, listCmsSection,
  listLinks, listNavItems, listProducts, listServices, listTexts, navItemValueFromFields, productValueFromFields,
  serviceValueFromFields, textValueFromFields, updateBanner, updateCmsSectionItem, updateLink, updateNavItem,
  updateProduct, updateService, updateText,
} from '../services/adminCmsClient';
import {
  ALLOWED_IMAGE_MIME_TYPES, MediaUploadError, destroyCloudinaryMedia, listPersistedMedia, uploadImageToCloudinary, validateImageFile,
} from '../services/mediaUploadService';
import {
  ADMIN_CMS_STATS, ADMIN_CMS_TABS,
  ADMIN_CMS_MEDIA,
  ADMIN_CMS_HISTORY,
  CMS_STATUS_TONE, BANNER_STATUS_TONE, MEDIA_STATUS_TONE, LINK_STATUS_TONE,
} from '../data/adminMockData';

// Área "Conteúdo / CMS". A partir desta etapa, a biblioteca de mídia tem
// upload real para o Cloudinary (ver ../services/mediaUploadService) — o
// resto (rascunho/publicar/versão, textos, links, navegação etc.) continua
// estrutural/mock/read-only como antes.
// Nunca exibe senha, token, API key, secret, credencial, private key, dados
// bancários, CVV ou PIN — e a biblioteca de mídia nunca expõe credenciais do
// Cloudinary: o navegador só recebe uma assinatura de upload de curta
// duração gerada pelo backend (CLOUDINARY_API_SECRET nunca sai de lá).
//
// Troca de imagem: a seleção feita no seletor de mídia (biblioteca) É
// aplicada de verdade ao card/drawer, mas só em memória desta sessão do
// navegador (useState) — não persiste em nenhum backend/arquivo, e some ao
// recarregar a página (mesmo modelo de antes; só o upload passou a ser
// real). Mídia enviada nesta sessão ("uploadedMedia") entra na mesma
// biblioteca in-memory e pode ser reaproveitada em qualquer outro
// card/drawer até a página ser recarregada.
const MEDIA_ICON = { Imagem: 'image-outline', Banner: 'image-outline', Logo: 'shapes-outline', Ícone: 'apps-outline', Vídeo: 'videocam-outline' };
const CMS_FLOW_ACTIONS = ['Editar', 'Salvar rascunho', 'Pré-visualizar', 'Publicar', 'Descartar alteração', 'Restaurar versão anterior'];
const HOME_QUICK_ACTIONS = ['Editar', 'Ativar/Desativar', 'Mover para cima', 'Mover para baixo', 'Pré-visualizar'];
const MEDIA_TOOLBAR_ACTIONS = ['Enviar mídia', 'Substituir', 'Ver usos', 'Copiar referência', 'Arquivar'];
// Blocos de Home/Login que representam mídia (imagem/banner/logo/ícone/
// fundo) — os únicos que ganham o controle de troca de imagem no card.
const HOME_MEDIA_IDS = new Set(['home-4', 'home-5', 'home-7', 'home-8', 'home-9']);
const LOGIN_MEDIA_IDS = new Set(['login-1', 'login-4']);
// Únicos campos de SEO que são imagem (os demais são texto/URL/palavras-chave).
const SEO_MEDIA_IDS = new Set(['SEO-03', 'SEO-10']);
const PICKER_SUBTABS = [{ id: 'library', label: 'Biblioteca' }, { id: 'upload', label: 'Enviar novo' }];
const MEDIA_TYPE_TABS = [{ id: 'all', label: 'Todos' }, { id: 'Imagem', label: 'Imagem' }, { id: 'Banner', label: 'Banner' }, { id: 'Logo', label: 'Logo' }, { id: 'Ícone', label: 'Ícone' }, { id: 'Vídeo', label: 'Vídeo' }];

// 'none' é o sentinel de "removido explicitamente" — diferente de undefined
// (que significa "usar o mediaId padrão do mock"). mediaLibrary é o mock
// (ADMIN_CMS_MEDIA) + qualquer mídia real enviada nesta sessão.
function resolveMedia(mediaKey, fallbackMediaId, mediaOverrides, mediaLibrary) {
  const override = mediaOverrides[mediaKey];
  if (override === 'none') return null;
  const id = override || fallbackMediaId;
  if (!id) return null;
  return mediaLibrary.find((media) => media.id === id) || null;
}

// Miniatura reutilizada em todo lugar que mostra uma mídia (card, drawer,
// seletor, tabela). Mídia enviada de verdade (secureUrl vindo do
// Cloudinary) mostra a imagem real; mídia mock continua com o ícone, já que
// nunca teve um arquivo real por trás.
function MediaThumb({ containerStyle, iconSize = 20, media }) {
  if (media?.secureUrl) {
    return (
      <View style={containerStyle}>
        <Image accessibilityIgnoresInvertColors resizeMode="cover" source={{ uri: media.secureUrl }} style={styles.mediaThumbImage} />
      </View>
    );
  }
  return (
    <View style={containerStyle}>
      <Icon color={adminColors.textMuted} name={media ? (MEDIA_ICON[media.type] || 'image-outline') : 'image-outline'} size={iconSize} />
    </View>
  );
}

function ActionPills({ actions, note }) {
  return (
    <View>
      <View style={styles.actionsRow}>
        {actions.map((action) => (
          <View key={action} style={styles.actionPill}>
            <Text style={styles.actionPillText}>{action}</Text>
          </View>
        ))}
      </View>
      {note ? <Text style={styles.actionsNote}>{note}</Text> : null}
    </View>
  );
}

function MediaActionButton({ label, onPress }) {
  if (!onPress) return <View style={styles.actionPill}><Text style={styles.actionPillText}>{label}</Text></View>;
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.mediaActionButton}>
      <Text style={styles.mediaActionButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

// Controle de mídia reutilizado em todo card/drawer que usa imagem, banner,
// logo, ícone ou fundo — miniatura + nome/tipo/dimensões/uso/status do
// arquivo atual, e os botões pedidos no brief. "Trocar imagem" e "Escolher
// da biblioteca" abrem o mesmo seletor (biblioteca já existente); "Enviar
// nova imagem" abre o seletor na aba de upload (estrutural); "Remover" só
// aparece quando há uma mídia selecionada.
function MediaControl({ fallbackMediaId, label, mediaKey, mediaLibrary, mediaOverrides, onOpenPicker, onRemove }) {
  const media = resolveMedia(mediaKey, fallbackMediaId, mediaOverrides, mediaLibrary);
  return (
    <View style={styles.mediaControl}>
      {label ? <Text style={styles.mediaControlLabel}>{label}</Text> : null}
      <View style={styles.mediaControlRow}>
        <MediaThumb containerStyle={styles.mediaControlThumb} media={media} />
        <View style={styles.mediaControlInfo}>
          <Text numberOfLines={1} style={styles.cardTitle}>{media ? media.name : 'Sem imagem selecionada'}</Text>
          {media ? (
            <>
              <Text numberOfLines={1} style={styles.cardFooter}>{media.type} · {media.dimensions} · {media.size}</Text>
              <StatusBadge label={media.statusLabel} tone={MEDIA_STATUS_TONE[media.statusKey]} />
            </>
          ) : (
            <Text numberOfLines={1} style={styles.cardFooter}>Escolha uma imagem da biblioteca ou envie uma nova</Text>
          )}
        </View>
      </View>
      <View style={styles.actionsRow}>
        <MediaActionButton label="Trocar imagem" onPress={() => onOpenPicker(mediaKey, 'library')} />
        <MediaActionButton label="Escolher da biblioteca" onPress={() => onOpenPicker(mediaKey, 'library')} />
        <MediaActionButton label="Enviar nova imagem" onPress={() => onOpenPicker(mediaKey, 'upload')} />
        {media ? <MediaActionButton label="Remover" onPress={() => onRemove(mediaKey)} /> : null}
        <MediaActionButton label="Pré-visualizar" />
      </View>
    </View>
  );
}

// Seletor de mídia — funciona como Modal nativo (react-native/react-native-
// web) pra cobrir a tela inteira mesmo com o conteúdo por trás rolado.
// "Biblioteca" seleciona de verdade (aplica ao card/drawer que abriu o
// seletor); "Enviar novo" é só a área visual de upload pedida no brief, sem
// envio real. Nunca mostra API key, secret, cloud name real ou credencial.
function MediaPickerModal({ mediaLibrary, onClose, onReplace, onSelect, onUploaded, target }) {
  const isReplaceMode = target.kind === 'replace';
  const [subTab, setSubTabState] = useState(target.mode === 'upload' ? 'upload' : 'library');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilterState] = useState('all');
  // Item selecionado (ainda não aplicado) na aba Biblioteca — item C/D do
  // brief: clicar um card só destaca + mostra preview; só "Usar esta
  // imagem" aplica de verdade e fecha o modal.
  const [selectedLibraryMedia, setSelectedLibraryMedia] = useState(null);
  // idle | uploading | success | error — item 10 do brief ("mostrar estados
  // de upload: enviando, concluído e erro").
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadedRecord, setUploadedRecord] = useState(null);
  const fileInputRef = useRef(null);

  // Wrappers só para deixar auditável que trocar de aba/filtro nunca fica
  // "preso" num state anterior (item F do brief).
  const setSubTab = (id) => setSubTabState(id);
  const setTypeFilter = (id) => { setTypeFilterState(id); setSelectedLibraryMedia(null); };

  const filtered = useMemo(() => mediaLibrary.filter((media) => {
    if (typeFilter !== 'all' && media.type !== typeFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return media.name.toLowerCase().includes(q) || media.usage.toLowerCase().includes(q);
  }), [mediaLibrary, query, typeFilter]);

  const resetUpload = () => { setUploadStatus('idle'); setUploadProgress(0); setUploadError(''); setUploadedRecord(null); };
  const triggerFilePicker = () => { if (Platform.OS === 'web') fileInputRef.current?.click(); };
  // Modo normal: aplica a mídia ao card/bloco que abriu o seletor. Modo
  // "substituir": não é uma seleção para um card — troca o arquivo por
  // trás de um item já existente da biblioteca (mesmo id), então fecha o
  // modal diretamente em vez de passar por onSelect/mediaOverrides.
  const confirmSelection = (media) => {
    setSelectedLibraryMedia(null);
    if (isReplaceMode) {
      onReplace(target.replaceId, media);
      onClose();
      return;
    }
    onSelect(media);
  };

  const startUpload = async (file) => {
    try {
      validateImageFile(file);
    } catch (error) {
      setUploadStatus('error');
      setUploadError(error.message);
      return;
    }
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError('');
    try {
      const record = await uploadImageToCloudinary(file, { onProgress: setUploadProgress });
      setUploadedRecord(record);
      setUploadStatus('success');
      // No modo "substituir" o registro na biblioteca só acontece se/quando
      // o usuário confirmar com "Usar esta imagem" (via onReplace) — não
      // queremos um item novo E o item substituído coexistindo.
      if (!isReplaceMode) onUploaded(record);
    } catch (error) {
      setUploadStatus('error');
      setUploadError(error instanceof MediaUploadError ? error.message : 'Não foi possível enviar esta imagem.');
    }
  };

  const handleWebFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) startUpload(file);
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isReplaceMode ? 'Substituir arquivo' : 'Selecionar mídia'}</Text>
            <TouchableOpacity accessibilityLabel="Fechar" accessibilityRole="button" onPress={onClose}>
              <Icon color={adminColors.textMuted} name="close-outline" size={20} />
            </TouchableOpacity>
          </View>
          <AdminChipGroup activeId={subTab} onSelect={setSubTab} options={PICKER_SUBTABS} />
          {subTab === 'library' ? (
            <View style={styles.modalBody}>
              <AdminSearchInput onChangeText={setQuery} placeholder="Buscar por nome ou uso..." style={styles.modalSearch} value={query} />
              <AdminChipGroup activeId={typeFilter} onSelect={setTypeFilter} options={MEDIA_TYPE_TABS} />
              <Text style={styles.resultsCountText}>{filtered.length} {filtered.length === 1 ? 'item' : 'itens'}</Text>
              <ScrollView style={styles.modalGridScroll}>
                <View style={styles.cardsGrid}>
                  {filtered.length === 0 ? <Text style={styles.emptyPickerText}>Nenhuma mídia encontrada com este filtro.</Text> : filtered.map((media) => {
                    const isSelected = selectedLibraryMedia?.id === media.id;
                    return (
                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.75}
                        key={media.id}
                        onPress={() => setSelectedLibraryMedia(media)}
                        style={[styles.pickerCard, isSelected && styles.pickerCardSelected]}
                      >
                        <MediaThumb containerStyle={styles.mediaThumb} iconSize={22} media={media} />
                        <Text numberOfLines={1} style={styles.cardTitle}>{media.name}</Text>
                        <Text numberOfLines={1} style={styles.cardFooter}>{media.type} · {media.dimensions}</Text>
                        {isSelected ? <Icon color={adminColors.accentPurpleSoft} name="checkmark-circle" size={18} style={styles.pickerCardCheck} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              {selectedLibraryMedia ? (
                <View style={styles.librarySelectionBar}>
                  <MediaThumb containerStyle={styles.mediaControlThumb} media={selectedLibraryMedia} />
                  <View style={styles.mediaControlInfo}>
                    <Text numberOfLines={1} style={styles.cardTitle}>{selectedLibraryMedia.name}</Text>
                    <Text numberOfLines={1} style={styles.cardFooter}>{selectedLibraryMedia.type} · {selectedLibraryMedia.dimensions}</Text>
                  </View>
                  <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={() => confirmSelection(selectedLibraryMedia)} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{isReplaceMode ? 'Substituir por este arquivo' : 'Usar esta imagem'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.modalBody}>
              {uploadStatus === 'idle' ? (
                <View style={styles.dropzone}>
                  <Icon color={adminColors.textMuted} name="cloud-upload-outline" size={28} />
                  <Text style={styles.dropzoneText}>Selecione uma imagem do computador</Text>
                  {Platform.OS === 'web' ? (
                    <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={triggerFilePicker} style={styles.actionPill}>
                      <Text style={styles.actionPillText}>Selecionar arquivo</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.actionsNote}>Envio de arquivo disponível na versão web do Painel Administrativo.</Text>
                  )}
                  <Text style={styles.dropzoneFormats}>Formatos permitidos: JPG, PNG, WEBP, GIF · até 8 MB</Text>
                </View>
              ) : null}
              {uploadStatus === 'uploading' ? (
                <View style={styles.dropzone}>
                  <Icon color={adminColors.textMuted} name="cloud-upload-outline" size={28} />
                  <Text style={styles.dropzoneText}>Enviando... {uploadProgress}%</Text>
                </View>
              ) : null}
              {uploadStatus === 'error' ? (
                <View style={styles.dropzone}>
                  <Icon color={adminColors.danger} name="alert-circle-outline" size={28} />
                  <Text style={styles.uploadErrorText}>{uploadError}</Text>
                  <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={resetUpload} style={styles.actionPill}>
                    <Text style={styles.actionPillText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {uploadStatus === 'success' && uploadedRecord ? (
                <View style={styles.dropzone}>
                  <MediaThumb containerStyle={styles.uploadPreviewThumb} iconSize={28} media={uploadedRecord} />
                  <Text numberOfLines={1} style={styles.dropzoneText}>{uploadedRecord.name}</Text>
                  <Text style={styles.dropzoneFormats}>{uploadedRecord.dimensions} · {uploadedRecord.size} — enviado com sucesso</Text>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={() => confirmSelection(uploadedRecord)} style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>{isReplaceMode ? 'Substituir por este arquivo' : 'Usar esta imagem'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={resetUpload} style={styles.actionPill}>
                      <Text style={styles.actionPillText}>Enviar outra</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
              {Platform.OS === 'web' ? (
                <input accept={ALLOWED_IMAGE_MIME_TYPES.join(',')} onChange={handleWebFileChange} ref={fileInputRef} style={{ display: 'none' }} type="file" />
              ) : null}
              <Text style={styles.actionsNote}>Upload real e assinado direto para o Cloudinary — a chave secreta (CLOUDINARY_API_SECRET) nunca sai do backend nem aparece no navegador.</Text>
            </View>
          )}
          <View style={styles.modalFooter}>
            <TouchableOpacity activeOpacity={0.75} onPress={onClose} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Seção de ações reaproveitada em quase todos os drawers do CMS — representa
// o fluxo futuro (editar/salvar rascunho/pré-visualizar/publicar/descartar/
// restaurar) sem nenhuma persistência real nesta etapa.
function CmsFlowSection() {
  return (
    <DetailSection title="Ações">
      <ActionPills actions={CMS_FLOW_ACTIONS} note="Fluxo estrutural — nenhuma ação salva, publica ou descarta conteúdo de verdade neste ambiente." />
    </DetailSection>
  );
}

// Home e Login compartilham a mesma estrutura de bloco (nome/valor atual/
// status/última alteração/alterado por), então usam o mesmo drawer.
const SECTION_STATUS_OPTIONS = [
  { id: 'draft', label: 'Rascunho' },
  { id: 'published', label: 'Publicado' },
];

// Home/Login — campos estruturais com edição REAL (cms_sections). "Seção"
// e "Chave" não são editáveis (são o identificador fixo do campo, ligado a
// um elemento real de UI) — só texto/descrição/status/mídia mudam.
function FieldDrawer({ item, mediaKey, mediaLibrary, mediaOverrides, onClose, onOpenPicker, onRemoveMedia, onSaved, section, sectionLabel }) {
  const [fields, setFields] = useState({ text: item.text, description: item.description });
  const [status, setStatus] = useState(item.statusKey);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const updated = await updateCmsSectionItem(item.id, section, { value: fields, status });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={item.label}>
      <DetailSection title="Conteúdo">
        <DetailRow label="Seção" value={sectionLabel} />
        <EditableField label="Descrição" onChangeText={setField('description')} value={fields.description} />
        <EditableField label="Valor atual" onChangeText={setField('text')} value={fields.text} />
      </DetailSection>
      <DetailSection title="Status">
        <AdminChipGroup activeId={status} onSelect={(id) => { setStatus(id); setSaveState('idle'); }} options={SECTION_STATUS_OPTIONS} />
      </DetailSection>
      {mediaKey ? (
        <DetailSection title="Mídia">
          <MediaControl fallbackMediaId={item.mediaId} mediaKey={mediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
          <Text style={styles.actionsNote}>A troca de imagem já persiste de verdade — igual banners e serviços.</Text>
        </DetailSection>
      ) : null}
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

// Reaproveitado por Tema/Visual e SEO/Metadados — campos simples sem
// status (cms_sections, mesma edição real do FieldDrawer). mediaKey só vem
// preenchido para os campos de SEO que são imagem (Imagem social / Open
// Graph image) — os demais tokens de Tema e campos de SEO não têm mídia,
// então o bloco "Mídia" simplesmente não aparece para eles.
function SimpleFieldDrawer({ item, mediaKey, mediaLibrary, mediaOverrides, onClose, onOpenPicker, onRemoveMedia, onSaved, section }) {
  const [fields, setFields] = useState({ text: item.text, description: item.description, swatch: item.swatch ?? '' });
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const value = { text: fields.text, description: fields.description };
      if ('swatch' in item) value.swatch = fields.swatch || null;
      const updated = await updateCmsSectionItem(item.id, section, { value });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={item.label}>
      <DetailSection title="Campo">
        <EditableField label="Descrição" onChangeText={setField('description')} value={fields.description} />
        <EditableField label="Valor atual" onChangeText={setField('text')} value={fields.text} />
      </DetailSection>
      {'swatch' in item ? (
        <DetailSection title="Preview">
          <EditableField label="Cor (hex)" onChangeText={setField('swatch')} value={fields.swatch} />
          {fields.swatch ? <View style={[styles.swatchPreview, { backgroundColor: fields.swatch }]} /> : null}
        </DetailSection>
      ) : null}
      {mediaKey ? (
        <DetailSection title="Mídia">
          <MediaControl fallbackMediaId={item.mediaId} mediaKey={mediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
          <Text style={styles.actionsNote}>A troca de imagem já persiste de verdade — igual banners e serviços.</Text>
        </DetailSection>
      ) : null}
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

// Campo de texto editável simples — reaproveitado por todos os drawers com
// edição real (banner, serviço, produto, texto, link, navegação e agora
// Home/Login/Tema/SEO).
function EditableField({ label, onChangeText, value }) {
  return (
    <View style={styles.editableField}>
      <Text style={styles.mediaControlLabel}>{label}</Text>
      <TextInput onChangeText={onChangeText} placeholderTextColor={adminColors.textMuted} style={styles.editableInput} value={value} />
    </View>
  );
}

// Único drawer do CMS com edição REAL (persistida no Postgres) nesta
// etapa. "Salvar" grava name+value+status de uma vez; "Excluir" remove o
// banner do banco de vez. Os demais drawers do CMS continuam mock.
function BannerDrawer({ banner, mediaKey, mediaLibrary, mediaOverrides, onClose, onDeleted, onOpenPicker, onRemoveMedia, onSaved }) {
  const [fields, setFields] = useState({
    name: banner.name, title: banner.title, subtitle: banner.subtitle, cta: banner.cta, link: banner.link,
    position: banner.position, startDate: banner.startDate, endDate: banner.endDate, priority: String(banner.priority ?? ''),
  });
  const [status, setStatus] = useState(banner.statusKey);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState('');
  const [deleteState, setDeleteState] = useState('idle'); // idle | deleting | error
  const [deleteError, setDeleteError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const updated = await updateBanner(banner.id, { name: fields.name, value: bannerValueFromFields(fields), status });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  const handleDelete = async () => {
    setDeleteState('deleting');
    setDeleteError('');
    try {
      await deleteBanner(banner.id);
      onDeleted(banner.id);
      onClose();
    } catch (error) {
      setDeleteState('error');
      setDeleteError(error instanceof AdminCmsError ? error.message : 'Não foi possível excluir.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={banner.name}>
      <DetailSection title="Campanha">
        <EditableField label="Nome da campanha" onChangeText={setField('name')} value={fields.name} />
        <EditableField label="Título" onChangeText={setField('title')} value={fields.title} />
        <EditableField label="Subtítulo" onChangeText={setField('subtitle')} value={fields.subtitle} />
        <EditableField label="CTA" onChangeText={setField('cta')} value={fields.cta} />
        <EditableField label="Link" onChangeText={setField('link')} value={fields.link} />
      </DetailSection>
      <DetailSection title="Mídia">
        <MediaControl fallbackMediaId={banner.mediaId} mediaKey={mediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
        <Text style={styles.actionsNote}>A troca de imagem ainda vale só nesta sessão do navegador — a persistência real de mídia entra numa próxima etapa.</Text>
      </DetailSection>
      <DetailSection title="Exibição">
        <EditableField label="Posição" onChangeText={setField('position')} value={fields.position} />
        <EditableField label="Data de início" onChangeText={setField('startDate')} value={fields.startDate} />
        <EditableField label="Data de término" onChangeText={setField('endDate')} value={fields.endDate} />
        <EditableField label="Prioridade" onChangeText={setField('priority')} value={fields.priority} />
        <Text style={styles.mediaControlLabel}>Status</Text>
        <AdminChipGroup activeId={status} onSelect={(id) => { setStatus(id); setSaveState('idle'); }} options={BANNER_STATUS_OPTIONS} />
      </DetailSection>
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={deleteState === 'deleting'} onPress={handleDelete} style={styles.destroyButton}>
          <Text style={styles.destroyButtonText}>{deleteState === 'deleting' ? 'Excluindo...' : 'Excluir banner'}</Text>
        </TouchableOpacity>
        {deleteState === 'error' ? <Text style={styles.uploadErrorText}>{deleteError}</Text> : null}
      </DetailSection>
    </DetailDrawer>
  );
}

// Segundo drawer do CMS com edição REAL (persistida no Postgres) — mesmo
// padrão do BannerDrawer. "Ícone atual" fica read-only (nome do ícone
// Ionicons usado no app cliente — trocar isso é edição de código, não de
// conteúdo, por isso fora do escopo desta etapa).
function ServiceDrawer({ mediaKey, mediaLibrary, mediaOverrides, onClose, onDeleted, onOpenPicker, onRemoveMedia, onSaved, service }) {
  const [fields, setFields] = useState({
    name: service.name, description: service.description, link: service.link, category: service.category,
    order: String(service.order ?? ''),
  });
  const [visible, setVisible] = useState(Boolean(service.visible));
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [deleteState, setDeleteState] = useState('idle');
  const [deleteError, setDeleteError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const updated = await updateService(service.id, { name: fields.name, value: serviceValueFromFields({ ...fields, icon: service.icon, visible }) });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  const handleDelete = async () => {
    setDeleteState('deleting');
    setDeleteError('');
    try {
      await deleteService(service.id);
      onDeleted(service.id);
      onClose();
    } catch (error) {
      setDeleteState('error');
      setDeleteError(error instanceof AdminCmsError ? error.message : 'Não foi possível excluir.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={service.name}>
      <DetailSection title="Card de serviço">
        <DetailRow label="Ícone atual (in-app)" value={service.icon} />
        <EditableField label="Nome" onChangeText={setField('name')} value={fields.name} />
        <EditableField label="Descrição" onChangeText={setField('description')} value={fields.description} />
        <EditableField label="Categoria" onChangeText={setField('category')} value={fields.category} />
        <EditableField label="Link interno" onChangeText={setField('link')} value={fields.link} />
        <EditableField label="Ordem" onChangeText={setField('order')} value={fields.order} />
        <Text style={styles.mediaControlLabel}>Visibilidade</Text>
        <AdminChipGroup
          activeId={visible ? 'visible' : 'hidden'}
          onSelect={(id) => { setVisible(id === 'visible'); setSaveState('idle'); }}
          options={[{ id: 'visible', label: 'Visível' }, { id: 'hidden', label: 'Oculto' }]}
        />
      </DetailSection>
      <DetailSection title="Mídia">
        <MediaControl fallbackMediaId={service.mediaId} mediaKey={mediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
        <Text style={styles.actionsNote}>A troca de imagem já persiste de verdade — igual banners.</Text>
      </DetailSection>
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={deleteState === 'deleting'} onPress={handleDelete} style={styles.destroyButton}>
          <Text style={styles.destroyButtonText}>{deleteState === 'deleting' ? 'Excluindo...' : 'Excluir serviço'}</Text>
        </TouchableOpacity>
        {deleteState === 'error' ? <Text style={styles.uploadErrorText}>{deleteError}</Text> : null}
      </DetailSection>
    </DetailDrawer>
  );
}

// Terceiro drawer do CMS com edição REAL — mesmo padrão de Banner/Serviço.
function ProductDrawer({ mediaKey, mediaLibrary, mediaOverrides, onClose, onDeleted, onOpenPicker, onRemoveMedia, onSaved, product }) {
  const [fields, setFields] = useState({
    name: product.name, category: product.category, description: product.description, cta: product.cta,
    link: product.link, audience: product.audience, publishedAt: product.publishedAt,
  });
  const [featured, setFeatured] = useState(Boolean(product.featured));
  const [status, setStatus] = useState(product.statusKey);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [deleteState, setDeleteState] = useState('idle');
  const [deleteError, setDeleteError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const updated = await updateProduct(product.id, { name: fields.name, value: productValueFromFields({ ...fields, featured }), status });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  const handleDelete = async () => {
    setDeleteState('deleting');
    setDeleteError('');
    try {
      await deleteProduct(product.id);
      onDeleted(product.id);
      onClose();
    } catch (error) {
      setDeleteState('error');
      setDeleteError(error instanceof AdminCmsError ? error.message : 'Não foi possível excluir.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={product.name}>
      <DetailSection title="Produto">
        <EditableField label="Nome" onChangeText={setField('name')} value={fields.name} />
        <EditableField label="Categoria" onChangeText={setField('category')} value={fields.category} />
        <EditableField label="Descrição" onChangeText={setField('description')} value={fields.description} />
        <Text style={styles.mediaControlLabel}>Destaque</Text>
        <AdminChipGroup
          activeId={featured ? 'yes' : 'no'}
          onSelect={(id) => { setFeatured(id === 'yes'); setSaveState('idle'); }}
          options={[{ id: 'yes', label: 'Sim' }, { id: 'no', label: 'Não' }]}
        />
        <Text style={styles.mediaControlLabel}>Status</Text>
        <AdminChipGroup activeId={status} onSelect={(id) => { setStatus(id); setSaveState('idle'); }} options={PRODUCT_STATUS_OPTIONS} />
      </DetailSection>
      <DetailSection title="Mídia">
        <MediaControl fallbackMediaId={product.mediaId} mediaKey={mediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
        <Text style={styles.actionsNote}>A troca de imagem já persiste de verdade — igual banners e serviços.</Text>
      </DetailSection>
      <DetailSection title="Exibição">
        <EditableField label="CTA" onChangeText={setField('cta')} value={fields.cta} />
        <EditableField label="Link" onChangeText={setField('link')} value={fields.link} />
        <EditableField label="Público" onChangeText={setField('audience')} value={fields.audience} />
        <EditableField label="Data de publicação" onChangeText={setField('publishedAt')} value={fields.publishedAt} />
      </DetailSection>
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={deleteState === 'deleting'} onPress={handleDelete} style={styles.destroyButton}>
          <Text style={styles.destroyButtonText}>{deleteState === 'deleting' ? 'Excluindo...' : 'Excluir produto'}</Text>
        </TouchableOpacity>
        {deleteState === 'error' ? <Text style={styles.uploadErrorText}>{deleteError}</Text> : null}
      </DetailSection>
    </DetailDrawer>
  );
}

// Quarto drawer do CMS com edição REAL — sem mídia (textos não têm
// imagem). "Chave" fica editável também (é só o "name" do item no banco).
function TextDrawer({ item, onClose, onDeleted, onSaved }) {
  const [fields, setFields] = useState({ key: item.key, screen: item.screen, section: item.section, text: item.text, language: item.language });
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [deleteState, setDeleteState] = useState('idle');
  const [deleteError, setDeleteError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const updated = await updateText(item.id, { key: fields.key, value: textValueFromFields(fields) });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  const handleDelete = async () => {
    setDeleteState('deleting');
    setDeleteError('');
    try {
      await deleteText(item.id);
      onDeleted(item.id);
      onClose();
    } catch (error) {
      setDeleteState('error');
      setDeleteError(error instanceof AdminCmsError ? error.message : 'Não foi possível excluir.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={item.key}>
      <DetailSection title="Texto">
        <EditableField label="Chave" onChangeText={setField('key')} value={fields.key} />
        <EditableField label="Tela" onChangeText={setField('screen')} value={fields.screen} />
        <EditableField label="Seção" onChangeText={setField('section')} value={fields.section} />
        <EditableField label="Texto atual" onChangeText={setField('text')} value={fields.text} />
        <EditableField label="Idioma" onChangeText={setField('language')} value={fields.language} />
      </DetailSection>
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={deleteState === 'deleting'} onPress={handleDelete} style={styles.destroyButton}>
          <Text style={styles.destroyButtonText}>{deleteState === 'deleting' ? 'Excluindo...' : 'Excluir texto'}</Text>
        </TouchableOpacity>
        {deleteState === 'error' ? <Text style={styles.uploadErrorText}>{deleteError}</Text> : null}
      </DetailSection>
    </DetailDrawer>
  );
}

// Mídia enviada de verdade (media.secureUrl) ganha uma seção extra com os
// dados reais devolvidos pelo Cloudinary e a ação de exclusão definitiva
// (chama o backend, que assina e executa o destroy — nunca um endpoint
// aberto e nunca com o secret no navegador). Mídia mock mantém as ações
// estruturais de sempre.
function MediaDrawer({ media, onDelete, onClose, onOpenReplace }) {
  const isReal = Boolean(media.secureUrl);
  const [deleteState, setDeleteState] = useState('idle'); // idle | deleting | error
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    setDeleteState('deleting');
    setDeleteError('');
    try {
      await destroyCloudinaryMedia(media.publicId);
      onDelete(media);
      onClose();
    } catch (error) {
      setDeleteState('error');
      setDeleteError(error instanceof MediaUploadError ? error.message : 'Não foi possível excluir esta mídia.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={media.name}>
      {isReal ? (
        <DetailSection title="Preview">
          <MediaThumb containerStyle={styles.uploadPreviewThumb} iconSize={28} media={media} />
        </DetailSection>
      ) : null}
      <DetailSection title={isReal ? 'Arquivo' : 'Arquivo (mock)'}>
        <DetailRow label="Tipo" value={media.type} />
        <DetailRow label="Dimensões" value={media.dimensions} />
        <DetailRow label="Tamanho" value={media.size} />
        <DetailRow label="Uso atual" value={media.usage} />
        <DetailRow label="Data de upload" value={media.uploadedAt} />
        <DetailRow label="Status" value={media.statusLabel} />
        {isReal ? <DetailRow label="Public ID (Cloudinary)" value={media.publicId} /> : null}
        {isReal ? <DetailRow label="Formato" value={media.format} /> : null}
      </DetailSection>
      <DetailSection title="Ações">
        <View style={styles.actionsRow}>
          <MediaActionButton label="Substituir arquivo" onPress={() => onOpenReplace(media)} />
        </View>
        {isReal ? (
          <>
            <ActionPills actions={['Ver usos', 'Copiar referência']} note="Excluir remove o arquivo de verdade do Cloudinary — desvincula automaticamente de qualquer card/drawer que estivesse usando esta imagem nesta sessão." />
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={deleteState === 'deleting'} onPress={handleDelete} style={styles.destroyButton}>
              <Text style={styles.destroyButtonText}>{deleteState === 'deleting' ? 'Excluindo...' : 'Excluir da biblioteca'}</Text>
            </TouchableOpacity>
            {deleteState === 'error' ? <Text style={styles.uploadErrorText}>{deleteError}</Text> : null}
          </>
        ) : (
          <ActionPills actions={['Ver usos', 'Copiar referência', 'Arquivar']} note="Mídia mock de exemplo — “Substituir arquivo” envia um arquivo real do Cloudinary para este mesmo item da biblioteca (passa a valer em qualquer card que já usa este item)." />
        )}
      </DetailSection>
    </DetailDrawer>
  );
}

// Quinto drawer do CMS com edição REAL — sem mídia (links/botões não têm
// imagem). "Texto do botão" fica editável também (é só o "name" do item no
// banco), mesmo padrão do "Chave" nos textos.
function LinkDrawer({ link, onClose, onDeleted, onSaved }) {
  const [fields, setFields] = useState({
    label: link.label, action: link.action, destination: link.destination, screen: link.screen,
    position: link.position, openMode: link.openMode,
  });
  const [status, setStatus] = useState(link.statusKey);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [deleteState, setDeleteState] = useState('idle');
  const [deleteError, setDeleteError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const updated = await updateLink(link.id, { label: fields.label, value: linkValueFromFields(fields), status });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  const handleDelete = async () => {
    setDeleteState('deleting');
    setDeleteError('');
    try {
      await deleteLink(link.id);
      onDeleted(link.id);
      onClose();
    } catch (error) {
      setDeleteState('error');
      setDeleteError(error instanceof AdminCmsError ? error.message : 'Não foi possível excluir.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={fields.label}>
      <DetailSection title="Botão/Link">
        <EditableField label="Texto do botão" onChangeText={setField('label')} value={fields.label} />
        <EditableField label="Ação" onChangeText={setField('action')} value={fields.action} />
        <EditableField label="Destino" onChangeText={setField('destination')} value={fields.destination} />
        <EditableField label="Tela" onChangeText={setField('screen')} value={fields.screen} />
        <EditableField label="Posição" onChangeText={setField('position')} value={fields.position} />
        <EditableField label="Abertura" onChangeText={setField('openMode')} value={fields.openMode} />
      </DetailSection>
      <DetailSection title="Status">
        <AdminChipGroup activeId={status} onSelect={(id) => { setStatus(id); setSaveState('idle'); }} options={LINK_STATUS_OPTIONS} />
      </DetailSection>
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={deleteState === 'deleting'} onPress={handleDelete} style={styles.destroyButton}>
          <Text style={styles.destroyButtonText}>{deleteState === 'deleting' ? 'Excluindo...' : 'Excluir link/botão'}</Text>
        </TouchableOpacity>
        {deleteState === 'error' ? <Text style={styles.uploadErrorText}>{deleteError}</Text> : null}
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

const VISIBILITY_OPTIONS = [
  { id: 'visible', label: 'Visível' },
  { id: 'hidden', label: 'Oculto' },
];

// Sexto drawer do CMS com edição REAL — sem mídia. "Grupo" é editável via
// chip (mover o item entre os 4 grupos fixos), diferente dos outros drawers
// onde a "categoria" é fixa — aqui faz sentido porque é só um campo dentro
// de value, não muda de rota/collection.
function NavItemDrawer({ item, onClose, onDeleted, onSaved }) {
  const [fields, setFields] = useState({ item: item.item, icon: item.icon, route: item.route, order: String(item.order ?? ''), audience: item.audience });
  const [group, setGroup] = useState(item.group);
  const [visibility, setVisibility] = useState(item.visible ? 'visible' : 'hidden');
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [deleteState, setDeleteState] = useState('idle');
  const [deleteError, setDeleteError] = useState('');

  const setField = (key) => (text) => { setFields((prev) => ({ ...prev, [key]: text })); setSaveState('idle'); };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const updated = await updateNavItem(item.id, {
        item: fields.item,
        order: Number(fields.order) || 0,
        value: navItemValueFromFields({ group, icon: fields.icon, route: fields.route, audience: fields.audience, visible: visibility === 'visible' }),
      });
      onSaved(updated);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof AdminCmsError ? error.message : 'Não foi possível salvar.');
    }
  };

  const handleDelete = async () => {
    setDeleteState('deleting');
    setDeleteError('');
    try {
      await deleteNavItem(item.id);
      onDeleted(item.id);
      onClose();
    } catch (error) {
      setDeleteState('error');
      setDeleteError(error instanceof AdminCmsError ? error.message : 'Não foi possível excluir.');
    }
  };

  return (
    <DetailDrawer onClose={onClose} title={fields.item}>
      <DetailSection title="Item de navegação">
        <EditableField label="Item" onChangeText={setField('item')} value={fields.item} />
        <EditableField label="Ícone" onChangeText={setField('icon')} value={fields.icon} />
        <EditableField label="Rota" onChangeText={setField('route')} value={fields.route} />
        <EditableField label="Ordem" onChangeText={setField('order')} value={fields.order} />
        <EditableField label="Público" onChangeText={setField('audience')} value={fields.audience} />
      </DetailSection>
      <DetailSection title="Grupo">
        <AdminChipGroup activeId={group} onSelect={(id) => { setGroup(id); setSaveState('idle'); }} options={NAV_GROUPS} />
      </DetailSection>
      <DetailSection title="Visibilidade">
        <AdminChipGroup activeId={visibility} onSelect={(id) => { setVisibility(id); setSaveState('idle'); }} options={VISIBILITY_OPTIONS} />
      </DetailSection>
      <DetailSection title="Persistência real (Postgres)">
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={saveState === 'saving'} onPress={handleSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{saveState === 'saving' ? 'Salvando...' : 'Salvar alterações'}</Text>
          </TouchableOpacity>
        </View>
        {saveState === 'saved' ? <Text style={styles.savedConfirmText}>Salvo — sobrevive a um refresh da página.</Text> : null}
        {saveState === 'error' ? <Text style={styles.uploadErrorText}>{saveError}</Text> : null}
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={deleteState === 'deleting'} onPress={handleDelete} style={styles.destroyButton}>
          <Text style={styles.destroyButtonText}>{deleteState === 'deleting' ? 'Excluindo...' : 'Excluir item'}</Text>
        </TouchableOpacity>
        {deleteState === 'error' ? <Text style={styles.uploadErrorText}>{deleteError}</Text> : null}
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

// "text" é o valor exibido (o próprio conteúdo do campo) — "updatedAt" vem
// do banco como ISO string, formatado aqui na hora de mostrar.
function formatUpdatedAt(updatedAt) {
  return updatedAt ? new Date(updatedAt).toLocaleString('pt-BR') : '—';
}

function ContentCard({ item, mediaKey, mediaLibrary, mediaOverrides, onOpenPicker, onPress, onRemoveMedia, showQuickActions }) {
  return (
    <TouchablePressCard onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.label}</Text>
        <StatusBadge label={item.statusLabel} tone={CMS_STATUS_TONE[item.statusKey]} />
      </View>
      <Text numberOfLines={3} style={styles.cardValue}>{item.text}</Text>
      <Text style={styles.cardFooter}>Atualizado em {formatUpdatedAt(item.updatedAt)}</Text>
      {mediaKey ? <MediaControl fallbackMediaId={item.mediaId} mediaKey={mediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} /> : null}
      {showQuickActions ? <ActionPills actions={HOME_QUICK_ACTIONS} /> : null}
    </TouchablePressCard>
  );
}

function TokenCard({ token, onPress }) {
  return (
    <TouchablePressCard onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.cardTitle}>{token.label}</Text>
        {token.swatch ? <View style={[styles.swatchDot, { backgroundColor: token.swatch }]} /> : null}
      </View>
      <Text numberOfLines={2} style={styles.cardValue}>{token.text}</Text>
      <Text style={styles.cardFooter}>Atualizado em {formatUpdatedAt(token.updatedAt)}</Text>
    </TouchablePressCard>
  );
}

function ServiceCard({ mediaLibrary, mediaOverrides, onOpenPicker, onPress, onRemoveMedia, service }) {
  return (
    <TouchablePressCard onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.serviceIconWrap}><Icon color={adminColors.accentPurpleSoft} name={service.icon} size={18} /></View>
        <StatusBadge label={service.visible ? 'Visível' : 'Oculto'} tone={service.visible ? 'success' : 'neutral'} />
      </View>
      <Text numberOfLines={1} style={styles.cardTitle}>{service.name}</Text>
      <Text numberOfLines={2} style={styles.cardValue}>{service.description}</Text>
      <Text style={styles.cardFooter}>Ordem {service.order} · {service.category}</Text>
      <MediaControl fallbackMediaId={service.mediaId} mediaKey={`service:${service.id}`} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
    </TouchablePressCard>
  );
}

function MediaCard({ media, onPress }) {
  return (
    <TouchablePressCard onPress={onPress}>
      <MediaThumb containerStyle={styles.mediaThumb} iconSize={22} media={media} />
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.cardTitle}>{media.name}</Text>
        <StatusBadge label={media.statusLabel} tone={MEDIA_STATUS_TONE[media.statusKey]} />
      </View>
      <Text numberOfLines={1} style={styles.cardFooter}>{media.type} · {media.dimensions} · {media.size}</Text>
      <Text numberOfLines={1} style={styles.cardFooter}>Uso: {media.usage}</Text>
    </TouchablePressCard>
  );
}

// Miniatura compacta usada nas colunas "Mídia" das tabelas (Banners,
// Produtos) — satisfaz "cada campanha deve exibir sua imagem/thumbnail na
// própria listagem" sem precisar abrir o drawer.
function MiniThumb({ fallbackMediaId, mediaKey, mediaLibrary, mediaOverrides }) {
  const media = resolveMedia(mediaKey, fallbackMediaId, mediaOverrides, mediaLibrary);
  return <MediaThumb containerStyle={styles.miniThumb} iconSize={16} media={media} />;
}

// Card clicável genérico reaproveitado por ContentCard, TokenCard,
// ServiceCard e MediaCard.
function TouchablePressCard({ children, onPress }) {
  return <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.card}>{children}</TouchableOpacity>;
}

// Home/Login/Tema/SEO são 4 seções estruturalmente idênticas (cms_sections)
// — só muda o valor de "section". Um hook só evita repetir 4x o mesmo
// bloco de fetch/status/error que os outros tipos de conteúdo têm inline
// (banners, textos etc., que são todos diferentes entre si — aqui os 4 são
// o mesmo shape, então vale a pena extrair).
function useCmsSection(section) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listCmsSection(section)
      .then((rows) => { if (!cancelled) { setItems(rows); setStatus('ready'); } })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(err instanceof AdminCmsError ? err.message : 'Não foi possível carregar.');
      });
    return () => { cancelled = true; };
  }, [section]);

  const handleSaved = (updated) => setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  return { error, handleSaved, items, setError, setItems, setStatus, status };
}

export default function AdminCmsScreen() {
  const [tab, setTab] = useState('home');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  // Home/Login/Tema/SEO — sétimo/oitavo/nono/décimo tipo de conteúdo com
  // persistência real (cms_sections), sem create/delete (ver useCmsSection).
  const homeSection = useCmsSection('home');
  const loginSection = useCmsSection('login');
  const themeSection = useCmsSection('theme');
  const seoSection = useCmsSection('seo');
  // Overrides de mídia aplicados nesta sessão — { [mediaKey]: mediaId | 'none' }.
  // Nunca persiste: reseta ao recarregar a página, como pedido no brief
  // ("ainda sem persistência real" — vale para os overrides desde sempre; a
  // partir desta etapa, só o UPLOAD em si passou a ser real/Cloudinary).
  const [mediaOverrides, setMediaOverrides] = useState({});
  const [pickerTarget, setPickerTarget] = useState(null);
  // Mídia enviada de verdade nesta sessão do navegador. Desde a etapa de
  // persistência de mídia, todo upload já é gravado no Postgres também
  // (ver mediaUploadService.uploadImageToCloudinary) — isto aqui só
  // adianta o item na tela sem esperar um refetch. Fica na frente do mock
  // na biblioteca, então o upload mais recente aparece primeiro.
  const [uploadedMedia, setUploadedMedia] = useState([]);
  // Tudo que já foi enviado em sessões ANTERIORES, vindo do Postgres —
  // isto é o que faz a Biblioteca sobreviver a um F5.
  const [persistedMedia, setPersistedMedia] = useState([]);
  // "Substituir arquivo" num item já existente da biblioteca (mock ou real)
  // — { [id original]: dados reais do Cloudinary }. Mantém o MESMO id do
  // item (ex.: 'MED-08'), então todo card/drawer que já referenciava esse
  // id (via mediaId no mock) passa a mostrar a imagem real automaticamente,
  // sem precisar re-selecionar nada.
  const [replacedMedia, setReplacedMedia] = useState({});
  const mediaLibrary = useMemo(() => {
    const withReplacements = ADMIN_CMS_MEDIA.map((item) => (replacedMedia[item.id] ? { ...item, ...replacedMedia[item.id] } : item));
    return [...uploadedMedia, ...persistedMedia, ...withReplacements];
  }, [uploadedMedia, persistedMedia, replacedMedia]);

  useEffect(() => {
    let cancelled = false;
    listPersistedMedia().then((rows) => { if (!cancelled) setPersistedMedia(rows); }).catch(() => { /* biblioteca real é um extra — falha aqui não deve travar o CMS */ });
    return () => { cancelled = true; };
  }, []);

  const openPicker = (mediaKey, mode, extra) => setPickerTarget({ key: mediaKey, mode, ...extra });
  const closePicker = () => setPickerTarget(null);
  // Banners, Serviços e Produtos são os únicos conteúdos com vínculo de
  // mídia persistido nesta etapa (mediaKey "banner:<id>"/"service:<id>"/
  // "product:<id>") — os demais tipos continuam só em mediaOverrides
  // (sessão), como sempre foi. Erro ao persistir o vínculo aparece na
  // própria aba do conteúdo, sem travar a seleção local.
  const persistItemMediaLink = async (mediaKey, mediaId) => {
    const separatorIndex = mediaKey?.indexOf(':') ?? -1;
    if (separatorIndex === -1) return;
    const prefix = mediaKey.slice(0, separatorIndex);
    const itemId = mediaKey.slice(separatorIndex + 1);
    try {
      if (prefix === 'banner') {
        const updated = await updateBanner(itemId, { mediaId });
        setBanners((prev) => prev.map((row) => (row.id === itemId ? updated : row)));
      } else if (prefix === 'service') {
        const updated = await updateService(itemId, { mediaId });
        setServices((prev) => prev.map((row) => (row.id === itemId ? updated : row)));
      } else if (prefix === 'product') {
        const updated = await updateProduct(itemId, { mediaId });
        setProducts((prev) => prev.map((row) => (row.id === itemId ? updated : row)));
      } else if (prefix === 'home' || prefix === 'login' || prefix === 'seo') {
        const section = prefix === 'home' ? homeSection : prefix === 'login' ? loginSection : seoSection;
        const updated = await updateCmsSectionItem(itemId, prefix, { mediaId });
        section.setItems((prev) => prev.map((row) => (row.id === itemId ? updated : row)));
      }
    } catch (error) {
      const message = error instanceof AdminCmsError ? error.message : 'Não foi possível salvar o vínculo de mídia.';
      if (prefix === 'banner') { setBannersStatus('error'); setBannersError(message); }
      else if (prefix === 'service') { setServicesStatus('error'); setServicesError(message); }
      else if (prefix === 'product') { setProductsStatus('error'); setProductsError(message); }
      else if (prefix === 'home') { homeSection.setStatus('error'); homeSection.setError(message); }
      else if (prefix === 'login') { loginSection.setStatus('error'); loginSection.setError(message); }
      else if (prefix === 'seo') { seoSection.setStatus('error'); seoSection.setError(message); }
    }
  };
  const selectMedia = (media) => {
    if (!pickerTarget) return;
    const { key } = pickerTarget;
    setMediaOverrides((prev) => ({ ...prev, [key]: media.id }));
    closePicker();
    persistItemMediaLink(key, media.id);
  };
  const removeMedia = (mediaKey) => {
    setMediaOverrides((prev) => ({ ...prev, [mediaKey]: 'none' }));
    persistItemMediaLink(mediaKey, null);
  };
  const registerUpload = (media) => setUploadedMedia((prev) => [media, ...prev]);
  const openReplacePicker = (media) => setPickerTarget({ key: null, mode: 'upload', kind: 'replace', replaceId: media.id });
  const replaceMedia = (originalId, record) => setReplacedMedia((prev) => ({
    ...prev,
    [originalId]: {
      secureUrl: record.secureUrl, publicId: record.publicId, format: record.format, bytes: record.bytes,
      width: record.width, height: record.height, dimensions: record.dimensions, size: record.size,
      uploadedAt: record.uploadedAt, statusKey: 'active', statusLabel: 'Ativa',
    },
  }));
  // Item que veio de um upload novo (id = public_id do Cloudinary): some da
  // biblioteca de vez. Item que era mock e foi "substituído": volta a ser
  // mock (remove só a substituição, o item da biblioteca continua existindo).
  const deleteUploadedMedia = (media) => {
    if (replacedMedia[media.id]) {
      setReplacedMedia((prev) => { const next = { ...prev }; delete next[media.id]; return next; });
      return;
    }
    // media.id pode estar em uploadedMedia (enviado nesta sessão) ou em
    // persistedMedia (enviado numa sessão anterior, hidratado do banco) —
    // filtrar os dois é seguro, o que não contém o id simplesmente ignora.
    setUploadedMedia((prev) => prev.filter((entry) => entry.id !== media.id));
    setPersistedMedia((prev) => prev.filter((entry) => entry.id !== media.id));
  };

  // Textos — quarto tipo de conteúdo com persistência real, sem mídia.
  const [texts, setTexts] = useState([]);
  const [textsStatus, setTextsStatus] = useState('loading');
  const [textsError, setTextsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listTexts()
      .then((rows) => { if (!cancelled) { setTexts(rows); setTextsStatus('ready'); } })
      .catch((error) => {
        if (cancelled) return;
        setTextsStatus('error');
        setTextsError(error instanceof AdminCmsError ? error.message : 'Não foi possível carregar os textos.');
      });
    return () => { cancelled = true; };
  }, []);

  const handleTextSaved = (updated) => setTexts((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  const handleTextDeleted = (id) => {
    setTexts((prev) => prev.filter((row) => row.id !== id));
    setSelected((prev) => (prev?.kind === 'text' && prev.item.id === id ? null : prev));
  };
  const handleCreateText = async () => {
    setTextsStatus('creating');
    try {
      const created = await createText({ key: 'novo.texto.chave', value: { screen: '', section: '', text: 'Novo texto', language: 'pt-BR' } });
      setTexts((prev) => [...prev, created]);
      setSelected({ kind: 'text', item: created });
      setTextsStatus('ready');
    } catch (error) {
      setTextsStatus('error');
      setTextsError(error instanceof AdminCmsError ? error.message : 'Não foi possível criar o texto.');
    }
  };

  const filteredTexts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return texts;
    return texts.filter((item) => [item.key, item.screen, item.text].some((field) => (field || '').toLowerCase().includes(q)));
  }, [query, texts]);

  // Links/Botões — quinto tipo de conteúdo com persistência real, sem mídia.
  const [links, setLinks] = useState([]);
  const [linksStatus, setLinksStatus] = useState('loading');
  const [linksError, setLinksError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listLinks()
      .then((rows) => { if (!cancelled) { setLinks(rows); setLinksStatus('ready'); } })
      .catch((error) => {
        if (cancelled) return;
        setLinksStatus('error');
        setLinksError(error instanceof AdminCmsError ? error.message : 'Não foi possível carregar os links.');
      });
    return () => { cancelled = true; };
  }, []);

  const handleLinkSaved = (updated) => setLinks((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  const handleLinkDeleted = (id) => {
    setLinks((prev) => prev.filter((row) => row.id !== id));
    setSelected((prev) => (prev?.kind === 'link' && prev.item.id === id ? null : prev));
  };
  const handleCreateLink = async () => {
    setLinksStatus('creating');
    try {
      const created = await createLink({ label: 'Novo botão', value: { action: 'navigate', destination: '', screen: '', position: '', openMode: 'Interna' } });
      setLinks((prev) => [...prev, created]);
      setSelected({ kind: 'link', item: created });
      setLinksStatus('ready');
    } catch (error) {
      setLinksStatus('error');
      setLinksError(error instanceof AdminCmsError ? error.message : 'Não foi possível criar o link.');
    }
  };

  // Navegação — sexto tipo de conteúdo com persistência real, sem mídia.
  // Uma lista só (navItems) agrupada em memória pelos 4 grupos fixos
  // (NAV_GROUPS) pra alimentar os 4 blocos da tela — ver navItemsByGroup.
  const [navItems, setNavItems] = useState([]);
  const [navItemsStatus, setNavItemsStatus] = useState('loading');
  const [navItemsError, setNavItemsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listNavItems()
      .then((rows) => { if (!cancelled) { setNavItems(rows); setNavItemsStatus('ready'); } })
      .catch((error) => {
        if (cancelled) return;
        setNavItemsStatus('error');
        setNavItemsError(error instanceof AdminCmsError ? error.message : 'Não foi possível carregar a navegação.');
      });
    return () => { cancelled = true; };
  }, []);

  const handleNavItemSaved = (updated) => setNavItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  const handleNavItemDeleted = (id) => {
    setNavItems((prev) => prev.filter((row) => row.id !== id));
    setSelected((prev) => (prev?.kind === 'nav' && prev.item.id === id ? null : prev));
  };
  const handleCreateNavItem = async (groupId) => {
    setNavItemsStatus('creating');
    try {
      const created = await createNavItem({ item: 'Novo item', order: 0, value: { group: groupId, icon: 'ellipse-outline', route: '', audience: 'PF e PJ', visible: true } });
      setNavItems((prev) => [...prev, created]);
      setSelected({ kind: 'nav', item: created });
      setNavItemsStatus('ready');
    } catch (error) {
      setNavItemsStatus('error');
      setNavItemsError(error instanceof AdminCmsError ? error.message : 'Não foi possível criar o item.');
    }
  };
  // IMPORTANTE: "navItems" precisa estar nas deps — sem isso o resultado
  // memorizado fica preso na primeira lista (vazia) e nunca reflete o
  // fetch/criação/edição seguintes (foi exatamente o bug encontrado em
  // filteredTexts antes desta etapa).
  const navItemsByGroup = useMemo(
    () => NAV_GROUPS.map((group) => ({ ...group, items: navItems.filter((row) => row.group === group.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) })),
    [navItems],
  );

  // Banners são o primeiro tipo de conteúdo com persistência real
  // (Postgres) — os demais (serviços, produtos, textos, links, navegação,
  // Home/Login/Tema/SEO) continuam vindo do mock até as próximas etapas.
  const [banners, setBanners] = useState([]);
  const [bannersStatus, setBannersStatus] = useState('loading'); // loading | ready | error | creating
  const [bannersError, setBannersError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listBanners()
      .then((rows) => { if (!cancelled) { setBanners(rows); setBannersStatus('ready'); } })
      .catch((error) => {
        if (cancelled) return;
        setBannersStatus('error');
        setBannersError(error instanceof AdminCmsError ? error.message : 'Não foi possível carregar os banners.');
      });
    return () => { cancelled = true; };
  }, []);

  const handleBannerSaved = (updated) => setBanners((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  const handleBannerDeleted = (id) => {
    setBanners((prev) => prev.filter((row) => row.id !== id));
    setSelected((prev) => (prev?.kind === 'banner' && prev.item.id === id ? null : prev));
  };
  const handleCreateBanner = async () => {
    setBannersStatus('creating');
    try {
      const created = await createBanner({
        name: 'Novo banner',
        value: { title: 'Novo título', subtitle: '', cta: '', link: '', position: 'Home', startDate: '—', endDate: '—', priority: banners.length + 1 },
        status: 'draft',
        order: banners.length + 1,
      });
      setBanners((prev) => [...prev, created]);
      setSelected({ kind: 'banner', item: created });
      setBannersStatus('ready');
    } catch (error) {
      setBannersStatus('error');
      setBannersError(error instanceof AdminCmsError ? error.message : 'Não foi possível criar o banner.');
    }
  };

  // Serviços — segundo tipo de conteúdo com persistência real, mesmo
  // padrão de Banners.
  const [services, setServices] = useState([]);
  const [servicesStatus, setServicesStatus] = useState('loading');
  const [servicesError, setServicesError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listServices()
      .then((rows) => { if (!cancelled) { setServices(rows); setServicesStatus('ready'); } })
      .catch((error) => {
        if (cancelled) return;
        setServicesStatus('error');
        setServicesError(error instanceof AdminCmsError ? error.message : 'Não foi possível carregar os serviços.');
      });
    return () => { cancelled = true; };
  }, []);

  const handleServiceSaved = (updated) => setServices((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  const handleServiceDeleted = (id) => {
    setServices((prev) => prev.filter((row) => row.id !== id));
    setSelected((prev) => (prev?.kind === 'service' && prev.item.id === id ? null : prev));
  };
  const handleCreateService = async () => {
    setServicesStatus('creating');
    try {
      const created = await createService({
        name: 'Novo serviço',
        value: { icon: 'ellipse-outline', description: '', link: '', category: '', order: services.length + 1, visible: true },
        order: services.length + 1,
      });
      setServices((prev) => [...prev, created]);
      setSelected({ kind: 'service', item: created });
      setServicesStatus('ready');
    } catch (error) {
      setServicesStatus('error');
      setServicesError(error instanceof AdminCmsError ? error.message : 'Não foi possível criar o serviço.');
    }
  };

  // Produtos — terceiro tipo de conteúdo com persistência real, mesmo
  // padrão de Banners/Serviços.
  const [products, setProducts] = useState([]);
  const [productsStatus, setProductsStatus] = useState('loading');
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listProducts()
      .then((rows) => { if (!cancelled) { setProducts(rows); setProductsStatus('ready'); } })
      .catch((error) => {
        if (cancelled) return;
        setProductsStatus('error');
        setProductsError(error instanceof AdminCmsError ? error.message : 'Não foi possível carregar os produtos.');
      });
    return () => { cancelled = true; };
  }, []);

  const handleProductSaved = (updated) => setProducts((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  const handleProductDeleted = (id) => {
    setProducts((prev) => prev.filter((row) => row.id !== id));
    setSelected((prev) => (prev?.kind === 'product' && prev.item.id === id ? null : prev));
  };
  const handleCreateProduct = async () => {
    setProductsStatus('creating');
    try {
      const created = await createProduct({
        name: 'Novo produto',
        value: { category: '', description: '', cta: '', link: '', audience: '', publishedAt: '—', featured: false },
        status: 'draft',
        order: products.length + 1,
      });
      setProducts((prev) => [...prev, created]);
      setSelected({ kind: 'product', item: created });
      setProductsStatus('ready');
    } catch (error) {
      setProductsStatus('error');
      setProductsError(error instanceof AdminCmsError ? error.message : 'Não foi possível criar o produto.');
    }
  };

  const closeDrawer = () => setSelected(null);

  let body = null;
  let drawer = null;

  if (tab === 'home') {
    body = (
      <View style={styles.tableWithSearch}>
        {homeSection.status === 'error' ? <Text style={styles.uploadErrorText}>{homeSection.error}</Text> : null}
        {homeSection.status === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <View style={styles.cardsGrid}>
            {homeSection.items.map((item) => (
              <ContentCard
                item={item}
                key={item.id}
                mediaKey={HOME_MEDIA_IDS.has(item.key) ? `home:${item.id}` : null}
                mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides}
                onOpenPicker={openPicker}
                onPress={() => setSelected({ kind: 'field', section: 'home', item })}
                onRemoveMedia={removeMedia}
                showQuickActions
              />
            ))}
          </View>
        )}
      </View>
    );
  } else if (tab === 'login') {
    body = (
      <View style={styles.tableWithSearch}>
        {loginSection.status === 'error' ? <Text style={styles.uploadErrorText}>{loginSection.error}</Text> : null}
        {loginSection.status === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <View style={styles.cardsGrid}>
            {loginSection.items.map((item) => (
              <ContentCard
                item={item}
                key={item.id}
                mediaKey={LOGIN_MEDIA_IDS.has(item.key) ? `login:${item.id}` : null}
                mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides}
                onOpenPicker={openPicker}
                onPress={() => setSelected({ kind: 'field', section: 'login', item })}
                onRemoveMedia={removeMedia}
              />
            ))}
          </View>
        )}
      </View>
    );
  } else if (tab === 'banners') {
    const columns = [
      { key: 'media', label: 'Mídia', flex: 0.5, render: (row) => <MiniThumb fallbackMediaId={row.mediaId} mediaKey={`banner:${row.id}`} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} /> },
      { key: 'name', label: 'Nome da campanha', flex: 1.3 },
      { key: 'title', label: 'Título', flex: 1.2 },
      { key: 'position', label: 'Posição', flex: 1.1 },
      { key: 'period', label: 'Período', flex: 1, render: (row) => <Text style={styles.cellText}>{`${row.startDate} – ${row.endDate}`}</Text> },
      { key: 'priority', label: 'Prioridade', flex: 0.6, render: (row) => <Text style={styles.cellText}>{row.priority}</Text> },
      { key: 'statusLabel', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.statusLabel} tone={BANNER_STATUS_TONE[row.statusKey]} /> },
    ];
    body = (
      <View style={styles.tableWithSearch}>
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={bannersStatus === 'creating'} onPress={handleCreateBanner} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{bannersStatus === 'creating' ? 'Criando...' : '+ Novo banner'}</Text>
          </TouchableOpacity>
          <Text style={styles.actionsNote}>Banners agora persistem de verdade no Postgres — sobrevivem a um refresh da página.</Text>
        </View>
        {bannersStatus === 'error' ? <Text style={styles.uploadErrorText}>{bannersError}</Text> : null}
        {bannersStatus === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <AdminTable columns={columns} emptyMessage="Nenhum banner ainda — clique em “+ Novo banner”." onRowPress={(row) => setSelected({ kind: 'banner', item: row })} rows={banners} selectedId={selected?.item?.id} />
        )}
      </View>
    );
  } else if (tab === 'services') {
    body = (
      <View style={styles.tableWithSearch}>
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={servicesStatus === 'creating'} onPress={handleCreateService} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{servicesStatus === 'creating' ? 'Criando...' : '+ Novo serviço'}</Text>
          </TouchableOpacity>
          <Text style={styles.actionsNote}>Serviços agora persistem de verdade no Postgres — sobrevivem a um refresh da página.</Text>
        </View>
        {servicesStatus === 'error' ? <Text style={styles.uploadErrorText}>{servicesError}</Text> : null}
        {servicesStatus === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <View style={styles.cardsGrid}>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides}
                onOpenPicker={openPicker}
                onPress={() => setSelected({ kind: 'service', item: service })}
                onRemoveMedia={removeMedia}
                service={service}
              />
            ))}
          </View>
        )}
      </View>
    );
  } else if (tab === 'products') {
    const columns = [
      { key: 'media', label: 'Mídia', flex: 0.5, render: (row) => <MiniThumb fallbackMediaId={row.mediaId} mediaKey={`product:${row.id}`} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} /> },
      { key: 'name', label: 'Nome', flex: 1.4 },
      { key: 'category', label: 'Categoria', flex: 1 },
      { key: 'featured', label: 'Destaque', flex: 0.7, render: (row) => <Text style={styles.cellText}>{row.featured ? 'Sim' : 'Não'}</Text> },
      { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={CMS_STATUS_TONE[row.statusKey]} /> },
      { key: 'audience', label: 'Público', flex: 0.8 },
      { key: 'publishedAt', label: 'Publicado em', flex: 0.9 },
    ];
    body = (
      <View style={styles.tableWithSearch}>
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={productsStatus === 'creating'} onPress={handleCreateProduct} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{productsStatus === 'creating' ? 'Criando...' : '+ Novo produto'}</Text>
          </TouchableOpacity>
          <Text style={styles.actionsNote}>Produtos agora persistem de verdade no Postgres — sobrevivem a um refresh da página.</Text>
        </View>
        {productsStatus === 'error' ? <Text style={styles.uploadErrorText}>{productsError}</Text> : null}
        {productsStatus === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <AdminTable columns={columns} emptyMessage="Nenhum produto ainda — clique em “+ Novo produto”." onRowPress={(row) => setSelected({ kind: 'product', item: row })} rows={products} selectedId={selected?.item?.id} />
        )}
      </View>
    );
  } else if (tab === 'texts') {
    const columns = [
      { key: 'key', label: 'Chave', flex: 1.4 },
      { key: 'screen', label: 'Tela', flex: 0.8 },
      { key: 'section', label: 'Seção', flex: 0.9 },
      { key: 'text', label: 'Texto atual', flex: 1.8 },
      { key: 'language', label: 'Idioma', flex: 0.6 },
      { key: 'statusLabel', label: 'Status', flex: 0.8, render: (row) => <StatusBadge label={row.statusLabel} tone={CMS_STATUS_TONE[row.statusKey]} /> },
    ];
    body = (
      <View style={styles.tableWithSearch}>
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={textsStatus === 'creating'} onPress={handleCreateText} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{textsStatus === 'creating' ? 'Criando...' : '+ Novo texto'}</Text>
          </TouchableOpacity>
          <Text style={styles.actionsNote}>Textos agora persistem de verdade no Postgres — sobrevivem a um refresh da página.</Text>
        </View>
        {textsStatus === 'error' ? <Text style={styles.uploadErrorText}>{textsError}</Text> : null}
        <AdminSearchInput onChangeText={setQuery} placeholder="Buscar por chave, tela ou trecho do texto..." style={styles.search} value={query} />
        <View style={styles.tableBody}>
          {textsStatus === 'loading' ? (
            <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
          ) : (
            <AdminTable columns={columns} emptyMessage="Nenhum texto encontrado." onRowPress={(row) => setSelected({ kind: 'text', item: row })} rows={filteredTexts} selectedId={selected?.item?.id} />
          )}
        </View>
      </View>
    );
  } else if (tab === 'media') {
    body = (
      <View style={styles.mediaWrap}>
        <ActionPills actions={MEDIA_TOOLBAR_ACTIONS} note="Upload real para o Cloudinary disponível em qualquer card/drawer com mídia (botão “Enviar nova imagem”) — a mídia enviada aparece aqui também. Demais ações continuam estruturais." />
        <View style={styles.cardsGrid}>
          {mediaLibrary.map((media) => (
            <MediaCard key={media.id} media={media} onPress={() => setSelected({ kind: 'media', item: media })} />
          ))}
        </View>
      </View>
    );
  } else if (tab === 'links') {
    const columns = [
      { key: 'label', label: 'Texto do botão', flex: 1.2 },
      { key: 'action', label: 'Ação', flex: 1 },
      { key: 'destination', label: 'Destino', flex: 1.6 },
      { key: 'screen', label: 'Tela', flex: 0.9 },
      { key: 'openMode', label: 'Abertura', flex: 0.8 },
      { key: 'statusLabel', label: 'Status', flex: 0.8, render: (row) => <StatusBadge label={row.statusLabel} tone={LINK_STATUS_TONE[row.statusKey]} /> },
    ];
    body = (
      <View style={styles.tableWithSearch}>
        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={linksStatus === 'creating'} onPress={handleCreateLink} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{linksStatus === 'creating' ? 'Criando...' : '+ Novo link/botão'}</Text>
          </TouchableOpacity>
          <Text style={styles.actionsNote}>Links/botões agora persistem de verdade no Postgres — sobrevivem a um refresh da página.</Text>
        </View>
        {linksStatus === 'error' ? <Text style={styles.uploadErrorText}>{linksError}</Text> : null}
        {linksStatus === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <AdminTable columns={columns} emptyMessage="Nenhum link/botão ainda — clique em “+ Novo link/botão”." onRowPress={(row) => setSelected({ kind: 'link', item: row })} rows={links} selectedId={selected?.item?.id} />
        )}
      </View>
    );
  } else if (tab === 'navigation') {
    const navColumns = [
      { key: 'item', label: 'Item', flex: 1.3 },
      { key: 'icon', label: 'Ícone', flex: 1 },
      { key: 'route', label: 'Rota', flex: 1.2 },
      { key: 'order', label: 'Ordem', flex: 0.6, render: (row) => <Text style={styles.cellText}>{row.order}</Text> },
      { key: 'visible', label: 'Visibilidade', flex: 0.9, render: (row) => <StatusBadge label={row.visible ? 'Visível' : 'Oculto'} tone={row.visible ? 'success' : 'neutral'} /> },
      { key: 'audience', label: 'Público', flex: 0.9 },
    ];
    body = (
      <View style={styles.navGroups}>
        {navItemsStatus === 'error' ? <Text style={styles.uploadErrorText}>{navItemsError}</Text> : null}
        {navItemsStatus === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : navItemsByGroup.map((group) => (
          <View key={group.id} style={styles.navGroup}>
            <View style={styles.actionsRow}>
              <Text style={styles.navGroupTitle}>{group.label}</Text>
              <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} disabled={navItemsStatus === 'creating'} onPress={() => handleCreateNavItem(group.id)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{navItemsStatus === 'creating' ? 'Criando...' : '+ Novo item'}</Text>
              </TouchableOpacity>
            </View>
            <AdminTable columns={navColumns} emptyMessage="Nenhum item neste grupo ainda." onRowPress={(row) => setSelected({ kind: 'nav', item: row })} rows={group.items} selectedId={selected?.item?.id} />
          </View>
        ))}
      </View>
    );
  } else if (tab === 'theme') {
    body = (
      <View style={styles.mediaWrap}>
        {themeSection.status === 'error' ? <Text style={styles.uploadErrorText}>{themeSection.error}</Text> : null}
        {themeSection.status === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <View style={styles.cardsGrid}>
            {themeSection.items.map((token) => (
              <TokenCard key={token.id} onPress={() => setSelected({ kind: 'simple', item: token, section: 'theme' })} token={token} />
            ))}
          </View>
        )}
        <View style={styles.previewPanel}>
          <Text style={styles.navGroupTitle}>Assets gráficos do tema</Text>
          <MediaControl fallbackMediaId="MED-02" label="Logo" mediaKey="theme:logo" mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={openPicker} onRemove={removeMedia} />
          <MediaControl fallbackMediaId="MED-07" label="Background" mediaKey="theme:background" mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={openPicker} onRemove={removeMedia} />
          <MediaControl label="Imagens institucionais" mediaKey="theme:institutional" mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onOpenPicker={openPicker} onRemove={removeMedia} />
        </View>
        <View style={styles.previewPanel}>
          <Text style={styles.navGroupTitle}>Preview visual</Text>
          <View style={styles.previewRow}>
            <View style={styles.previewButton}><Text style={styles.previewButtonText}>Botão</Text></View>
            <View style={styles.previewCard}><Text style={styles.previewCardText}>Card</Text></View>
            <StatusBadge label="Badge" tone="info" />
            <View style={styles.previewInput}><Text style={styles.previewInputText}>Input</Text></View>
            <Text style={styles.previewTitle}>Título</Text>
          </View>
        </View>
      </View>
    );
  } else if (tab === 'seo') {
    body = (
      <View style={styles.tableWithSearch}>
        {seoSection.status === 'error' ? <Text style={styles.uploadErrorText}>{seoSection.error}</Text> : null}
        {seoSection.status === 'loading' ? (
          <ActivityIndicator color={adminColors.accentPurpleSoft} style={styles.loadingSpinner} />
        ) : (
          <View style={styles.cardsGrid}>
            {seoSection.items.map((item) => (
              <TokenCard key={item.id} onPress={() => setSelected({ kind: 'simple', item, section: 'seo' })} token={item} />
            ))}
          </View>
        )}
      </View>
    );
  } else if (tab === 'history') {
    const columns = [
      { key: 'at', label: 'Data/Hora', flex: 1.1 },
      { key: 'user', label: 'Usuário', flex: 1.3 },
      { key: 'section', label: 'Seção', flex: 1 },
      { key: 'field', label: 'Campo', flex: 1.2 },
      { key: 'previousValue', label: 'Valor anterior', flex: 1.3 },
      { key: 'newValue', label: 'Valor novo', flex: 1.3 },
      { key: 'statusLabel', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.statusLabel} tone={CMS_STATUS_TONE[row.statusKey]} /> },
      { key: 'version', label: 'Versão', flex: 0.6 },
    ];
    body = <AdminTable columns={columns} rows={ADMIN_CMS_HISTORY} />;
  }

  if (selected?.kind === 'field') {
    const idSet = selected.section === 'home' ? HOME_MEDIA_IDS : LOGIN_MEDIA_IDS;
    const mediaKey = idSet.has(selected.item.key) ? `${selected.section}:${selected.item.id}` : null;
    const sectionLabel = selected.section === 'home' ? 'Home' : 'Login';
    const onSaved = selected.section === 'home' ? homeSection.handleSaved : loginSection.handleSaved;
    drawer = (
      <FieldDrawer
        item={selected.item} key={selected.item.id} mediaKey={mediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides}
        onClose={closeDrawer} onOpenPicker={openPicker} onRemoveMedia={removeMedia} onSaved={onSaved}
        section={selected.section} sectionLabel={sectionLabel}
      />
    );
  } else if (selected?.kind === 'simple') {
    const seoMediaKey = selected.section === 'seo' && SEO_MEDIA_IDS.has(selected.item.key) ? `seo:${selected.item.id}` : null;
    const onSaved = selected.section === 'theme' ? themeSection.handleSaved : seoSection.handleSaved;
    drawer = (
      <SimpleFieldDrawer
        item={selected.item} key={selected.item.id} mediaKey={seoMediaKey} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides}
        onClose={closeDrawer} onOpenPicker={openPicker} onRemoveMedia={removeMedia} onSaved={onSaved} section={selected.section}
      />
    );
  } else if (selected?.kind === 'banner') {
    // key=banner.id força o React a remontar o formulário ao trocar de
    // banner selecionado — sem isso, o state local (fields/status) do
    // banner anterior ficava "grudado" na tela ao clicar num banner novo.
    drawer = <BannerDrawer banner={selected.item} key={selected.item.id} mediaKey={`banner:${selected.item.id}`} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onClose={closeDrawer} onDeleted={handleBannerDeleted} onOpenPicker={openPicker} onRemoveMedia={removeMedia} onSaved={handleBannerSaved} />;
  } else if (selected?.kind === 'service') {
    drawer = <ServiceDrawer key={selected.item.id} mediaKey={`service:${selected.item.id}`} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onClose={closeDrawer} onDeleted={handleServiceDeleted} onOpenPicker={openPicker} onRemoveMedia={removeMedia} onSaved={handleServiceSaved} service={selected.item} />;
  } else if (selected?.kind === 'product') {
    drawer = <ProductDrawer key={selected.item.id} mediaKey={`product:${selected.item.id}`} mediaLibrary={mediaLibrary} mediaOverrides={mediaOverrides} onClose={closeDrawer} onDeleted={handleProductDeleted} onOpenPicker={openPicker} onRemoveMedia={removeMedia} onSaved={handleProductSaved} product={selected.item} />;
  } else if (selected?.kind === 'text') {
    drawer = <TextDrawer item={selected.item} key={selected.item.id} onClose={closeDrawer} onDeleted={handleTextDeleted} onSaved={handleTextSaved} />;
  } else if (selected?.kind === 'media') {
    drawer = <MediaDrawer media={selected.item} onClose={closeDrawer} onDelete={deleteUploadedMedia} onOpenReplace={openReplacePicker} />;
  } else if (selected?.kind === 'link') {
    drawer = <LinkDrawer key={selected.item.id} link={selected.item} onClose={closeDrawer} onDeleted={handleLinkDeleted} onSaved={handleLinkSaved} />;
  } else if (selected?.kind === 'nav') {
    drawer = <NavItemDrawer key={selected.item.id} item={selected.item} onClose={closeDrawer} onDeleted={handleNavItemDeleted} onSaved={handleNavItemSaved} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.statsGrid}>
        {ADMIN_CMS_STATS.map((stat) => <StatCard key={stat.id} stat={stat} />)}
      </View>

      <AdminChipGroup activeId={tab} onSelect={(id) => { setTab(id); setSelected(null); setQuery(''); }} options={ADMIN_CMS_TABS} />

      <View style={styles.body}>
        <View style={styles.bodyContent}>{body}</View>
        {drawer}
      </View>

      {pickerTarget ? <MediaPickerModal mediaLibrary={mediaLibrary} onClose={closePicker} onReplace={replaceMedia} onSelect={selectMedia} onUploaded={registerUpload} target={pickerTarget} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 480 },
  bodyContent: { flex: 1, gap: spacing.md },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: 300, flexGrow: 1, padding: spacing.lg },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', marginBottom: spacing.xs },
  cardTitle: { ...typography.bodyMedium, color: adminColors.textPrimary, flex: 1 },
  cardValue: { ...typography.body, color: adminColors.textSecondary, marginBottom: spacing.sm },
  cardFooter: { ...typography.caption, color: adminColors.textMuted },
  serviceIconWrap: { alignItems: 'center', backgroundColor: adminColors.infoSoft, borderRadius: radii.sm, height: 32, justifyContent: 'center', width: 32 },
  swatchDot: { borderColor: adminColors.border, borderRadius: radii.pill, borderWidth: 1, height: 20, width: 20 },
  swatchPreview: { borderColor: adminColors.border, borderRadius: radii.md, borderWidth: 1, height: 48, width: '100%' },
  mediaThumb: { alignItems: 'center', backgroundColor: adminColors.surface, borderRadius: radii.md, height: 64, justifyContent: 'center', marginBottom: spacing.sm, overflow: 'hidden' },
  mediaThumbImage: { borderRadius: radii.sm, height: '100%', width: '100%' },
  uploadPreviewThumb: { alignItems: 'center', backgroundColor: adminColors.surface, borderRadius: radii.md, height: 96, justifyContent: 'center', overflow: 'hidden', width: 96 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs, marginTop: spacing.sm },
  actionPill: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.pill, borderWidth: 1, opacity: 0.5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  actionPillText: { ...typography.label, color: adminColors.textMuted },
  actionsNote: { ...typography.caption, color: adminColors.textMuted },
  tableWithSearch: { flex: 1, gap: spacing.md },
  tableBody: { flex: 1, minHeight: 360 },
  search: { maxWidth: 480 },
  cellText: { ...typography.body, color: adminColors.textSecondary },
  mediaWrap: { gap: spacing.md },
  navGroups: { gap: spacing.lg },
  navGroup: { gap: spacing.sm, minHeight: 200 },
  navGroupTitle: { ...typography.heading3, color: adminColors.textPrimary },
  previewPanel: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  previewRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  previewButton: { backgroundColor: adminColors.infoSoft, borderColor: 'rgba(119, 105, 232, 0.45)', borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  previewButtonText: { ...typography.bodyMedium, color: adminColors.textPrimary },
  previewCard: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
  previewCardText: { ...typography.body, color: adminColors.textSecondary },
  previewInput: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  previewInputText: { ...typography.body, color: adminColors.textMuted },
  previewTitle: { ...typography.heading3, color: adminColors.textPrimary },
  // Controle de mídia (miniatura + info + botões) — usado em cards e drawers.
  mediaControl: { borderTopColor: adminColors.border, borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.sm },
  mediaControlLabel: { ...typography.label, color: adminColors.textMuted, marginBottom: spacing.xs },
  mediaControlRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  mediaControlThumb: { alignItems: 'center', backgroundColor: adminColors.surface, borderRadius: radii.sm, height: 40, justifyContent: 'center', overflow: 'hidden', width: 40 },
  mediaControlInfo: { flex: 1, gap: 2 },
  mediaActionButton: { backgroundColor: adminColors.infoSoft, borderColor: 'rgba(119, 105, 232, 0.45)', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  mediaActionButtonText: { ...typography.label, color: adminColors.textPrimary },
  miniThumb: { alignItems: 'center', backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.sm, borderWidth: 1, height: 32, justifyContent: 'center', overflow: 'hidden', width: 32 },
  // Modal de seleção de mídia.
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(4, 5, 10, 0.72)', flex: 1, justifyContent: 'center', padding: spacing.xl },
  modalPanel: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, maxHeight: '85%', maxWidth: 720, padding: spacing.lg, width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { ...typography.heading3, color: adminColors.textPrimary },
  modalBody: { gap: spacing.md },
  modalSearch: { maxWidth: '100%' },
  resultsCountText: { ...typography.caption, color: adminColors.textMuted },
  modalGridScroll: { maxHeight: 360 },
  pickerCard: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: 180, flexGrow: 1, padding: spacing.md, position: 'relative' },
  pickerCardSelected: { borderColor: adminColors.accentPurpleSoft, borderWidth: 2 },
  pickerCardCheck: { position: 'absolute', right: spacing.sm, top: spacing.sm },
  emptyPickerText: { ...typography.body, color: adminColors.textMuted, padding: spacing.lg },
  librarySelectionBar: { alignItems: 'center', backgroundColor: adminColors.surfaceElevated, borderColor: adminColors.accentPurpleSoft, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md },
  primaryButton: { backgroundColor: adminColors.accentPurple, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primaryButtonText: { ...typography.bodyMedium, color: '#FFFFFF' },
  dropzone: { alignItems: 'center', backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.lg, borderStyle: 'dashed', borderWidth: 1, gap: spacing.sm, paddingVertical: spacing.xxl },
  dropzoneText: { ...typography.bodyMedium, color: adminColors.textSecondary },
  dropzoneOr: { ...typography.caption, color: adminColors.textMuted },
  dropzoneFormats: { ...typography.caption, color: adminColors.textMuted, marginTop: spacing.xs },
  uploadErrorText: { ...typography.bodyMedium, color: adminColors.danger, paddingHorizontal: spacing.lg, textAlign: 'center' },
  destroyButton: { alignSelf: 'flex-start', backgroundColor: adminColors.dangerSoft, borderColor: 'rgba(239, 68, 68, 0.45)', borderRadius: radii.pill, borderWidth: 1, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  destroyButtonText: { ...typography.label, color: adminColors.danger },
  editableField: { marginBottom: spacing.md },
  editableInput: {
    ...typography.body, backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.md,
    borderWidth: 1, color: adminColors.textPrimary, marginTop: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  savedConfirmText: { ...typography.bodyMedium, color: adminColors.success, marginTop: spacing.sm },
  loadingSpinner: { marginVertical: spacing.xl },
  modalFooter: { alignItems: 'flex-end' },
  modalCancelButton: { borderColor: adminColors.border, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  modalCancelText: { ...typography.bodyMedium, color: adminColors.textSecondary },
});
