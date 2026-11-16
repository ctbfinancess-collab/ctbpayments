// Textos das políticas legais (Privacidade, Termos de Uso, Cookies).
//
// IMPORTANTE: versão preliminar redigida a partir do que o site e o app
// fazem hoje (dados realmente coletados, fornecedores realmente usados).
// Deve ser revisada por assessoria jurídica antes da publicação.
// Dados da empresa vêm de src/config/site.ts — nada é inventado aqui.
import { site } from '../config/site';
import type { Lang } from '../i18n/ui';

export type Block = string | { list: string[] };
export interface Section { title: string; body: Block[] }
export interface LegalDoc { title: string; intro: string; sections: Section[] }

export function legalDocs(lang: Lang) {
  const pending = lang === 'en' ? '[to be announced]' : '[a informar]';
  const company = site.legal.companyName ?? `CTBX Payments ${pending}`;
  const cnpj = site.legal.cnpj ?? pending;
  const address = site.legal.address ?? pending;
  const dpo = site.dpo.name ?? pending;
  const dpoEmail = site.dpo.email ?? site.contact.email ?? pending;
  return lang === 'en' ? en({ company, cnpj, address, dpo, dpoEmail }) : pt({ company, cnpj, address, dpo, dpoEmail });
}

type Ctx = { company: string; cnpj: string; address: string; dpo: string; dpoEmail: string };

