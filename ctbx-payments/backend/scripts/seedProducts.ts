// Popula cms_items (collection='product') com o conteúdo mock atual de
// ADMIN_CMS_PRODUCTS. Idempotente via slug — mesma lógica de
// seedBanners.ts/seedServices.ts. Não mexe em mídia.
import { eq } from 'drizzle-orm';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { cmsItems } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL antes de rodar este script.');

// Mesmo conteúdo hoje hardcoded em src/admin/data/adminMockData.js
// (ADMIN_CMS_PRODUCTS) — sem o campo de mídia, fora do escopo desta etapa.
const PRODUCTS = [
  { slug: 'PRD-01', name: 'CDB CTBX 2027', status: 'published', order: 1, value: { category: 'Investimentos', description: 'CDB com liquidez diária e 110% do CDI', cta: 'Investir agora', link: '/investimentos/cdb-2027', audience: 'PF e PJ', publishedAt: '15/07/2026', featured: true } },
  { slug: 'PRD-02', name: 'Fundo Multimercado CTBX', status: 'published', order: 2, value: { category: 'Investimentos', description: 'Fundo com gestão ativa e resgate D+1', cta: 'Conhecer fundo', link: '/investimentos/fundo-multimercado', audience: 'PF e PJ', publishedAt: '01/03/2026', featured: false } },
  { slug: 'PRD-03', name: 'Cartão Black CTBX', status: 'published', order: 3, value: { category: 'Cartões', description: 'Cartão premium com cashback e sala VIP', cta: 'Solicitar cartão', link: '/cartoes/black', audience: 'PF', publishedAt: '10/06/2026', featured: true } },
  { slug: 'PRD-04', name: 'Conta PJ Premium', status: 'draft', order: 4, value: { category: 'Contas', description: 'Conta PJ com tarifas reduzidas e gerente dedicado', cta: 'Saiba mais', link: '/pj/conta-premium', audience: 'PJ', publishedAt: '—', featured: false } },
  { slug: 'PRD-05', name: 'Capital de Giro Expresso', status: 'published', order: 5, value: { category: 'Crédito PJ', description: 'Crédito aprovado em até 24h', cta: 'Simular crédito', link: '/pj/capital-giro', audience: 'PJ', publishedAt: '01/06/2026', featured: false } },
  { slug: 'PRD-06', name: 'Antecipação Salarial Plus', status: 'archived', order: 6, value: { category: 'Benefícios', description: 'Limite maior de antecipação para clientes elegíveis', cta: 'Saiba mais', link: '/beneficios/antecipacao-plus', audience: 'PF', publishedAt: '10/03/2026', featured: false } },
];

const { db, close } = createDbConnection(databaseUrl);
try {
  for (const product of PRODUCTS) {
    const [existing] = await db.select({ id: cmsItems.id }).from(cmsItems).where(eq(cmsItems.slug, product.slug)).limit(1);
    if (existing) {
      await db.update(cmsItems).set({ name: product.name, status: product.status, order: product.order, value: product.value, updatedAt: new Date() }).where(eq(cmsItems.id, existing.id));
      console.log(`Atualizado: ${product.slug} — ${product.name}`);
    } else {
      await db.insert(cmsItems).values({ collection: 'product', slug: product.slug, name: product.name, status: product.status, order: product.order, value: product.value, active: true });
      console.log(`Criado: ${product.slug} — ${product.name}`);
    }
  }
} finally {
  await close();
}
