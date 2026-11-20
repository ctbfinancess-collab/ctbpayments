// Empresas do grupo exibidas na página Quem Somos.
// Mesmos nomes, descrições, logos e links do site da CTB Venture
// (que segue o cadastro aprovado pela CTB Holdings, ctbholdings.uk).
// `website` ausente = site ainda não confirmado/online: aparece sem link.
import type { Lang } from '../i18n/ui';
import logoHoldings from '../assets/grupo/ctb-holdings-logo.png';
import logoVenture from '../assets/grupo/ctb-venture-logo.png';
import logoPayments from '../assets/grupo/ctbx-payments-logo.png';
import logoFinances from '../assets/grupo/ctb-finances-logo.png';
import logoWahibi from '../assets/grupo/fundacao-wahibi-logo.png';
import logoOman from '../assets/grupo/oman-brazil-logo.png';
import logoCamara from '../assets/grupo/camara-brasil-oma-selo.png';

type L = Record<Lang, string>;

export interface GroupEntity {
  name: string;
  logo: ImageMetadata;
  location: L;
  kind?: L;
  description: L;
  website?: string;
  /** Logo com fundo próprio (quadrada): exibida com cantos arredondados. */
  tile?: boolean;
  /** Altura da logo no cartão, em px (padrão 84). */
  logoHeight?: number;
  /** A própria CTBX Payments: sem link, com a etiqueta "Você está aqui". */
  isSelf?: boolean;
}

export const groupCompanies: GroupEntity[] = [
  {
    name: 'CTB Holdings',
    logo: logoHoldings,
    location: { 'pt-br': 'Londres, Reino Unido', en: 'London, United Kingdom' },
    description: {
      'pt-br': 'Holding internacional dedicada ao desenvolvimento de negócios, investimentos de longo prazo e conexões estratégicas entre mercados globais.',
      en: 'International holding company dedicated to business development, long-term investments and strategic connections between global markets.',
    },
    website: 'https://ctbholdings.uk',
  },
  {
    name: 'CTB Venture',
    logo: logoVenture,
    location: { 'pt-br': 'Brasil', en: 'Brazil' },
    description: {
      'pt-br': 'Atuação no desenvolvimento de oportunidades empresariais, estruturação de negócios e iniciativas de investimento.',
      en: 'Focused on developing business opportunities, structuring ventures and investment initiatives.',
    },
    website: 'https://ctbventure.com',
  },
  {
    name: 'CTBX Payments',
    logo: logoPayments,
    location: { 'pt-br': 'Brasil', en: 'Brazil' },
    description: {
      'pt-br': 'Empresa voltada à tecnologia financeira, infraestrutura e soluções de pagamentos, conforme suas atividades efetivamente autorizadas.',
      en: 'Company focused on financial technology, infrastructure and payment solutions, in accordance with its duly authorised activities.',
    },
    isSelf: true,
  },
  {
    name: 'CTB Finances',
    logo: logoFinances,
    location: { 'pt-br': 'Dubai, Emirados Árabes Unidos', en: 'Dubai, United Arab Emirates' },
    description: {
      'pt-br': 'Empresa sediada em Dubai, dedicada ao desenvolvimento de soluções e oportunidades no setor financeiro, observadas as autorizações regulatórias aplicáveis.',
      en: 'Dubai-based company dedicated to developing solutions and opportunities in the financial sector, in compliance with the applicable regulatory authorisations.',
    },
    website: 'https://ctbfinances.ae/',
  },
  {
    name: 'Oman Brazil',
    logo: logoOman,
    // Logo quase quadrada: altura maior para ficar do tamanho visual das outras.
    logoHeight: 120,
    location: { 'pt-br': 'Omã', en: 'Oman' },
    description: {
      'pt-br': 'Empresa sediada em Omã, voltada ao desenvolvimento de negócios e à conexão de oportunidades comerciais internacionais.',
      en: 'Oman-based company focused on business development and on connecting international trade opportunities.',
    },
    website: 'https://www.omanbrazil.com/',
  },
  {
    name: 'Fundação Wahibi',
    logo: logoWahibi,
    location: { 'pt-br': 'Brasil', en: 'Brazil' },
    kind: { 'pt-br': 'Fundação', en: 'Foundation' },
    description: {
      'pt-br': 'Organização dedicada à inovação, ao desenvolvimento e a iniciativas de impacto social.',
      en: 'Organisation dedicated to innovation, development and social impact initiatives.',
    },
    website: 'https://fundacaowahibi.org/',
  },
];

/** Relação institucional — não é empresa do grupo. */
export const institutionalPartner: GroupEntity = {
  name: 'Câmara de Comércio Brasil–Omã',
  logo: logoCamara,
  location: { 'pt-br': 'Brasil · Omã', en: 'Brazil · Oman' },
  description: {
    'pt-br': 'Instituição dedicada a fortalecer os laços comerciais, culturais e institucionais entre o Brasil e o Sultanato de Omã.',
    en: 'An institution dedicated to strengthening trade, cultural and institutional ties between Brazil and the Sultanate of Oman.',
  },
  website: 'https://www.brasilomanchamber.org/',
};