const pt = ({ company, cnpj, address, dpo, dpoEmail }: Ctx): Record<'privacy' | 'terms' | 'cookies', LegalDoc> => ({
  privacy: {
    title: 'Política de Privacidade',
    intro: `Esta política explica como a ${company}, inscrita no CNPJ ${cnpj}, com sede em ${address}, trata os dados pessoais de quem visita este site e de quem se cadastra no aplicativo CTBX Payments, de acordo com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).`,
    sections: [
      {
        title: 'Quem é o controlador dos dados',
        body: [`O controlador é a ${company} (CNPJ ${cnpj}). O encarregado pelo tratamento de dados pessoais (DPO) é ${dpo}, que pode ser contatado pelo e-mail ${dpoEmail}.`],
      },
      {
        title: 'Quais dados coletamos',
        body: [
          'Coletamos apenas os dados necessários para cada finalidade:',
          { list: [
            'Formulário de contato do site: nome, e-mail, telefone (opcional), assunto e o conteúdo da mensagem.',
            'Cadastro no aplicativo: nome completo, CPF, e-mail, celular e senha. A senha é guardada apenas em forma de hash criptográfico; ninguém na CTBX Payments tem acesso à senha em texto aberto.',
            'Verificação de identidade (KYC): data de nascimento, nome completo da mãe e nacionalidade. Novas etapas de verificação poderão solicitar outros dados, sempre informados no momento da coleta.',
            'Dados técnicos de acesso: registros de acesso à aplicação (como data, hora e endereço IP), mantidos para segurança e cumprimento do Marco Civil da Internet (Lei nº 12.965/2014).',
          ] },
          'Não coletamos dados sensíveis (como origem racial, convicção religiosa ou dados de saúde) e não usamos dados biométricos.',
        ],
      },
      {
        title: 'Para que usamos os dados e com qual base legal',
        body: [{ list: [
          'Responder mensagens enviadas pelo formulário de contato — com base no seu consentimento, informado no próprio formulário.',
          'Criar e manter sua conta, confirmar seu e-mail e permitir o acesso ao aplicativo — para a execução de contrato e de procedimentos preliminares a pedido do titular.',
          'Verificar sua identidade e prevenir fraudes e lavagem de dinheiro — para cumprimento de obrigação legal e regulatória e para a proteção do crédito.',
          'Proteger a segurança do site e do aplicativo e registrar acessos — com base em obrigação legal e no legítimo interesse da CTBX Payments.',
        ] }],
      },
      {
        title: 'Com quem compartilhamos',
        body: [
          'Não vendemos dados pessoais. Compartilhamos dados apenas com fornecedores que nos ajudam a operar o serviço, sob contrato e somente para essas finalidades:',
          { list: [
            'Provedor de hospedagem e banco de dados, onde o site, o aplicativo e os dados de cadastro são armazenados.',
            'Provedor de envio de e-mails transacionais, usado para enviar links de confirmação de e-mail e de redefinição de senha.',
            'Autoridades públicas, quando houver obrigação legal ou ordem judicial.',
          ] },
          'Alguns desses fornecedores podem tratar dados fora do Brasil. Nesses casos, a transferência segue as hipóteses permitidas pela LGPD e as garantias contratuais adequadas.',
        ],
      },
      {
        title: 'Por quanto tempo guardamos',
        body: ['Guardamos os dados pelo tempo necessário para cada finalidade. Mensagens do formulário de contato são mantidas enquanto forem necessárias para o atendimento. Dados de cadastro e de verificação de identidade são mantidos enquanto a conta estiver ativa e, depois do encerramento, pelo prazo exigido pela legislação aplicável, inclusive as normas de prevenção à lavagem de dinheiro. Registros de acesso são mantidos pelo prazo do Marco Civil da Internet.'],
      },
      {
        title: 'Como protegemos seus dados',
        body: [{ list: [
          'Senhas guardadas somente como hash criptográfico.',
          'Comunicação entre o aplicativo e os servidores por conexão criptografada.',
          'Sessão de acesso guardada no armazenamento seguro do próprio celular.',
          'Links de confirmação de e-mail com prazo de validade e uso único.',
          'Acesso interno aos dados restrito às pessoas que precisam dele para trabalhar.',
        ] }],
      },
      {
        title: 'Seus direitos',
        body: [
          'Pela LGPD (art. 18), você pode, a qualquer momento:',
          { list: [
            'confirmar se tratamos seus dados e acessá-los;',
            'corrigir dados incompletos, inexatos ou desatualizados;',
            'pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;',
            'pedir a portabilidade dos dados a outro fornecedor;',
            'pedir a eliminação dos dados tratados com base no consentimento, e revogar esse consentimento;',
            'saber com quem compartilhamos seus dados;',
            'ser informado sobre a possibilidade de não fornecer consentimento e suas consequências.',
          ] },
          `Para exercer esses direitos, escreva para ${dpoEmail}. Alguns dados podem precisar ser mantidos mesmo após o pedido, quando a lei exigir. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).`,
        ],
      },
      {
        title: 'Crianças e adolescentes',
        body: ['O site e o aplicativo não são destinados a menores de 18 anos, e não coletamos intencionalmente dados de crianças ou adolescentes.'],
      },
      {
        title: 'Alterações desta política',
        body: ['Podemos atualizar esta política para refletir mudanças no serviço ou na legislação. A data da última atualização aparece no topo da página. Mudanças relevantes serão comunicadas pelos canais da CTBX Payments.'],
      },
    ],
  },

  terms: {
    title: 'Termos de Uso',
    intro: `Estes termos regulam o uso do site institucional da CTBX Payments, mantido pela ${company} (CNPJ ${cnpj}). Ao navegar pelo site, você concorda com estes termos.`,
    sections: [
      {
        title: 'Sobre o site',
        body: ['Este site é institucional e informativo. Ele apresenta a CTBX Payments e os serviços que estão disponíveis ou em preparação. A abertura e o uso da conta digital acontecem pelo aplicativo CTBX Payments, que tem termos próprios, apresentados no momento do cadastro.'],
      },
      {
        title: 'Serviços marcados como "Em breve"',
        body: ['Serviços identificados como "Em breve" ainda não estão disponíveis para contratação. As descrições desses serviços não constituem oferta, proposta comercial ou promessa de lançamento em data específica, e suas características podem mudar até a disponibilização.'],
      },
      {
        title: 'Sem recomendação financeira',
        body: ['O conteúdo do site não é recomendação de investimento, consultoria financeira, jurídica ou tributária. Antes de tomar decisões financeiras, procure orientação adequada.'],
      },
      {
        title: 'Uso adequado',
        body: [
          'Ao usar o site, você se compromete a não:',
          { list: [
            'tentar acessar áreas restritas, sistemas ou dados de terceiros;',
            'enviar pelo formulário de contato conteúdo ilegal, ofensivo ou que viole direitos de terceiros;',
            'usar robôs ou meios automatizados para sobrecarregar o site ou coletar seu conteúdo;',
            'se passar por outra pessoa ou pela CTBX Payments.',
          ] },
        ],
      },
      {
        title: 'Propriedade intelectual',
        body: ['A marca CTBX Payments, o logotipo, os textos, as imagens e o layout deste site pertencem à CTBX Payments ou são usados com autorização. Não é permitido copiar, reproduzir ou usar esse conteúdo para fins comerciais sem autorização prévia por escrito.'],
      },
      {
        title: 'Links para outros sites',
        body: ['O site pode conter links para sites de terceiros. A CTBX Payments não controla e não se responsabiliza pelo conteúdo ou pelas práticas de privacidade desses sites.'],
      },
      {
        title: 'Disponibilidade e responsabilidade',
        body: ['Trabalhamos para manter o site disponível e com informações corretas, mas ele pode passar por interrupções para manutenção ou por fatores fora do nosso controle. Na extensão permitida pela lei, a CTBX Payments não se responsabiliza por danos decorrentes de indisponibilidade temporária do site.'],
      },
      {
        title: 'Privacidade',
        body: ['O tratamento de dados pessoais feito por meio do site segue a Política de Privacidade da CTBX Payments.'],
      },
      {
        title: 'Alterações e legislação aplicável',
        body: ['Estes termos podem ser atualizados a qualquer momento; a data da última atualização aparece no topo da página. Estes termos são regidos pelas leis brasileiras. Fica eleito o foro do domicílio do usuário, conforme o Código de Defesa do Consumidor.'],
      },
    ],
  },

  cookies: {
    title: 'Política de Cookies',
    intro: 'Cookies são pequenos arquivos que um site pode guardar no seu navegador. Esta política explica como o site institucional da CTBX Payments usa cookies e tecnologias parecidas.',
    sections: [
      {
        title: 'O site não usa cookies de rastreamento',
        body: ['Hoje, este site não grava cookies de publicidade, de rastreamento nem de análise de audiência. Não usamos ferramentas que acompanham sua navegação em outros sites.'],
      },
      {
        title: 'Serviços de terceiros carregados pelo site',
        body: ['Para exibir as fontes tipográficas, o site carrega arquivos do serviço Google Fonts. Ao fazer isso, o seu navegador se conecta aos servidores do Google, que recebem dados técnicos como o endereço IP. Esse tratamento segue a política de privacidade do Google.'],
      },
      {
        title: 'Aplicativo CTBX Payments',
        body: ['No aplicativo, o seu acesso fica guardado no armazenamento seguro do próprio celular, e não em cookies de rastreamento. Ele é usado apenas para manter você conectado com segurança.'],
      },
      {
        title: 'Como controlar cookies',
        body: ['Você pode apagar ou bloquear cookies nas configurações do seu navegador a qualquer momento. Como o site não depende de cookies próprios, ele continua funcionando normalmente.'],
      },
      {
        title: 'Mudanças nesta política',
        body: ['Se no futuro passarmos a usar cookies de análise ou de outro tipo, esta política será atualizada antes disso, e pediremos o seu consentimento quando a lei exigir.'],
      },
    ],
  },
});

