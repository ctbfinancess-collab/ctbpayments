import { apiClient } from '../../api';

// Cliente do CRUD real de conteúdo do CMS (banners e serviços por
// enquanto — os outros tipos continuam mock até as próximas etapas). Mesmo
// padrão de sessão (cookie, credentials:'include') do adminAuthClient.
export class AdminCmsError extends Error {
  constructor(message, code = 'CMS_ERROR') {
    super(message);
    this.name = 'AdminCmsError';
    this.code = code;
  }
}

// Mesmos rótulos/tons já usados no mock (adminMockData.js) — repetidos
// aqui porque agora o "statusKey" vem do banco como texto livre, não de
// um objeto local com o label já anexado.
export const BANNER_STATUS_LABEL = { active: 'Ativa', scheduled: 'Agendada', paused: 'Pausada', ended: 'Encerrada', draft: 'Rascunho' };
export const BANNER_STATUS_OPTIONS = [
  { id: 'draft', label: 'Rascunho' },
  { id: 'scheduled', label: 'Agendada' },
  { id: 'active', label: 'Ativa' },
  { id: 'paused', label: 'Pausada' },
  { id: 'ended', label: 'Encerrada' },
];

function normalizeBanner(item) {
  return { ...item, statusKey: item.status, statusLabel: BANNER_STATUS_LABEL[item.status] || item.status };
}

async function request(path, options) {
  try {
    return await apiClient(path, { credentials: 'include', skipAuth: true, ...options });
  } catch (error) {
    if (error.status === 401) throw new AdminCmsError('Sua sessão expirou. Faça login novamente.', 'ADMIN_SESSION_INVALID');
    throw new AdminCmsError(error.message || 'Não foi possível processar a solicitação.', error.code || 'CMS_ERROR');
  }
}

// Só estes 8 campos formam o "value" (jsonb) de um banner no backend — ver
// bannerValueSchema em backend/src/routes/adminCms.ts.
export function bannerValueFromFields(fields) {
  const { title, subtitle, cta, link, position, startDate, endDate, priority } = fields;
  return { title, subtitle, cta, link, position, startDate, endDate, priority: Number(priority) || 0 };
}

export async function listBanners() {
  const response = await request('/v1/admin/cms/items?collection=banner', { method: 'GET' });
  return response.data.items.map(normalizeBanner);
}

export async function createBanner({ name, value, status = 'draft', order }) {
  const response = await request('/v1/admin/cms/items', {
    method: 'POST', body: JSON.stringify({ collection: 'banner', name, value, status, order }),
  });
  return normalizeBanner(response.data.item);
}

export async function updateBanner(id, patch) {
  const response = await request(`/v1/admin/cms/items/${id}?collection=banner`, { method: 'PUT', body: JSON.stringify(patch) });
  return normalizeBanner(response.data.item);
}

export async function deleteBanner(id) {
  // Corpo vazio + Content-Type: application/json faz o Fastify recusar a
  // requisição (FST_ERR_CTP_EMPTY_JSON_BODY) — manda um objeto vazio.
  await request(`/v1/admin/cms/items/${id}?collection=banner`, { method: 'DELETE', body: JSON.stringify({}) });
}

function normalizeService(item) {
  return { ...item, visible: item.visible ?? true };
}

// Só estes 5 campos formam o "value" (jsonb) de um serviço no backend.
export function serviceValueFromFields(fields) {
  const { icon, description, link, category, order, visible } = fields;
  return { icon, description, link, category, order: Number(order) || 0, visible: Boolean(visible) };
}

export async function listServices() {
  const response = await request('/v1/admin/cms/items?collection=service', { method: 'GET' });
  return response.data.items.map(normalizeService);
}

export async function createService({ name, value, order }) {
  const response = await request('/v1/admin/cms/items', {
    method: 'POST', body: JSON.stringify({ collection: 'service', name, value, status: 'active', order }),
  });
  return normalizeService(response.data.item);
}

export async function updateService(id, patch) {
  const response = await request(`/v1/admin/cms/items/${id}?collection=service`, { method: 'PUT', body: JSON.stringify(patch) });
  return normalizeService(response.data.item);
}

