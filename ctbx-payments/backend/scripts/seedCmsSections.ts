// Popula cms_sections com o conteúdo mock atual de ADMIN_CMS_HOME_BLOCKS,
// ADMIN_CMS_LOGIN_FIELDS, ADMIN_CMS_THEME_TOKENS e ADMIN_CMS_SEO — os 4
// tipos "estruturais" (um valor por campo fixo de UI, sem create/delete
// pelo admin — ver comentário em CmsSectionsRepository). "key" = o id do
// mock (ex.: 'home-1', 'THM-01'), garantindo idempotência via o índice
// único (section, key) do schema.
import { and, eq } from 'drizzle-orm';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { cmsSections } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL antes de rodar este script.');

const HOME_MEDIA_IDS = new Set(['home-4', 'home-5', 'home-7', 'home-8', 'home-9']);
const LOGIN_MEDIA_IDS = new Set(['login-1', 'login-4']);
const SEO_MEDIA_IDS = new Set(['SEO-03', 'SEO-10']);

const HOME = [
  { key: 'home-1', label: 'Título principal', description: 'Título de destaque exibido no topo da Home.', text: 'Bem-vindo à CTBX Payments', status: 'published' },
  { key: 'home-2', label: 'Subtítulo', description: 'Texto de apoio abaixo do título principal.', text: 'Sua conta digital completa para pessoa física e jurídica', status: 'published' },
  { key: 'home-3', label: 'Saudação', description: 'Mensagem de saudação personalizada exibida ao abrir o app.', text: 'Olá, {primeiro_nome} 👋', status: 'published' },
  { key: 'home-4', label: 'Banner principal', description: 'Banner de destaque no topo da Home — referencia a campanha ativa.', text: 'Banner "Super CTBX 2026" (ver Banners/Campanhas)', status: 'published' },
  { key: 'home-5', label: 'Imagem de fundo', description: 'Imagem de fundo da tela Home.', text: 'ctbx-home-background.png (mock — biblioteca de mídia)', status: 'published' },
  { key: 'home-6', label: 'Blocos da Home', description: 'Blocos que compõem a Home, na ordem de exibição.', text: 'Saudação, Saldo, Acesso rápido, Campanhas, Serviços, Investimentos', status: 'published' },
  { key: 'home-7', label: 'Cards de acesso rápido', description: 'Atalhos exibidos logo abaixo do saldo.', text: 'PIX, Transferir, Pagar, Investir', status: 'published' },
  { key: 'home-8', label: 'Campanhas', description: 'Campanhas ativas exibidas na Home.', text: '2 campanhas ativas (ver aba Banners/Campanhas)', status: 'published' },
  { key: 'home-9', label: 'Textos promocionais', description: 'Texto promocional exibido no bloco de investimentos.', text: '"Invista a partir de R$ 100,00 com liquidez diária"', status: 'published' },
  { key: 'home-10', label: 'Chamadas', description: 'Chamada (call to action) para abertura de conta.', text: '"Abra sua conta em poucos minutos"', status: 'published' },
  { key: 'home-11', label: 'Botões', description: 'Botões de ação secundária exibidos na Home.', text: 'Ver extrato, Meus cartões, Investir agora', status: 'published' },
  { key: 'home-12', label: 'Ordem das seções', description: 'Ordem de exibição das seções da Home.', text: 'Saudação → Saldo → Acesso rápido → Campanhas → Serviços → Investimentos', status: 'published' },
  { key: 'home-13', label: 'Visibilidade das seções', description: 'Seções visíveis ou ocultas por tipo de cliente.', text: 'Todas visíveis, exceto "Capital de Giro" (oculta para PF)', status: 'draft' },
];

const LOGIN = [
  { key: 'login-1', label: 'Logo', description: 'Logo exibida na tela de login.', text: 'ctbx-logo-full.svg (mock)', status: 'published' },
  { key: 'login-2', label: 'Título', description: 'Título principal da tela de login.', text: 'Acesse sua conta', status: 'published' },
  { key: 'login-3', label: 'Subtítulo', description: 'Texto de apoio abaixo do título.', text: 'Entre com seu CPF/CNPJ e senha', status: 'published' },
  { key: 'login-4', label: 'Imagem/fundo', description: 'Imagem ou gradiente de fundo da tela de login.', text: 'Gradiente preto/grafite padrão CTBX', status: 'published' },
  { key: 'login-5', label: 'Texto de apoio', description: 'Texto auxiliar exibido próximo ao formulário.', text: '"Seus dados estão protegidos com criptografia de ponta a ponta"', status: 'published' },
  { key: 'login-6', label: 'Texto de ambiente', description: 'Selo de ambiente exibido no rodapé do login.', text: '"Ambiente Sandbox — dados fictícios"', status: 'published' },
  { key: 'login-7', label: 'Botão Entrar', description: 'Texto do botão principal de login.', text: '"Entrar"', status: 'published' },
  { key: 'login-8', label: 'Texto "Esqueci minha senha"', description: 'Link para recuperação de senha.', text: '"Esqueci minha senha"', status: 'published' },
  { key: 'login-9', label: 'Texto "Abra sua conta"', description: 'Chamada para abertura de conta a partir do login.', text: '"Ainda não tem conta? Abra sua conta"', status: 'published' },
  { key: 'login-10', label: 'Avisos', description: 'Avisos temporários exibidos no login (manutenção, instabilidade etc.).', text: 'Nenhum aviso ativo no momento', status: 'published' },
  { key: 'login-11', label: 'Rodapé', description: 'Texto de rodapé da tela de login.', text: '"CTBX Payments — Instituição de Pagamento"', status: 'published' },
];