const en = ({ company, cnpj, address, dpo, dpoEmail }: Ctx): Record<'privacy' | 'terms' | 'cookies', LegalDoc> => ({
  privacy: {
    title: 'Privacy Policy',
    intro: `This policy explains how ${company}, registered under CNPJ ${cnpj}, headquartered at ${address}, processes the personal data of visitors to this website and of people who sign up for the CTBX Payments app, in accordance with Brazil’s General Data Protection Law (Law No. 13,709/2018 — LGPD).`,
    sections: [
      { title: 'Who is the data controller', body: [`The controller is ${company} (CNPJ ${cnpj}). The data protection officer (DPO) is ${dpo}, who can be reached at ${dpoEmail}.`] },
      {
        title: 'What data we collect',
        body: [
          'We only collect the data needed for each purpose:',
          { list: [
            'Website contact form: name, email, phone (optional), subject and message content.',
            'App sign-up: full name, CPF (Brazilian taxpayer ID), email, mobile number and password. The password is stored only as a cryptographic hash; no one at CTBX Payments can see it in plain text.',
            'Identity verification (KYC): date of birth, mother’s full name and nationality. Further verification steps may request other data, always disclosed at the time of collection.',
            'Technical access data: application access logs (such as date, time and IP address), kept for security and to comply with Brazil’s Internet Civil Framework (Law No. 12,965/2014).',
          ] },
          'We do not collect sensitive data (such as racial origin, religious beliefs or health data) and we do not use biometric data.',
        ],
      },
      {
        title: 'How we use data and on what legal basis',
        body: [{ list: [
          'Replying to messages sent through the contact form — based on your consent, given in the form itself.',
          'Creating and maintaining your account, confirming your email and allowing access to the app — to perform a contract and pre-contractual steps at your request.',
          'Verifying your identity and preventing fraud and money laundering — to comply with legal and regulatory obligations and for credit protection.',
          'Protecting the security of the website and the app and logging access — based on legal obligation and CTBX Payments’ legitimate interest.',
        ] }],
      },
      {
        title: 'Who we share data with',
        body: [
          'We do not sell personal data. We only share data with providers that help us operate the service, under contract and only for these purposes:',
          { list: [
            'Hosting and database provider, where the website, the app and sign-up data are stored.',
            'Transactional email provider, used to send email confirmation and password reset links.',
            'Public authorities, when required by law or court order.',
          ] },
          'Some of these providers may process data outside Brazil. In such cases, the transfer follows the cases permitted by the LGPD and appropriate contractual safeguards.',
        ],
      },
      { title: 'How long we keep data', body: ['We keep data for as long as each purpose requires. Contact form messages are kept while needed to handle your request. Sign-up and identity verification data are kept while the account is active and, after it is closed, for the period required by applicable law, including anti-money-laundering rules. Access logs are kept for the period set by the Internet Civil Framework.'] },
      {
        title: 'How we protect your data',
        body: [{ list: [
          'Passwords stored only as cryptographic hashes.',
          'Encrypted connections between the app and our servers.',
          'Login session kept in the phone’s secure storage.',
          'Email confirmation links that expire and can only be used once.',
          'Internal access to data restricted to people who need it for their work.',
        ] }],
      },
      {
        title: 'Your rights',
        body: [
          'Under the LGPD (art. 18), you may at any time:',
          { list: [
            'confirm whether we process your data and access it;',
            'correct incomplete, inaccurate or outdated data;',
            'request anonymization, blocking or deletion of unnecessary data or data processed unlawfully;',
            'request portability of your data to another provider;',
            'request deletion of data processed based on consent, and withdraw that consent;',
            'know who we share your data with;',
            'be informed about the possibility of not giving consent and its consequences.',
          ] },
          `To exercise these rights, write to ${dpoEmail}. Some data may need to be kept even after your request when required by law. You may also file a complaint with Brazil’s National Data Protection Authority (ANPD).`,
        ],
      },
      { title: 'Children and teenagers', body: ['The website and the app are not intended for people under 18, and we do not knowingly collect data from children or teenagers.'] },
      { title: 'Changes to this policy', body: ['We may update this policy to reflect changes in the service or in the law. The date of the latest update is shown at the top of the page. Significant changes will be announced through CTBX Payments’ channels.'] },
    ],
  },

  terms: {
    title: 'Terms of Use',
    intro: `These terms govern the use of the CTBX Payments corporate website, operated by ${company} (CNPJ ${cnpj}). By browsing the website, you agree to these terms.`,
    sections: [
      { title: 'About the website', body: ['This is an informational corporate website. It presents CTBX Payments and the services that are available or in preparation. Opening and using the digital account takes place in the CTBX Payments app, which has its own terms, presented at sign-up.'] },
      { title: 'Services marked "Coming soon"', body: ['Services labeled "Coming soon" are not yet available. Their descriptions are not an offer, a commercial proposal or a promise of launch on any specific date, and their features may change before they become available.'] },
      { title: 'No financial advice', body: ['The content of this website is not investment advice or financial, legal or tax advice. Seek appropriate guidance before making financial decisions.'] },
      {
        title: 'Acceptable use',
        body: [
          'When using the website, you agree not to:',
          { list: [
            'try to access restricted areas, systems or third-party data;',
            'send illegal or offensive content, or content that infringes third-party rights, through the contact form;',
            'use bots or automated means to overload the website or scrape its content;',
            'impersonate another person or CTBX Payments.',
          ] },
        ],
      },
      { title: 'Intellectual property', body: ['The CTBX Payments brand, logo, texts, images and layout of this website belong to CTBX Payments or are used with permission. Copying, reproducing or using this content for commercial purposes without prior written permission is not allowed.'] },
      { title: 'Links to other websites', body: ['The website may contain links to third-party websites. CTBX Payments does not control and is not responsible for their content or privacy practices.'] },
      { title: 'Availability and liability', body: ['We work to keep the website available and accurate, but it may be interrupted for maintenance or for reasons beyond our control. To the extent permitted by law, CTBX Payments is not liable for damages resulting from temporary unavailability of the website.'] },
      { title: 'Privacy', body: ['Personal data processed through the website is handled under the CTBX Payments Privacy Policy.'] },
      { title: 'Changes and governing law', body: ['These terms may be updated at any time; the date of the latest update is shown at the top of the page. These terms are governed by Brazilian law. The courts of the user’s place of residence shall have jurisdiction, as provided by Brazil’s Consumer Protection Code.'] },
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    intro: 'Cookies are small files a website can store in your browser. This policy explains how the CTBX Payments corporate website uses cookies and similar technologies.',
    sections: [
      { title: 'The website does not use tracking cookies', body: ['Today, this website does not set advertising, tracking or audience analytics cookies. We do not use tools that follow your browsing on other websites.'] },
      { title: 'Third-party services loaded by the website', body: ['To display its typefaces, the website loads files from the Google Fonts service. When this happens, your browser connects to Google’s servers, which receive technical data such as your IP address. This processing follows Google’s privacy policy.'] },
      { title: 'CTBX Payments app', body: ['In the app, your login is kept in your phone’s secure storage, not in tracking cookies. It is used only to keep you securely signed in.'] },
      { title: 'How to control cookies', body: ['You can delete or block cookies in your browser settings at any time. Since the website does not rely on its own cookies, it keeps working normally.'] },
      { title: 'Changes to this policy', body: ['If we start using analytics or other cookies in the future, this policy will be updated beforehand, and we will ask for your consent where the law requires it.'] },
    ],
  },
});
