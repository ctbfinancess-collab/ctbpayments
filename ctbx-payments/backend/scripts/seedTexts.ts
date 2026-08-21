// Popula cms_items (collection='text') com o conteúdo mock atual de
// ADMIN_CMS_TEXTS. Idempotente via slug — mesma lógica dos outros seeds.
// "name" = a própria chave (ex.: 'home.welcome.title'), já que é o
// identificador natural deste tipo de conteúdo (estilo i18n).
import { eq } from 'drizzle-orm';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { cmsItems } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL antes de rodar este script.');

const TEXTS = [
  { slug: 'TXT-01', key: 'home.welcome.title', screen: 'Home', section: 'Saudação', text: 'Bem-vindo à CTBX Payments', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-02', key: 'home.welcome.subtitle', screen: 'Home', section: 'Saudação', text: 'Sua conta digital completa para pessoa física e jurídica', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-03', key: 'login.title', screen: 'Login', section: 'Cabeçalho', text: 'Acesse sua conta', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-04', key: 'login.subtitle', screen: 'Login', section: 'Cabeçalho', text: 'Entre com seu CPF/CNPJ e senha', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-05', key: 'campaign.superctb.title', screen: 'Home', section: 'Campanhas', text: 'Super CTBX chegou', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-06', key: 'campaign.superctb.subtitle', screen: 'Home', section: 'Campanhas', text: 'Cashback em compras selecionadas', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-07', key: 'services.pix.title', screen: 'Home', section: 'Serviços', text: 'PIX', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-08', key: 'services.pix.description', screen: 'Home', section: 'Serviços', text: 'Envie e receba PIX na hora', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-09', key: 'products.cdb2027.description', screen: 'Produtos', section: 'Investimentos', text: 'CDB com liquidez diária e 110% do CDI', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-10', key: 'login.footer.environment', screen: 'Login', section: 'Rodapé', text: 'Ambiente Sandbox — dados fictícios', language: 'pt-BR', status: 'published' },
  { slug: 'TXT-11', key: 'home.section.capitalgiro.visibility_note', screen: 'Home', section: 'Visibilidade', text: 'Seção oculta para clientes PF', language: 'pt-BR', status: 'draft' },
  { slug: 'TXT-12', key: 'referral.banner.title', screen: 'Home', section: 'Campanhas', text: 'Indique e ganhe R$ 50,00', language: 'pt-BR', status: 'published' },
];

const { db, close } = createDbConnection(databaseUrl);
try {
  for (const item of TEXTS) {
    const value = { screen: item.screen, section: item.section, text: item.text, language: item.language };
    const [existing] = await db.select({ id: cmsItems.id }).from(cmsItems).where(eq(cmsItems.slug, item.slug)).limit(1);
    if (existing) {
      await db.update(cmsItems).set({ name: item.key, status: item.status, value, updatedAt: new Date() }).where(eq(cmsItems.id, existing.id));
      console.log(`Atualizado: ${item.slug} — ${item.key}`);
    } else {
      await db.insert(cmsItems).values({ collection: 'text', slug: item.slug, name: item.key, status: item.status, value, active: true });
      console.log(`Criado: ${item.slug} — ${item.key}`);
    }
  }
} finally {
  await close();
}
