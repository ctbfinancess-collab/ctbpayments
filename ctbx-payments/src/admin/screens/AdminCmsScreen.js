import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../components/ui';
import AdminChipGroup from '../components/AdminChipGroup';
import AdminSearchInput from '../components/AdminSearchInput';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DetailDrawer, { DetailRow, DetailSection, DetailTimeline } from '../components/DetailDrawer';
import { radii, spacing, typography } from '../../theme';
import adminColors from '../theme/adminColors';
import {
  ADMIN_CMS_STATS, ADMIN_CMS_TABS, ADMIN_CMS_HOME_BLOCKS, ADMIN_CMS_LOGIN_FIELDS, ADMIN_CMS_BANNERS,
  ADMIN_CMS_SERVICES, ADMIN_CMS_PRODUCTS, ADMIN_CMS_TEXTS, ADMIN_CMS_MEDIA, ADMIN_CMS_LINKS,
  ADMIN_CMS_NAV_GROUPS, ADMIN_CMS_THEME_TOKENS, ADMIN_CMS_SEO, ADMIN_CMS_HISTORY,
  CMS_STATUS_TONE, BANNER_STATUS_TONE, MEDIA_STATUS_TONE, LINK_STATUS_TONE,
} from '../data/adminMockData';

// Área "Conteúdo / CMS" — etapa estrutural/mock/read-only. Nenhum campo aqui
// salva, publica ou exclui conteúdo de verdade; nenhum upload real de mídia.
// Nunca exibe senha, token, API key, secret, credencial, private key, dados
// bancários, CVV ou PIN — e a biblioteca de mídia nunca expõe credenciais do
// Cloudinary (só nomes de arquivo mock, preparados para integração futura).
//
// Troca de imagem: a seleção feita no seletor de mídia (biblioteca) É
// aplicada de verdade ao card/drawer, mas só em memória desta sessão do
// navegador (useState) — não persiste em nenhum backend/arquivo, e some ao
// recarregar a página. "Enviar nova imagem" continua só uma área visual
// (arraste/selecionar arquivo), sem upload real, como pedido no brief.
const MEDIA_ICON = { Imagem: 'image-outline', Banner: 'image-outline', Logo: 'shapes-outline', Ícone: 'apps-outline', Vídeo: 'videocam-outline' };
const CMS_FLOW_ACTIONS = ['Editar', 'Salvar rascunho', 'Pré-visualizar', 'Publicar', 'Descartar alteração', 'Restaurar versão anterior'];
const HOME_QUICK_ACTIONS = ['Editar', 'Ativar/Desativar', 'Mover para cima', 'Mover para baixo', 'Pré-visualizar'];
const MEDIA_TOOLBAR_ACTIONS = ['Enviar mídia', 'Substituir', 'Ver usos', 'Copiar referência', 'Arquivar'];
// Blocos de Home/Login que representam mídia (imagem/banner/logo/ícone/
// fundo) — os únicos que ganham o controle de troca de imagem no card.
const HOME_MEDIA_IDS = new Set(['home-4', 'home-5', 'home-7', 'home-8', 'home-9']);
const LOGIN_MEDIA_IDS = new Set(['login-1', 'login-4']);
const PICKER_SUBTABS = [{ id: 'library', label: 'Biblioteca' }, { id: 'upload', label: 'Enviar novo' }];
const MEDIA_TYPE_TABS = [{ id: 'all', label: 'Todos' }, { id: 'Imagem', label: 'Imagem' }, { id: 'Banner', label: 'Banner' }, { id: 'Logo', label: 'Logo' }, { id: 'Ícone', label: 'Ícone' }, { id: 'Vídeo', label: 'Vídeo' }];