export async function deleteService(id) {
  await request(`/v1/admin/cms/items/${id}?collection=service`, { method: 'DELETE', body: JSON.stringify({}) });
}

// Mesmos rótulos/tons de CMS_STATUS_LABEL (adminMockData.js), repetidos
// aqui pelo mesmo motivo dos de banner.
export const PRODUCT_STATUS_LABEL = { draft: 'Rascunho', published: 'Publicado', restored: 'Restaurado', archived: 'Arquivado' };
export const PRODUCT_STATUS_OPTIONS = [
  { id: 'draft', label: 'Rascunho' },
  { id: 'published', label: 'Publicado' },
  { id: 'archived', label: 'Arquivado' },
];

function normalizeProduct(item) {
  return { ...item, statusKey: item.status, statusLabel: PRODUCT_STATUS_LABEL[item.status] || item.status };
}

// Só estes 6 campos formam o "value" (jsonb) de um produto no backend.
export function productValueFromFields(fields) {
  const { category, description, cta, link, audience, publishedAt, featured } = fields;
  return { category, description, cta, link, audience, publishedAt, featured: Boolean(featured) };
}

export async function listProducts() {
  const response = await request('/v1/admin/cms/items?collection=product', { method: 'GET' });
  return response.data.items.map(normalizeProduct);
}

export async function createProduct({ name, value, status = 'draft', order }) {
  const response = await request('/v1/admin/cms/items', {
    method: 'POST', body: JSON.stringify({ collection: 'product', name, value, status, order }),
  });
  return normalizeProduct(response.data.item);
}

export async function updateProduct(id, patch) {
  const response = await request(`/v1/admin/cms/items/${id}?collection=product`, { method: 'PUT', body: JSON.stringify(patch) });
  return normalizeProduct(response.data.item);
}

export async function deleteProduct(id) {
  await request(`/v1/admin/cms/items/${id}?collection=product`, { method: 'DELETE', body: JSON.stringify({}) });
}

// Textos não têm status draft/publicado real hoje (o mock só usa
// "published"/"draft" pra decoração) nem mídia — "name" no banco é a
// própria chave (estilo i18n), exposta aqui como "key" pro resto da tela
// continuar chamando o campo do jeito que já chamava.
function normalizeText(item) {
  return { ...item, key: item.name, statusKey: item.status, statusLabel: PRODUCT_STATUS_LABEL[item.status] || item.status };
}

// Só estes 3 campos formam o "value" (jsonb) de um texto no backend — a
// chave em si é o "name" (ver textValueFromFields/updateText abaixo).
export function textValueFromFields(fields) {
  const { screen, section, text, language } = fields;
  return { screen, section, text, language };
}

export async function listTexts() {
  const response = await request('/v1/admin/cms/items?collection=text', { method: 'GET' });
  return response.data.items.map(normalizeText);
}

export async function createText({ key, value, status = 'draft' }) {
  const response = await request('/v1/admin/cms/items', {
    method: 'POST', body: JSON.stringify({ collection: 'text', name: key, value, status }),
  });
  return normalizeText(response.data.item);
}

// patch usa "key" (não "name") pra bater com o resto da tela — traduzido
// pra "name" aqui, já que é assim que o banco guarda.
export async function updateText(id, { key, ...patch }) {
  const body = key !== undefined ? { ...patch, name: key } : patch;
  const response = await request(`/v1/admin/cms/items/${id}?collection=text`, { method: 'PUT', body: JSON.stringify(body) });
  return normalizeText(response.data.item);
}

export async function deleteText(id) {
  await request(`/v1/admin/cms/items/${id}?collection=text`, { method: 'DELETE', body: JSON.stringify({}) });
}

// Links/Botões — quinto tipo de conteúdo com persistência real, sem mídia.
// "label" (o texto do botão) é o "name" no banco, mesmo padrão de "key" nos
// textos.
export const LINK_STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo' };
export const LINK_STATUS_OPTIONS = [
  { id: 'active', label: 'Ativo' },
  { id: 'inactive', label: 'Inativo' },
];

