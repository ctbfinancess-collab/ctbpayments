// Popula cms_items (collection='banner') com o conteúdo mock atual de
// ADMIN_CMS_BANNERS, pra nada "sumir" quando o admin passar a ler do banco
// em vez do arquivo mock. Idempotente via slug (roda de novo sem duplicar
// — atualiza se o slug já existir). Não mexe em mídia/imagem (isso
// continua só em memória de sessão, como já era antes desta etapa).
import { eq } from 'drizzle-orm';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { cmsItems } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL antes de rodar este script.');

// Mesmo conteúdo hoje hardcoded em src/admin/data/adminMockData.js
// (ADMIN_CMS_BANNERS) — sem o campo de mídia, que fica fora desta etapa.
const BANNERS = [
  { slug: 'BNR-01', name: 'Super CTBX 2026', status: 'active', order: 1, value: { title: 'Super CTBX chegou', subtitle: 'Cashback em compras selecionadas', cta: 'Aproveitar agora', link: '/campanhas/super-ctbx', position: 'Home — topo', startDate: '01/08/2026', endDate: '31/08/2026', priority: 1 } },
  { slug: 'BNR-02', name: 'Investimentos — CDB 2027', status: 'active', order: 2, value: { title: 'CDB CTBX 2027', subtitle: 'Liquidez diária e rentabilidade 110% do CDI', cta: 'Investir agora', link: '/investimentos/cdb-2027', position: 'Home — seção Investimentos', startDate: '15/07/2026', endDate: '15/09/2026', priority: 2 } },
  { slug: 'BNR-03', name: 'Cartão virtual grátis', status: 'scheduled', order: 3, value: { title: 'Peça seu cartão virtual', subtitle: 'Emissão instantânea, sem anuidade', cta: 'Pedir cartão', link: '/cartoes/virtual', position: 'Home — seção Cartões', startDate: '01/09/2026', endDate: '30/09/2026', priority: 3 } },
  { slug: 'BNR-04', name: 'Antecipação Salarial', status: 'ended', order: 4, value: { title: 'Antecipe seu salário', subtitle: 'Direto na sua conta CTBX', cta: 'Simular', link: '/beneficios/antecipacao-salarial', position: 'Home — seção Serviços', startDate: '01/06/2026', endDate: '31/07/2026', priority: 4 } },
  { slug: 'BNR-05', name: 'Indique e ganhe', status: 'paused', order: 5, value: { title: 'Indique e ganhe R$ 50,00', subtitle: 'Por cada amigo que abrir conta', cta: 'Indicar agora', link: '/indicacao', position: 'Home — rodapé', startDate: '10/08/2026', endDate: '—', priority: 5 } },
  { slug: 'BNR-06', name: 'Capital de Giro PJ', status: 'draft', order: 6, value: { title: 'Capital de giro para o seu negócio', subtitle: 'Aprovação 100% digital', cta: 'Simular crédito', link: '/pj/capital-giro', position: 'Home — seção PJ', startDate: '—', endDate: '—', priority: 6 } },
];

const { db, close } = createDbConnection(databaseUrl);
try {
  for (const banner of BANNERS) {
    const [existing] = await db.select({ id: cmsItems.id }).from(cmsItems).where(eq(cmsItems.slug, banner.slug)).limit(1);
    if (existing) {
      await db.update(cmsItems).set({ name: banner.name, status: banner.status, order: banner.order, value: banner.value, updatedAt: new Date() }).where(eq(cmsItems.id, existing.id));
      console.log(`Atualizado: ${banner.slug} — ${banner.name}`);
    } else {
      await db.insert(cmsItems).values({ collection: 'banner', slug: banner.slug, name: banner.name, status: banner.status, order: banner.order, value: banner.value, active: true });
      console.log(`Criado: ${banner.slug} — ${banner.name}`);
    }
  }
} finally {
  await close();
}
