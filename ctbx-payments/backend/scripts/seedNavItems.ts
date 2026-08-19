// Popula cms_items (collection='nav_item') com o conteúdo mock atual de
// ADMIN_CMS_NAV_GROUPS. Diferente dos outros tipos, navegação é organizada
// em 4 grupos — em vez de uma tabela nova, guardamos o grupo como mais um
// campo dentro de "value" (group) e agrupamos no frontend. "order" (coluna
// própria, não dentro de value) é usado pra ordenar dentro de cada grupo.
// Idempotente via slug — mesma lógica dos outros seeds.
import { eq } from 'drizzle-orm';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { cmsItems } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL antes de rodar este script.');

const NAV_ITEMS = [
  { slug: 'NAV-01', group: 'bottom_menu', item: 'Início', icon: 'home-outline', route: '/home', order: 1, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-02', group: 'bottom_menu', item: 'PIX', icon: 'flash-outline', route: '/pix', order: 2, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-03', group: 'bottom_menu', item: 'Cartões', icon: 'card-outline', route: '/cartoes', order: 3, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-04', group: 'bottom_menu', item: 'Investimentos', icon: 'trending-up-outline', route: '/investimentos', order: 4, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-05', group: 'bottom_menu', item: 'Perfil', icon: 'person-outline', route: '/perfil', order: 5, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-06', group: 'home_shortcuts', item: 'Transferir', icon: 'swap-horizontal-outline', route: '/transferencias', order: 1, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-07', group: 'home_shortcuts', item: 'Pagar boleto', icon: 'document-text-outline', route: '/pagamentos/boleto', order: 2, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-08', group: 'home_shortcuts', item: 'Investir', icon: 'trending-up-outline', route: '/investimentos', order: 3, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-09', group: 'home_shortcuts', item: 'Meu cartão', icon: 'card-outline', route: '/cartoes', order: 4, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-10', group: 'secondary_menus', item: 'Extrato', icon: 'reader-outline', route: '/contas/extrato', order: 1, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-11', group: 'secondary_menus', item: 'Limites', icon: 'speedometer-outline', route: '/perfil/limites', order: 2, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-12', group: 'secondary_menus', item: 'Ajuda', icon: 'help-circle-outline', route: '/ajuda', order: 3, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-13', group: 'secondary_menus', item: 'Configurações da conta', icon: 'settings-outline', route: '/perfil/configuracoes', order: 4, visible: true, audience: 'PF e PJ' },
  { slug: 'NAV-14', group: 'institutional_links', item: 'Sobre a CTBX', icon: 'information-circle-outline', route: '/institucional/sobre', order: 1, visible: true, audience: 'Público' },
  { slug: 'NAV-15', group: 'institutional_links', item: 'Termos de uso', icon: 'document-text-outline', route: '/institucional/termos', order: 2, visible: true, audience: 'Público' },
  { slug: 'NAV-16', group: 'institutional_links', item: 'Política de privacidade', icon: 'shield-checkmark-outline', route: '/institucional/privacidade', order: 3, visible: true, audience: 'Público' },
  { slug: 'NAV-17', group: 'institutional_links', item: 'Central de ajuda', icon: 'help-circle-outline', route: '/institucional/ajuda', order: 4, visible: true, audience: 'Público' },
];

const { db, close } = createDbConnection(databaseUrl);
try {
  for (const item of NAV_ITEMS) {
    const value = { group: item.group, icon: item.icon, route: item.route, visible: item.visible, audience: item.audience };
    const [existing] = await db.select({ id: cmsItems.id }).from(cmsItems).where(eq(cmsItems.slug, item.slug)).limit(1);
    if (existing) {
      await db.update(cmsItems).set({ name: item.item, order: item.order, value, updatedAt: new Date() }).where(eq(cmsItems.id, existing.id));
      console.log(`Atualizado: ${item.slug} — ${item.item}`);
    } else {
      await db.insert(cmsItems).values({ collection: 'nav_item', slug: item.slug, name: item.item, order: item.order, status: 'active', value, active: true });
      console.log(`Criado: ${item.slug} — ${item.item}`);
    }
  }
} finally {
  await close();
}
