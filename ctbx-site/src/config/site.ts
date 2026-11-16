// Configuração central do site. Tudo que depende de decisão da empresa
// fica aqui, num lugar só.

export const site = {
  name: 'CTBX Payments',
  url: 'https://ctbxpayments.com',

  // Destino do botão "Abrir conta". O app ainda não está publicado na
  // web nem nas lojas. Enquanto for null, o botão leva à página de
  // Contato, que explica que a abertura estará disponível em breve. Quando o app for publicado, basta colocar a
  // URL aqui (ex.: 'https://app.ctbxpayments.com').
  appUrl: null as string | null,

  // Dados institucionais. NÃO INVENTAR: preencher só com dados oficiais
  // confirmados pela empresa. Enquanto forem null, o rodapé mostra
  // "a informar" (e o site não deve ir para produção assim).
  legal: {
    companyName: null as string | null, // razão social
    cnpj: null as string | null,
    address: null as string | null,
  },
  // Para onde o formulário de Contato envia as mensagens (POST em JSON).
  // /api/contact roda no servidor do próprio site e envia pelo Resend
  // (configurar RESEND_API_KEY, CONTACT_FROM_EMAIL e CONTACT_TO_EMAIL).
  contactFormEndpoint: '/api/contact' as string | null,

  // Políticas legais. Enquanto legalDraft for true, as páginas de
  // Privacidade, Termos e Cookies mostram o aviso "versão preliminar".
  // Só mude para false depois da revisão jurídica.
  legalDraft: true,
  legalUpdatedAt: '2026-11-16',
  // Encarregado de dados (DPO), exigido pela LGPD. NÃO INVENTAR.
  dpo: {
    name: null as string | null,
    email: null as string | null,
  },

  // Crédito de desenvolvimento no rodapé. Com url null, o nome aparece sem link.
  credit: {
    name: 'Supernova Films e Turismo',
    url: null as string | null,
  },

  contact: {
    email: null as string | null,
    phone: null as string | null,
  },
};

// Enquanto appUrl for null, "Abrir conta" leva à página de Contato.
export const openAccountHref = (lang: 'pt-br' | 'en') =>
  site.appUrl ?? (lang === 'en' ? '/en/contact/' : '/contato/');
