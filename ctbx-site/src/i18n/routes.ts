// Mapa de rotas do site nos dois idiomas. O seletor PT/EN usa este mapa
// para levar o visitante à MESMA página no outro idioma.
import type { Lang } from './ui';

export const routes = {
  home: { 'pt-br': '/', en: '/en/' },
  account: { 'pt-br': '/conta-digital/', en: '/en/digital-account/' },
  business: { 'pt-br': '/empresas/', en: '/en/business/' },
  solutions: { 'pt-br': '/solucoes/', en: '/en/solutions/' },
  security: { 'pt-br': '/seguranca/', en: '/en/security/' },
  about: { 'pt-br': '/quem-somos/', en: '/en/about/' },
  contact: { 'pt-br': '/contato/', en: '/en/contact/' },
  privacy: { 'pt-br': '/privacidade/', en: '/en/privacy/' },
  terms: { 'pt-br': '/termos-de-uso/', en: '/en/terms/' },
  cookies: { 'pt-br': '/cookies/', en: '/en/cookies/' },
} as const;

export type RouteKey = keyof typeof routes;

export const href = (lang: Lang, key: RouteKey) => routes[key][lang];

// Ordem do menu principal.
export const navOrder: RouteKey[] = ['account', 'business', 'solutions', 'security', 'about', 'contact'];

// Páginas legais (rodapé).
export const legalOrder: RouteKey[] = ['privacy', 'terms', 'cookies'];