const THEME = [
  { key: 'THM-01', label: 'Cor principal', description: 'Cor de destaque usada em botões primários e links ativos.', text: '#7769E8 (roxo CTBX)', swatch: '#7769E8' },
  { key: 'THM-02', label: 'Cor secundária', description: 'Cor de apoio usada em elementos secundários.', text: '#151823 (grafite escuro)', swatch: '#151823' },
  { key: 'THM-03', label: 'Cor de destaque', description: 'Cor usada em alertas e chamadas de atenção.', text: '#F2C94C (amarelo)', swatch: '#F2C94C' },
  { key: 'THM-04', label: 'Fundo', description: 'Cor de fundo padrão das telas do painel/app.', text: '#0B0D14 (preto grafite)', swatch: '#0B0D14' },
  { key: 'THM-05', label: 'Cards', description: 'Cor de fundo dos cards.', text: '#12141C', swatch: '#12141C' },
  { key: 'THM-06', label: 'Bordas', description: 'Cor padrão de bordas em cards e inputs.', text: 'rgba(255,255,255,0.08)', swatch: '#2A2D3A' },
  { key: 'THM-07', label: 'Tipografia', description: 'Família tipográfica usada em todo o app.', text: 'Poppins', swatch: null },
  { key: 'THM-08', label: 'Raio dos cards', description: 'Arredondamento padrão dos cards.', text: '16px', swatch: null },
  { key: 'THM-09', label: 'Sombra', description: 'Sombra padrão aplicada a cards elevados.', text: '0px 4px 12px rgba(0,0,0,0.35)', swatch: null },
  { key: 'THM-10', label: 'Espaçamento', description: 'Unidade base de espaçamento do grid.', text: '8px (escala 4/8/12/16/24/32)', swatch: null },
  { key: 'THM-11', label: 'Estilo dos botões', description: 'Estilo padrão de botões primários.', text: 'Cantos arredondados, sem preenchimento sólido em estados ativos', swatch: null },
];

const SEO = [
  { key: 'SEO-01', label: 'Título da página', description: 'Título usado na aba do navegador e em buscadores.', text: 'CTBX Payments — Sua conta digital completa' },
  { key: 'SEO-02', label: 'Descrição', description: 'Descrição usada em buscadores e compartilhamentos.', text: 'Abra sua conta CTBX Payments e tenha PIX, cartão, investimentos e crédito PJ em um só lugar.' },
  { key: 'SEO-03', label: 'Imagem social', description: 'Imagem exibida ao compartilhar o link em redes sociais.', text: 'seo-share-image.png (mock — 1200×630)' },
  { key: 'SEO-04', label: 'Nome do app', description: 'Nome exibido em lojas de aplicativo e metadados.', text: 'CTBX Payments' },
  { key: 'SEO-05', label: 'Nome da instituição', description: 'Razão social usada em metadados institucionais.', text: 'CTBX Payments' },
  { key: 'SEO-06', label: 'Palavras-chave', description: 'Palavras-chave usadas para indexação.', text: 'conta digital, PIX, cartão, investimentos, capital de giro' },
  { key: 'SEO-07', label: 'Canonical (mock)', description: 'URL canônica estrutural — sem publicação real.', text: 'https://ctbxpayments.com/ (mock)' },
  { key: 'SEO-08', label: 'Open Graph title', description: 'Título usado em cartões de compartilhamento (Open Graph).', text: 'CTBX Payments — Sua conta digital completa' },
  { key: 'SEO-09', label: 'Open Graph description', description: 'Descrição usada em cartões de compartilhamento (Open Graph).', text: 'PIX, cartão, investimentos e crédito PJ — tudo em um só app.' },
  { key: 'SEO-10', label: 'Open Graph image', description: 'Imagem usada em cartões de compartilhamento (Open Graph).', text: 'seo-share-image.png (mock — 1200×630)' },
];

const { db, close } = createDbConnection(databaseUrl);
try {
  let order = 0;
  for (const [section, rows, mediaIds] of [
    ['home', HOME, HOME_MEDIA_IDS],
    ['login', LOGIN, LOGIN_MEDIA_IDS],
    ['theme', THEME, new Set()],
    ['seo', SEO, SEO_MEDIA_IDS],
  ] as const) {
    order = 0;
    for (const row of rows) {
      order += 1;
      const value: Record<string, unknown> = { text: row.text, description: row.description };
      if ('swatch' in row) value.swatch = row.swatch;
      const status = 'status' in row ? row.status : 'published';
      const [existing] = await db.select({ id: cmsSections.id }).from(cmsSections).where(and(eq(cmsSections.section, section), eq(cmsSections.key, row.key))).limit(1);
      if (existing) {
        await db.update(cmsSections).set({ label: row.label, value, status, order, updatedAt: new Date() }).where(eq(cmsSections.id, existing.id));
        console.log(`Atualizado: ${section}/${row.key} — ${row.label}`);
      } else {
        await db.insert(cmsSections).values({ section, key: row.key, label: row.label, value, status, order, active: true });
        console.log(`Criado: ${section}/${row.key} — ${row.label} ${mediaIds.has(row.key) ? '(com mídia)' : ''}`);
      }
    }
  }
} finally {
  await close();
}