function normalizeLink(item) {
  return { ...item, label: item.name, statusKey: item.status, statusLabel: LINK_STATUS_LABEL[item.status] || item.status };
}

// Só estes 5 campos formam o "value" (jsonb) de um link/botão no backend —
// "label" fica de fora por ser o "name".
export function linkValueFromFields(fields) {
  const { action, destination, screen, position, openMode } = fields;
  return { action, destination, screen, position, openMode };
}

export async function listLinks() {
  const response = await request('/v1/admin/cms/items?collection=link', { method: 'GET' });
  return response.data.items.map(normalizeLink);
}

export async function createLink({ label, value, status = 'active' }) {
  const response = await request('/v1/admin/cms/items', {
    method: 'POST', body: JSON.stringify({ collection: 'link', name: label, value, status }),
  });
  return normalizeLink(response.data.item);
}

export async function updateLink(id, { label, ...patch }) {
  const body = label !== undefined ? { ...patch, name: label } : patch;
  const response = await request(`/v1/admin/cms/items/${id}?collection=link`, { method: 'PUT', body: JSON.stringify(body) });
  return normalizeLink(response.data.item);
}

export async function deleteLink(id) {
  await request(`/v1/admin/cms/items/${id}?collection=link`, { method: 'DELETE', body: JSON.stringify({}) });
}

// Navegação — sexto tipo de conteúdo com persistência real, sem mídia.
// Organizada em 4 grupos fixos (mesmos ids/labels do mock ADMIN_CMS_NAV_
// GROUPS) — o grupo em si é só mais um campo dentro de "value" (o backend
// não tem uma tabela por grupo), o agrupamento acontece no frontend.
export const NAV_GROUPS = [
  { id: 'bottom_menu', label: 'Menu inferior do app' },
  { id: 'home_shortcuts', label: 'Atalhos da Home' },
  { id: 'secondary_menus', label: 'Menus secundários' },
  { id: 'institutional_links', label: 'Links institucionais' },
];

function normalizeNavItem(item) {
  return { ...item, item: item.name };
}

// Só estes 4 campos formam o "value" (jsonb) de um item de navegação no
// backend — "order" é coluna própria (não fica dentro de value).
export function navItemValueFromFields(fields) {
  const { group, icon, route, audience, visible } = fields;
  return { group, icon, route, audience, visible: Boolean(visible) };
}

export async function listNavItems() {
  const response = await request('/v1/admin/cms/items?collection=nav_item', { method: 'GET' });
  return response.data.items.map(normalizeNavItem);
}

export async function createNavItem({ item, value, order }) {
  const response = await request('/v1/admin/cms/items', {
    method: 'POST', body: JSON.stringify({ collection: 'nav_item', name: item, value, status: 'active', order }),
  });
  return normalizeNavItem(response.data.item);
}

export async function updateNavItem(id, { item, order, ...patch }) {
  const body = { ...patch, ...(item !== undefined ? { name: item } : {}), ...(order !== undefined ? { order } : {}) };
  const response = await request(`/v1/admin/cms/items/${id}?collection=nav_item`, { method: 'PUT', body: JSON.stringify(body) });
  return normalizeNavItem(response.data.item);
}

export async function deleteNavItem(id) {
  await request(`/v1/admin/cms/items/${id}?collection=nav_item`, { method: 'DELETE', body: JSON.stringify({}) });
}

// Home/Login/Tema/SEO (cms_sections) — campos estruturais: só listar e
// editar, sem criar/excluir (cada "key" já é um elemento fixo de UI — ver
// comentário em CmsSectionsRepository no backend). Endpoint próprio
// (/cms/sections), formato de resposta igual ao de cms_items (achatado).
function normalizeSectionItem(item) {
  return { ...item, statusKey: item.status };
}

export async function listCmsSection(section) {
  const response = await request(`/v1/admin/cms/sections?section=${section}`, { method: 'GET' });
  return response.data.items.map(normalizeSectionItem);
}

export async function updateCmsSectionItem(id, section, patch) {
  const response = await request(`/v1/admin/cms/sections/${id}?section=${section}`, { method: 'PUT', body: JSON.stringify(patch) });
  return normalizeSectionItem(response.data.item);
}
