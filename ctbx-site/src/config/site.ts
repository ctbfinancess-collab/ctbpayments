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
    companyName: 'CTBX Payments Representações Ltda' as string | null, // razão social (informada pela empresa em 2026-11-19)
    cnpj: '39.575.846/0001-95' as string | null,
    // Endereço da sede conforme o carnê de IPTU 2024 enviado pela empresa.
    address: 'Rua Dr. Orlando Feirabend Filho, 230, Torre A, Sala 506 – Parque Residencial Aquarius, São José dos Campos – SP, CEP 12246-190' as string | null,
  },
  // Para onde o formulário de Contato envia as mensagens (POST em JSON).
  // /api/contact roda no servidor do próprio site e envia pelo Resend
  // (configurar RESEND_API_KEY, CONTACT_FROM_EMAIL e CONTACT_TO_EMAIL).
  contactFormEndpoint: '/api/contact' as string | null,

  // Políticas legais. Enquanto legalDraft for true, as páginas de
  // Privacidade, Termos e Cookies mostram o aviso "versão preliminar".
  // Só mude para false depois da revisão jurídica.
  legalDraft: false,
  legalUpdatedAt: '2026-11-21',
  // Encarregado de dados (DPO), exigido pela LGPD. NÃO INVENTAR.
  dpo: {
    // Encarregado de dados (LGPD): Caio Batista, informado pela empresa em 2026-11-21 (antes: o presidente). Contato: e-mail do jurídico (juridico@), definido em 2026-11-21.
    name: 'Caio Batista' as string | null,
    email: 'juridico@ctbxpayments.com' as string | null,
  },

  // Crédito de desenvolvimento no rodapé. Com url null, o nome aparece sem link.
  credit: {
    name: 'Supernova Films e Turismo',
    url: null as string | null,
  },

  contact: {
    email: 'contato@ctbxpayments.com' as string | null,
    phone: null as string | null,
  },
};

// Enquanto appUrl for null, "Abrir conta" leva à página de Contato.
export const openAccountHref = (lang: 'pt-br' | 'en') =>
  site.appUrl ?? (lang === 'en' ? '/en/contact/' : '/contato/');
