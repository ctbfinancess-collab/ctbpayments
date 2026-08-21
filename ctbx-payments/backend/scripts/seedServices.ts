// Popula cms_items (collection='service') com o conteúdo mock atual de
// ADMIN_CMS_SERVICES. Idempotente via slug — mesma lógica de
// seedBanners.ts. Não mexe em mídia (fica só em sessão, como banners
// também ficavam antes da etapa de persistência de mídia).
import { eq } from 'drizzle-orm';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { cmsItems } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL antes de rodar este script.');

// Mesmo conteúdo hoje hardcoded em src/admin/data/adminMockData.js
// (ADMIN_CMS_SERVICES).
const SERVICES = [
  { slug: 'SVC-01', name: 'PIX', order: 1, value: { icon: 'flash-outline', description: 'Envie e receba PIX na hora', link: '/pix', category: 'Pagamentos', order: 1, visible: true } },
  { slug: 'SVC-02', name: 'Transferências', order: 2, value: { icon: 'swap-horizontal-outline', description: 'TED e transferências entre contas', link: '/transferencias', category: 'Pagamentos', order: 2, visible: true } },
  { slug: 'SVC-03', name: 'Pagamentos', order: 3, value: { icon: 'document-text-outline', description: 'Boletos, contas e convênios', link: '/pagamentos', category: 'Pagamentos', order: 3, visible: true } },
  { slug: 'SVC-04', name: 'Investimentos', order: 4, value: { icon: 'trending-up-outline', description: 'CDB, fundos e mais', link: '/investimentos', category: 'Investimentos', order: 4, visible: true } },
  { slug: 'SVC-05', name: 'Cartões', order: 5, value: { icon: 'card-outline', description: 'Cartão físico e virtual', link: '/cartoes', category: 'Cartões', order: 5, visible: true } },
  { slug: 'SVC-06', name: 'Benefícios', order: 6, value: { icon: 'gift-outline', description: 'Vale-refeição e benefícios corporativos', link: '/beneficios', category: 'Benefícios', order: 6, visible: true } },
  { slug: 'SVC-07', name: 'Antecipação Salarial', order: 7, value: { icon: 'cash-outline', description: 'Antecipe parte do seu salário', link: '/beneficios/antecipacao-salarial', category: 'Benefícios', order: 7, visible: true } },
  { slug: 'SVC-08', name: 'Capital de Giro', order: 8, value: { icon: 'briefcase-outline', description: 'Crédito para capital de giro PJ', link: '/pj/capital-giro', category: 'PJ', order: 8, visible: false } },
  { slug: 'SVC-09', name: 'Antecipação de Recebíveis', order: 9, value: { icon: 'trending-up-outline', description: 'Antecipe recebíveis de vendas', link: '/pj/antecipacao-recebiveis', category: 'PJ', order: 9, visible: true } },
  { slug: 'SVC-10', name: 'POS', order: 10, value: { icon: 'card-outline', description: 'Maquininha CTBX para vendas', link: '/pj/pos', category: 'PJ', order: 10, visible: true } },
];

const { db, close } = createDbConnection(databaseUrl);
try {
  for (const service of SERVICES) {
    const [existing] = await db.select({ id: cmsItems.id }).from(cmsItems).where(eq(cmsItems.slug, service.slug)).limit(1);
    if (existing) {
      await db.update(cmsItems).set({ name: service.name, order: service.order, value: service.value, updatedAt: new Date() }).where(eq(cmsItems.id, existing.id));
      console.log(`Atualizado: ${service.slug} — ${service.name}`);
    } else {
      await db.insert(cmsItems).values({ collection: 'service', slug: service.slug, name: service.name, order: service.order, value: service.value, status: 'active', active: true });
      console.log(`Criado: ${service.slug} — ${service.name}`);
    }
  }
} finally {
  await close();
}