// 'none' é o sentinel de "removido explicitamente" — diferente de undefined
// (que significa "usar o mediaId padrão do mock").
function resolveMedia(mediaKey, fallbackMediaId, mediaOverrides) {
  const override = mediaOverrides[mediaKey];
  if (override === 'none') return null;
  const id = override || fallbackMediaId;
  if (!id) return null;
  return ADMIN_CMS_MEDIA.find((media) => media.id === id) || null;
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
function MediaControl({ fallbackMediaId, label, mediaKey, mediaOverrides, onOpenPicker, onRemove }) {
  const media = resolveMedia(mediaKey, fallbackMediaId, mediaOverrides);
  return (
    <View style={styles.mediaControl}>
      {label ? <Text style={styles.mediaControlLabel}>{label}</Text> : null}
      <View style={styles.mediaControlRow}>
        <View style={styles.mediaControlThumb}>
          <Icon color={adminColors.textMuted} name={media ? (MEDIA_ICON[media.type] || 'image-outline') : 'image-outline'} size={20} />
        </View>
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
function MediaPickerModal({ onClose, onSelect, target }) {
  const [subTab, setSubTab] = useState(target.mode === 'upload' ? 'upload' : 'library');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => ADMIN_CMS_MEDIA.filter((media) => {
    if (typeFilter !== 'all' && media.type !== typeFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return media.name.toLowerCase().includes(q) || media.usage.toLowerCase().includes(q);
  }), [query, typeFilter]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar mídia</Text>
            <TouchableOpacity accessibilityLabel="Fechar" accessibilityRole="button" onPress={onClose}>
              <Icon color={adminColors.textMuted} name="close-outline" size={20} />
            </TouchableOpacity>
          </View>
          <AdminChipGroup activeId={subTab} onSelect={setSubTab} options={PICKER_SUBTABS} />
          {subTab === 'library' ? (
            <View style={styles.modalBody}>
              <AdminSearchInput onChangeText={setQuery} placeholder="Buscar por nome ou uso..." style={styles.modalSearch} value={query} />
              <AdminChipGroup activeId={typeFilter} onSelect={setTypeFilter} options={MEDIA_TYPE_TABS} />
              <ScrollView style={styles.modalGridScroll}>
                <View style={styles.cardsGrid}>
                  {filtered.length === 0 ? <Text style={styles.emptyPickerText}>Nenhuma mídia encontrada.</Text> : filtered.map((media) => (
                    <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} key={media.id} onPress={() => onSelect(media)} style={styles.pickerCard}>
                      <View style={styles.mediaThumb}><Icon color={adminColors.textMuted} name={MEDIA_ICON[media.type] || 'image-outline'} size={22} /></View>
                      <Text numberOfLines={1} style={styles.cardTitle}>{media.name}</Text>
                      <Text numberOfLines={1} style={styles.cardFooter}>{media.type} · {media.dimensions}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.modalBody}>
              <View style={styles.dropzone}>
                <Icon color={adminColors.textMuted} name="cloud-upload-outline" size={28} />
                <Text style={styles.dropzoneText}>[ Arraste uma imagem aqui ]</Text>
                <Text style={styles.dropzoneOr}>ou</Text>
                <View style={styles.actionPill}><Text style={styles.actionPillText}>[ Selecionar arquivo ]</Text></View>
                <Text style={styles.dropzoneFormats}>Formatos permitidos: JPG, PNG, WEBP, SVG (quando apropriado)</Text>
              </View>
              <View style={styles.actionPill}><Text style={styles.actionPillText}>Confirmar envio</Text></View>
              <Text style={styles.actionsNote}>Preparado para integração futura com Cloudinary — sem upload real nesta etapa e sem API key, secret, cloud name ou credencial expostos.</Text>
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
function FieldDrawer({ item, mediaKey, mediaOverrides, onClose, onOpenPicker, onRemoveMedia, sectionLabel }) {
  const timeline = item.timeline || [{ label: `Status: ${item.statusLabel}`, at: item.lastChangedAt }, { label: `Alterado por ${item.changedBy}`, at: item.lastChangedAt }];
  return (
    <DetailDrawer onClose={onClose} title={item.label}>
      <DetailSection title="Conteúdo">
        <DetailRow label="Seção" value={sectionLabel} />
        <DetailRow label="Descrição" value={item.description} />
        <DetailRow label="Valor atual" value={item.value} />
        <DetailRow label="Status" value={item.statusLabel} />
      </DetailSection>
      {mediaKey ? (
        <DetailSection title="Mídia">
          <MediaControl fallbackMediaId={item.mediaId} mediaKey={mediaKey} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
        </DetailSection>
      ) : null}
      <DetailSection title="Controle de versão">
        <DetailRow label="Versão" value={item.version} />
        <DetailRow label="Última alteração" value={item.lastChangedAt} />
        <DetailRow label="Alterado por" value={item.changedBy} />
      </DetailSection>
      <DetailSection title="Histórico recente">
        <DetailTimeline steps={timeline} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

// Reaproveitado por Tema/Visual e SEO/Metadados — campos simples sem status.
function SimpleFieldDrawer({ item, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={item.label}>
      <DetailSection title="Campo">
        <DetailRow label="Descrição" value={item.description} />
        <DetailRow label="Valor atual" value={item.value} />
      </DetailSection>
      {item.swatch ? (
        <DetailSection title="Preview">
          <View style={[styles.swatchPreview, { backgroundColor: item.swatch }]} />
        </DetailSection>
      ) : null}
      <DetailSection title="Controle de versão">
        <DetailRow label="Última alteração" value={item.lastChangedAt} />
        <DetailRow label="Alterado por" value={item.changedBy} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

function BannerDrawer({ banner, mediaKey, mediaOverrides, onClose, onOpenPicker, onRemoveMedia }) {
  return (
    <DetailDrawer onClose={onClose} title={banner.name}>
      <DetailSection title="Campanha">
        <DetailRow label="Título" value={banner.title} />
        <DetailRow label="Subtítulo" value={banner.subtitle} />
        <DetailRow label="Nome do arquivo (mock)" value={banner.image} />
        <DetailRow label="CTA" value={banner.cta} />
        <DetailRow label="Link" value={banner.link} />
      </DetailSection>
      <DetailSection title="Mídia">
        <MediaControl fallbackMediaId={banner.mediaId} mediaKey={mediaKey} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
      </DetailSection>
      <DetailSection title="Exibição">
        <DetailRow label="Posição" value={banner.position} />
        <DetailRow label="Data de início" value={banner.startDate} />
        <DetailRow label="Data de término" value={banner.endDate} />
        <DetailRow label="Prioridade" value={String(banner.priority)} />
        <DetailRow label="Status" value={banner.statusLabel} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

function ServiceDrawer({ mediaKey, mediaOverrides, onClose, onOpenPicker, onRemoveMedia, service }) {
  return (
    <DetailDrawer onClose={onClose} title={service.name}>
      <DetailSection title="Card de serviço">
        <DetailRow label="Ícone atual (in-app)" value={service.icon} />
        <DetailRow label="Descrição" value={service.description} />
        <DetailRow label="Categoria" value={service.category} />
        <DetailRow label="Link interno" value={service.link} />
        <DetailRow label="Ordem" value={String(service.order)} />
        <DetailRow label="Visibilidade" value={service.visible ? 'Visível' : 'Oculto'} />
      </DetailSection>
      <DetailSection title="Mídia">
        <MediaControl fallbackMediaId={service.mediaId} mediaKey={mediaKey} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

function ProductDrawer({ mediaKey, mediaOverrides, onClose, onOpenPicker, onRemoveMedia, product }) {
  return (
    <DetailDrawer onClose={onClose} title={product.name}>
      <DetailSection title="Produto">
        <DetailRow label="Categoria" value={product.category} />
        <DetailRow label="Descrição" value={product.description} />
        <DetailRow label="Nome do arquivo (mock)" value={product.image} />
        <DetailRow label="Destaque" value={product.featured ? 'Sim' : 'Não'} />
        <DetailRow label="Status" value={product.statusLabel} />
      </DetailSection>
      <DetailSection title="Mídia">
        <MediaControl mediaKey={mediaKey} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
      </DetailSection>
      <DetailSection title="Exibição">
        <DetailRow label="Ordem" value={String(product.order)} />
        <DetailRow label="CTA" value={product.cta} />
        <DetailRow label="Link" value={product.link} />
        <DetailRow label="Público" value={product.audience} />
        <DetailRow label="Data de publicação" value={product.publishedAt} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

function TextDrawer({ item, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={item.key}>
      <DetailSection title="Texto">
        <DetailRow label="Chave" value={item.key} />
        <DetailRow label="Tela" value={item.screen} />
        <DetailRow label="Seção" value={item.section} />
        <DetailRow label="Texto atual" value={item.text} />
        <DetailRow label="Idioma" value={item.language} />
        <DetailRow label="Status" value={item.statusLabel} />
      </DetailSection>
      <DetailSection title="Controle de versão">
        <DetailRow label="Última alteração" value={item.lastChangedAt} />
        <DetailRow label="Alterado por" value={item.changedBy} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

function MediaDrawer({ media, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={media.name}>
      <DetailSection title="Arquivo (mock)">
        <DetailRow label="Tipo" value={media.type} />
        <DetailRow label="Dimensões" value={media.dimensions} />
        <DetailRow label="Tamanho (mock)" value={media.size} />
        <DetailRow label="Uso atual" value={media.usage} />
        <DetailRow label="Data de upload" value={media.uploadedAt} />
        <DetailRow label="Status" value={media.statusLabel} />
      </DetailSection>
      <DetailSection title="Ações">
        <ActionPills actions={['Substituir', 'Ver usos', 'Copiar referência', 'Arquivar']} note="Preparado para integração futura com Cloudinary — sem upload real e sem credenciais expostas nesta etapa." />
      </DetailSection>
    </DetailDrawer>
  );
}

function LinkDrawer({ link, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={link.label}>
      <DetailSection title="Botão/Link">
        <DetailRow label="Texto do botão" value={link.label} />
        <DetailRow label="Ação" value={link.action} />
        <DetailRow label="Destino" value={link.destination} />
        <DetailRow label="Tela" value={link.screen} />
        <DetailRow label="Posição" value={link.position} />
        <DetailRow label="Abertura" value={link.openMode} />
        <DetailRow label="Status" value={link.statusLabel} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

function NavItemDrawer({ groupLabel, item, onClose }) {
  return (
    <DetailDrawer onClose={onClose} title={item.item}>
      <DetailSection title="Item de navegação">
        <DetailRow label="Grupo" value={groupLabel} />
        <DetailRow label="Ícone" value={item.icon} />
        <DetailRow label="Rota" value={item.route} />
        <DetailRow label="Ordem" value={String(item.order)} />
        <DetailRow label="Visibilidade" value={item.visible ? 'Visível' : 'Oculto'} />
        <DetailRow label="Público" value={item.audience} />
      </DetailSection>
      <CmsFlowSection />
    </DetailDrawer>
  );
}

function ContentCard({ item, mediaKey, mediaOverrides, onOpenPicker, onPress, onRemoveMedia, showQuickActions }) {
  return (
    <TouchablePressCard onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.label}</Text>
        <StatusBadge label={item.statusLabel} tone={CMS_STATUS_TONE[item.statusKey]} />
      </View>
      <Text numberOfLines={3} style={styles.cardValue}>{item.value}</Text>
      <Text style={styles.cardFooter}>Última alteração: {item.lastChangedAt} · por {item.changedBy}</Text>
      {mediaKey ? <MediaControl fallbackMediaId={item.mediaId} mediaKey={mediaKey} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} /> : null}
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
      <Text numberOfLines={2} style={styles.cardValue}>{token.value}</Text>
      <Text style={styles.cardFooter}>Última alteração: {token.lastChangedAt} · por {token.changedBy}</Text>
    </TouchablePressCard>
  );
}

function ServiceCard({ mediaOverrides, onOpenPicker, onPress, onRemoveMedia, service }) {
  return (
    <TouchablePressCard onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.serviceIconWrap}><Icon color={adminColors.accentPurpleSoft} name={service.icon} size={18} /></View>
        <StatusBadge label={service.visible ? 'Visível' : 'Oculto'} tone={service.visible ? 'success' : 'neutral'} />
      </View>
      <Text numberOfLines={1} style={styles.cardTitle}>{service.name}</Text>
      <Text numberOfLines={2} style={styles.cardValue}>{service.description}</Text>
      <Text style={styles.cardFooter}>Ordem {service.order} · {service.category}</Text>
      <MediaControl fallbackMediaId={service.mediaId} mediaKey={`service:${service.id}`} mediaOverrides={mediaOverrides} onOpenPicker={onOpenPicker} onRemove={onRemoveMedia} />
    </TouchablePressCard>
  );
}

function MediaCard({ media, onPress }) {
  return (
    <TouchablePressCard onPress={onPress}>
      <View style={styles.mediaThumb}><Icon color={adminColors.textMuted} name={MEDIA_ICON[media.type] || 'image-outline'} size={22} /></View>
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
function MiniThumb({ fallbackMediaId, mediaKey, mediaOverrides }) {
  const media = resolveMedia(mediaKey, fallbackMediaId, mediaOverrides);
  return (
    <View style={styles.miniThumb}>
      <Icon color={adminColors.textMuted} name={media ? (MEDIA_ICON[media.type] || 'image-outline') : 'image-outline'} size={16} />
    </View>
  );
}

// Card clicável genérico reaproveitado por ContentCard, TokenCard,
// ServiceCard e MediaCard.
function TouchablePressCard({ children, onPress }) {
  return <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.card}>{children}</TouchableOpacity>;
}

export default function AdminCmsScreen() {
  const [tab, setTab] = useState('home');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  // Overrides de mídia aplicados nesta sessão — { [mediaKey]: mediaId | 'none' }.
  // Nunca persiste: reseta ao recarregar a página, como pedido no brief
  // ("ainda sem persistência real").
  const [mediaOverrides, setMediaOverrides] = useState({});
  const [pickerTarget, setPickerTarget] = useState(null);

  const openPicker = (mediaKey, mode) => setPickerTarget({ key: mediaKey, mode });
  const closePicker = () => setPickerTarget(null);
  const selectMedia = (media) => {
    if (pickerTarget) setMediaOverrides((prev) => ({ ...prev, [pickerTarget.key]: media.id }));
    closePicker();
  };
  const removeMedia = (mediaKey) => setMediaOverrides((prev) => ({ ...prev, [mediaKey]: 'none' }));

  const filteredTexts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_CMS_TEXTS;
    return ADMIN_CMS_TEXTS.filter((item) => [item.key, item.screen, item.text].some((field) => (field || '').toLowerCase().includes(q)));
  }, [query]);

  const closeDrawer = () => setSelected(null);

  let body = null;
  let drawer = null;

  if (tab === 'home') {
    body = (
      <View style={styles.cardsGrid}>
        {ADMIN_CMS_HOME_BLOCKS.map((item) => (
          <ContentCard
            item={item}
            key={item.id}
            mediaKey={HOME_MEDIA_IDS.has(item.id) ? `home:${item.id}` : null}
            mediaOverrides={mediaOverrides}
            onOpenPicker={openPicker}
            onPress={() => setSelected({ kind: 'field', section: 'Home', item })}
            onRemoveMedia={removeMedia}
            showQuickActions
          />
        ))}
      </View>
    );
  } else if (tab === 'login') {
    body = (
      <View style={styles.cardsGrid}>
        {ADMIN_CMS_LOGIN_FIELDS.map((item) => (
          <ContentCard
            item={item}
            key={item.id}
            mediaKey={LOGIN_MEDIA_IDS.has(item.id) ? `login:${item.id}` : null}
            mediaOverrides={mediaOverrides}
            onOpenPicker={openPicker}
            onPress={() => setSelected({ kind: 'field', section: 'Login', item })}
            onRemoveMedia={removeMedia}
          />
        ))}
      </View>
    );
  } else if (tab === 'banners') {
    const columns = [
      { key: 'media', label: 'Mídia', flex: 0.5, render: (row) => <MiniThumb fallbackMediaId={row.mediaId} mediaKey={`banner:${row.id}`} mediaOverrides={mediaOverrides} /> },
      { key: 'name', label: 'Nome da campanha', flex: 1.3 },
      { key: 'title', label: 'Título', flex: 1.2 },
      { key: 'position', label: 'Posição', flex: 1.1 },
      { key: 'period', label: 'Período', flex: 1, render: (row) => <Text style={styles.cellText}>{`${row.startDate} – ${row.endDate}`}</Text> },
      { key: 'priority', label: 'Prioridade', flex: 0.6, render: (row) => <Text style={styles.cellText}>{row.priority}</Text> },
      { key: 'statusLabel', label: 'Status', flex: 0.9, render: (row) => <StatusBadge label={row.statusLabel} tone={BANNER_STATUS_TONE[row.statusKey]} /> },
    ];
    body = <AdminTable columns={columns} onRowPress={(row) => setSelected({ kind: 'banner', item: row })} rows={ADMIN_CMS_BANNERS} selectedId={selected?.item?.id} />;
  } else if (tab === 'services') {
    body = (
      <View style={styles.cardsGrid}>
        {ADMIN_CMS_SERVICES.map((service) => (
          <ServiceCard
            key={service.id}
            mediaOverrides={mediaOverrides}
            onOpenPicker={openPicker}
            onPress={() => setSelected({ kind: 'service', item: service })}
            onRemoveMedia={removeMedia}
            service={service}
          />
        ))}
      </View>
    );
  } else if (tab === 'products') {
    const columns = [
      { key: 'media', label: 'Mídia', flex: 0.5, render: (row) => <MiniThumb mediaKey={`product:${row.id}`} mediaOverrides={mediaOverrides} /> },
      { key: 'name', label: 'Nome', flex: 1.4 },
      { key: 'category', label: 'Categoria', flex: 1 },
      { key: 'featured', label: 'Destaque', flex: 0.7, render: (row) => <Text style={styles.cellText}>{row.featured ? 'Sim' : 'Não'}</Text> },
      { key: 'statusLabel', label: 'Status', flex: 1, render: (row) => <StatusBadge label={row.statusLabel} tone={CMS_STATUS_TONE[row.statusKey]} /> },
      { key: 'audience', label: 'Público', flex: 0.8 },
      { key: 'publishedAt', label: 'Publicado em', flex: 0.9 },
    ];
    body = <AdminTable columns={columns} onRowPress={(row) => setSelected({ kind: 'product', item: row })} rows={ADMIN_CMS_PRODUCTS} selectedId={selected?.item?.id} />;
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
        <AdminSearchInput onChangeText={setQuery} placeholder="Buscar por chave, tela ou trecho do texto..." style={styles.search} value={query} />
        <View style={styles.tableBody}>
          <AdminTable columns={columns} emptyMessage="Nenhum texto encontrado." onRowPress={(row) => setSelected({ kind: 'text', item: row })} rows={filteredTexts} selectedId={selected?.item?.id} />
        </View>
      </View>
    );
  } else if (tab === 'media') {
    body = (
      <View style={styles.mediaWrap}>
        <ActionPills actions={MEDIA_TOOLBAR_ACTIONS} note="Biblioteca preparada para integração futura com Cloudinary — ainda sem upload real. Usada como seletor por todos os cards/drawers com mídia." />
        <View style={styles.cardsGrid}>
          {ADMIN_CMS_MEDIA.map((media) => (
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
    body = <AdminTable columns={columns} onRowPress={(row) => setSelected({ kind: 'link', item: row })} rows={ADMIN_CMS_LINKS} selectedId={selected?.item?.id} />;
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
        {ADMIN_CMS_NAV_GROUPS.map((group) => (
          <View key={group.id} style={styles.navGroup}>
            <Text style={styles.navGroupTitle}>{group.label}</Text>
            <AdminTable columns={navColumns} onRowPress={(row) => setSelected({ kind: 'nav', groupLabel: group.label, item: row })} rows={group.items} selectedId={selected?.item?.id} />
          </View>
        ))}
      </View>
    );
  } else if (tab === 'theme') {
    body = (
      <View style={styles.mediaWrap}>
        <View style={styles.cardsGrid}>
          {ADMIN_CMS_THEME_TOKENS.map((token) => (
            <TokenCard key={token.id} onPress={() => setSelected({ kind: 'simple', item: token })} token={token} />
          ))}
        </View>
        <View style={styles.previewPanel}>
          <Text style={styles.navGroupTitle}>Assets gráficos do tema</Text>
          <MediaControl fallbackMediaId="MED-02" label="Logo" mediaKey="theme:logo" mediaOverrides={mediaOverrides} onOpenPicker={openPicker} onRemove={removeMedia} />
          <MediaControl fallbackMediaId="MED-07" label="Background" mediaKey="theme:background" mediaOverrides={mediaOverrides} onOpenPicker={openPicker} onRemove={removeMedia} />
          <MediaControl label="Imagens institucionais" mediaKey="theme:institutional" mediaOverrides={mediaOverrides} onOpenPicker={openPicker} onRemove={removeMedia} />
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
      <View style={styles.cardsGrid}>
        {ADMIN_CMS_SEO.map((item) => (
          <TokenCard key={item.id} onPress={() => setSelected({ kind: 'simple', item })} token={item} />
        ))}
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
    const idSet = selected.section === 'Home' ? HOME_MEDIA_IDS : LOGIN_MEDIA_IDS;
    const mediaKey = idSet.has(selected.item.id) ? `${selected.section.toLowerCase()}:${selected.item.id}` : null;
    drawer = <FieldDrawer item={selected.item} mediaKey={mediaKey} mediaOverrides={mediaOverrides} onClose={closeDrawer} onOpenPicker={openPicker} onRemoveMedia={removeMedia} sectionLabel={selected.section} />;
  } else if (selected?.kind === 'simple') {
    drawer = <SimpleFieldDrawer item={selected.item} onClose={closeDrawer} />;
  } else if (selected?.kind === 'banner') {
    drawer = <BannerDrawer banner={selected.item} mediaKey={`banner:${selected.item.id}`} mediaOverrides={mediaOverrides} onClose={closeDrawer} onOpenPicker={openPicker} onRemoveMedia={removeMedia} />;
  } else if (selected?.kind === 'service') {
    drawer = <ServiceDrawer mediaKey={`service:${selected.item.id}`} mediaOverrides={mediaOverrides} onClose={closeDrawer} onOpenPicker={openPicker} onRemoveMedia={removeMedia} service={selected.item} />;
  } else if (selected?.kind === 'product') {
    drawer = <ProductDrawer mediaKey={`product:${selected.item.id}`} mediaOverrides={mediaOverrides} onClose={closeDrawer} onOpenPicker={openPicker} onRemoveMedia={removeMedia} product={selected.item} />;
  } else if (selected?.kind === 'text') {
    drawer = <TextDrawer item={selected.item} onClose={closeDrawer} />;
  } else if (selected?.kind === 'media') {
    drawer = <MediaDrawer media={selected.item} onClose={closeDrawer} />;
  } else if (selected?.kind === 'link') {
    drawer = <LinkDrawer link={selected.item} onClose={closeDrawer} />;
  } else if (selected?.kind === 'nav') {
    drawer = <NavItemDrawer groupLabel={selected.groupLabel} item={selected.item} onClose={closeDrawer} />;
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

      {pickerTarget ? <MediaPickerModal onClose={closePicker} onSelect={selectMedia} target={pickerTarget} /> : null}
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
  mediaThumb: { alignItems: 'center', backgroundColor: adminColors.surface, borderRadius: radii.md, height: 64, justifyContent: 'center', marginBottom: spacing.sm },
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
  mediaControlThumb: { alignItems: 'center', backgroundColor: adminColors.surface, borderRadius: radii.sm, height: 40, justifyContent: 'center', width: 40 },
  mediaControlInfo: { flex: 1, gap: 2 },
  mediaActionButton: { backgroundColor: adminColors.infoSoft, borderColor: 'rgba(119, 105, 232, 0.45)', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  mediaActionButtonText: { ...typography.label, color: adminColors.textPrimary },
  miniThumb: { alignItems: 'center', backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.sm, borderWidth: 1, height: 32, justifyContent: 'center', width: 32 },
  // Modal de seleção de mídia.
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(4, 5, 10, 0.72)', flex: 1, justifyContent: 'center', padding: spacing.xl },
  modalPanel: { backgroundColor: adminColors.card, borderColor: adminColors.border, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, maxHeight: '85%', maxWidth: 720, padding: spacing.lg, width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { ...typography.heading3, color: adminColors.textPrimary },
  modalBody: { gap: spacing.md },
  modalSearch: { maxWidth: '100%' },
  modalGridScroll: { maxHeight: 360 },
  pickerCard: { backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: 180, flexGrow: 1, padding: spacing.md },
  emptyPickerText: { ...typography.body, color: adminColors.textMuted, padding: spacing.lg },
  dropzone: { alignItems: 'center', backgroundColor: adminColors.surface, borderColor: adminColors.border, borderRadius: radii.lg, borderStyle: 'dashed', borderWidth: 1, gap: spacing.sm, paddingVertical: spacing.xxl },
  dropzoneText: { ...typography.bodyMedium, color: adminColors.textSecondary },
  dropzoneOr: { ...typography.caption, color: adminColors.textMuted },
  dropzoneFormats: { ...typography.caption, color: adminColors.textMuted, marginTop: spacing.xs },
  modalFooter: { alignItems: 'flex-end' },
  modalCancelButton: { borderColor: adminColors.border, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  modalCancelText: { ...typography.bodyMedium, color: adminColors.textSecondary },
});
