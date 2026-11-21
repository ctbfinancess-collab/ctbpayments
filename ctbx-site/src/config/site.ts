// Configuração central do site. Tudo que depende de decisão da empresa
// fica aqui, num lugar só.

export const site = {
  name: 'CTBX Payments',
  url: 'https://www.ctbxpayments.com',

  // Área do Cliente (web). "Abrir conta" leva ao cadastro e "Entrar" ao
  // login. Com null, "Abrir conta" volta a levar à página de Contato e o
  // link "Entrar" some do cabeçalho.
  appUrl: 'https://app.ctbxpayments.com' as string | null,

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
// A Área do Cliente é só em português, para os dois idiomas do site.
export const openAccountHref = (lang: 'pt-br' | 'en') =>
  site.appUrl ? `${site.appUrl}/abrir-conta` : lang === 'en' ? '/en/contact/' : '/contato/';
export const signInHref = site.appUrl ? `${site.appUrl}/entrar` : null;
