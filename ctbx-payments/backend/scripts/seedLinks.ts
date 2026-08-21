// Popula cms_items (collection='link') com o conteúdo mock atual de
// ADMIN_CMS_LINKS. Idempotente via slug — mesma lógica dos outros seeds.
// "name" = o texto do botão (label), igual ao padrão de banner/serviço/produto.
import { eq } from 'drizzle-orm';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { cmsItems } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL antes de rodar este script.');

const LINKS = [
  { slug: 'LNK-01', label: 'Entrar', action: 'submit_login', destination: '/home', screen: 'Login', position: 'Botão principal', status: 'active', openMode: 'Interna' },
  { slug: 'LNK-02', label: 'Abra sua conta', action: 'navigate', destination: '/onboarding', screen: 'Login', position: 'Rodapé', status: 'active', openMode: 'Interna' },
  { slug: 'LNK-03', label: 'Assista agora', action: 'navigate', destination: '/onboarding/video', screen: 'Home', position: 'Card de boas-vindas', status: 'active', openMode: 'Interna' },
  { slug: 'LNK-04', label: 'Ver detalhes', action: 'navigate', destination: '/investimentos/cdb-2027', screen: 'Produtos', position: 'Card de produto', status: 'active', openMode: 'Interna' },
  { slug: 'LNK-05', label: 'Saiba mais', action: 'navigate', destination: '/beneficios/antecipacao-salarial', screen: 'Home', position: 'Card de serviço', status: 'active', openMode: 'Interna' },
  { slug: 'LNK-06', label: 'Simular agora', action: 'navigate', destination: '/pj/capital-giro/simulacao', screen: 'Home', position: 'Banner PJ', status: 'inactive', openMode: 'Interna' },
  { slug: 'LNK-07', label: 'Baixar app', action: 'external_link', destination: 'https://ctbxpayments.com/app (mock)', screen: 'Institucional', position: 'Rodapé', status: 'active', openMode: 'Externa' },
  { slug: 'LNK-08', label: 'Falar com atendimento', action: 'external_link', destination: 'https://ajuda.ctbxpayments.com (mock)', screen: 'Ajuda', position: 'Menu secundário', status: 'active', openMode: 'Externa' },
];

const { db, close } = createDbConnection(databaseUrl);
try {
  for (const item of LINKS) {
    const value = { action: item.action, destination: item.destination, screen: item.screen, position: item.position, openMode: item.openMode };
    const [existing] = await db.select({ id: cmsItems.id }).from(cmsItems).where(eq(cmsItems.slug, item.slug)).limit(1);
    if (existing) {
      await db.update(cmsItems).set({ name: item.label, status: item.status, value, updatedAt: new Date() }).where(eq(cmsItems.id, existing.id));
      console.log(`Atualizado: ${item.slug} — ${item.label}`);
    } else {
      await db.insert(cmsItems).values({ collection: 'link', slug: item.slug, name: item.label, status: item.status, value, active: true });
      console.log(`Criado: ${item.slug} — ${item.label}`);
    }
  }
} finally {
  await close();
}
