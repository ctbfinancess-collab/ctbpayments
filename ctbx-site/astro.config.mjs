// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  // Domínio oficial. Usado só para gerar URLs canônicas e hreflang;
  // nenhum DNS é alterado por este projeto.
  site: 'https://ctbxpayments.com',
  // Páginas estáticas; só /api/contact roda no servidor (prerender = false).
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  i18n: {
    defaultLocale: 'pt-br',
    locales: ['pt-br', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()] },
});
