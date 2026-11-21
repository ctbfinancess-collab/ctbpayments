// Textos das políticas legais (Privacidade, Termos de Uso, Cookies).
//
// Política de Privacidade aprovada pelo jurídico em 2026-11-21 (minuta
// revisada). Descreve só o que o sistema faz de fato; qualquer mudança no
// que é coletado ou em fornecedores exige atualizar este texto.
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
    intro: `Esta política explica como a ${company}, inscrita no CNPJ ${cnpj}, com sede em ${address}, trata os dados pessoais de quem visita este site e de quem se cadastra na Área do Cliente CTBX Payments (app.ctbxpayments.com), de acordo com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).`,
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
            'Formulário de contato do site: nome, e-mail, telefone (opcional), assunto e mensagem.',
            'Cadastro na Área do Cliente: nome completo, CPF, e-mail, celular e senha. A senha é guardada apenas como hash criptográfico; ninguém na CTBX Payments tem acesso a ela.',
            'Verificação de identidade (KYC) — dados pessoais: data de nascimento, nome completo da mãe e nacionalidade.',
            'Verificação de identidade (KYC) — endereço residencial e declarações: se você é pessoa politicamente exposta (PEP), profissão e faixa de renda mensal.',
            'Verificação de identidade (KYC) — documentos: fotos do documento de identidade (RG, CNH ou RNE/CRNM, frente e verso) e do comprovante de endereço, e uma selfie tirada pela câmera no momento do cadastro, usada para conferir que a pessoa é a titular do documento.',
            'Cadastro de empresa (pessoa jurídica): CNPJ, razão social, nome fantasia, data de abertura, natureza jurídica, atividade principal, e-mail e telefone da empresa, faixa de faturamento anual, endereço, o cargo de quem solicita e documentos da empresa (cartão CNPJ, contrato social ou estatuto, comprovante de endereço e, se for o caso, procuração).',
            'Dados técnicos e de segurança: registros de acesso (data, hora, endereço IP e tipo de navegador ou dispositivo) e registros de eventos de segurança, como entradas na conta, trocas de senha e decisões da análise cadastral.',
          ] },
          'A selfie é um dado biométrico e, por isso, um dado pessoal sensível pela LGPD. Ela é usada apenas para identificação e prevenção à fraude no cadastro, e é conferida por uma pessoa da nossa equipe, sem reconhecimento facial automático. Não coletamos outros dados sensíveis, como origem racial, convicção religiosa ou dados de saúde.',
        ],
      },
      {
        title: 'Para que usamos os dados e com qual base legal',
        body: [
          { list: [
            'Responder mensagens do formulário de contato — consentimento (art. 7º, I).',
            'Criar e manter sua conta, confirmar seu e-mail, dar acesso à Área do Cliente e avisar sobre o andamento do seu cadastro — execução de contrato e procedimentos preliminares a pedido do titular (art. 7º, V).',
            'Verificar a sua identidade e a da empresa e prevenir fraudes e lavagem de dinheiro — cumprimento de obrigação legal ou regulatória (art. 7º, II) e procedimentos preliminares relacionados ao contrato (art. 7º, V).',
            'Conferir que a pessoa da selfie é a titular do documento — prevenção à fraude e segurança do titular em processos de identificação e autenticação de cadastro (art. 11, II, g).',
            'Proteger a segurança da conta e manter registros de acesso — obrigação legal (Marco Civil da Internet, art. 15) e legítimo interesse (art. 7º, IX).',
          ] },
          'Não usamos seus dados para publicidade e não tomamos decisões exclusivamente automatizadas sobre o seu cadastro: toda aprovação, recusa ou pedido de ajuste é feito por uma pessoa da equipe, e a recusa é sempre fundamentada.',
        ],
      },
      {
        title: 'Com quem compartilhamos',
        body: [
          'Não vendemos dados pessoais. Compartilhamos dados apenas com fornecedores que nos ajudam a operar o serviço, sob contrato e somente para estas finalidades:',
          { list: [
            'Railway: hospedagem do site e da Área do Cliente, banco de dados e armazenamento dos documentos, em servidores nos Estados Unidos.',
            'Resend: envio de e-mails de confirmação, de redefinição de senha e de andamento do cadastro, a partir de servidores no Brasil (São Paulo); a empresa fica nos Estados Unidos.',
            'Hostinger: e-mail corporativo, onde chegam as mensagens do formulário de contato.',
            'Google Fonts: exibição das fontes do site; recebe dados técnicos como o endereço IP.',
          ] },
          'Na análise de empresas, enviamos apenas o número do CNPJ a um serviço que consulta a base pública da Receita Federal (BrasilAPI); nenhum dado pessoal do solicitante é enviado.',
          'Também compartilhamos dados com autoridades públicas quando houver obrigação legal ou ordem judicial.',
        ],
      },
      {
        title: 'Transferência internacional de dados',
        body: ['Parte dos dados, inclusive as fotos de documentos e a selfie, é armazenada em servidores nos Estados Unidos. Essas transferências seguem o art. 33 da LGPD, com cláusulas-padrão contratuais aprovadas pela Autoridade Nacional de Proteção de Dados (Resolução CD/ANPD nº 19/2024). Os documentos e a selfie são guardados criptografados (AES-256), e a chave de criptografia fica separada dos arquivos.'],
      },
      {
        title: 'Por quanto tempo guardamos',
        body: [{ list: [
          'Mensagens do formulário de contato: enquanto forem necessárias para o atendimento.',
          'Dados de cadastro, verificação de identidade e documentos, inclusive versões substituídas durante o cadastro: enquanto a conta estiver ativa e por 5 anos depois do encerramento, conforme a legislação de prevenção à lavagem de dinheiro (Lei nº 9.613/1998).',
          'Registros de acesso: pelo menos 6 meses, conforme o Marco Civil da Internet (Lei nº 12.965/2014, art. 15).',
          'Registros de segurança e de decisões da análise cadastral: pelo mesmo prazo dos dados de cadastro, pois comprovam como cada decisão foi tomada.',
        ] }],
      },
      {
        title: 'Como protegemos seus dados',
        body: [{ list: [
          'Senhas guardadas apenas como hash criptográfico.',
          'Comunicação sempre por conexão criptografada (HTTPS).',
          'Fotos de documentos e selfie guardadas criptografadas, fora do banco de dados, com a chave separada.',
          'Banco de dados sem acesso público pela internet, com cópias de segurança diárias e semanais.',
          'Sessão de acesso com prazo de validade de até 24 horas, guardada no seu navegador e apagada ao sair da conta.',
          'Acesso da equipe por painel exclusivo, com verificação em duas etapas obrigatória e permissões por função.',
          'Todo acesso da equipe a documentos e toda decisão da análise são registrados numa trilha de auditoria protegida contra alteração e exclusão.',
          'Links de confirmação de e-mail e de redefinição de senha com prazo de validade e uso único.',
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
            'pedir a eliminação dos dados tratados com base no consentimento e revogar esse consentimento;',
            'saber com quem compartilhamos seus dados;',
            'ser informado sobre a possibilidade de não dar consentimento e suas consequências;',
            'pedir a revisão de decisões tomadas sobre o seu cadastro.',
          ] },
          `Para exercer esses direitos, escreva para ${dpoEmail}. Alguns dados podem precisar ser mantidos mesmo após o pedido, quando a lei exigir. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).`,
        ],
      },
      {
        title: 'Crianças e adolescentes',
        body: ['O site e a Área do Cliente não são destinados a menores de 18 anos, e não coletamos intencionalmente dados de crianças ou adolescentes.'],
      },
      {
        title: 'Alterações desta política',
        body: ['Podemos atualizar esta política para refletir mudanças no serviço ou na legislação. A data da última atualização aparece no topo da página. Mudanças relevantes serão comunicadas por e-mail aos clientes cadastrados e pelos canais da CTBX Payments.'],
      },
    ],
  },
  terms: {
    title: 'Termos de Uso',
    intro: `Estes termos regulam o uso do site institucional da CTBX Payments, mantido pela ${company} (CNPJ ${cnpj}). Ao navegar pelo site, você concorda com estes termos.`,
    sections: [
      {
        title: 'Sobre o site',
        body: ['Este site é institucional e informativo. Ele apresenta a CTBX Payments e os serviços que estão disponíveis ou em preparação. A abertura e o uso da conta digital acontecem na Área do Cliente CTBX Payments (app.ctbxpayments.com), e o tratamento dos dados pessoais segue a Política de Privacidade.'],
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
        title: 'Área do Cliente CTBX Payments',
        body: ['Na Área do Cliente, o seu acesso fica guardado no armazenamento local do seu navegador, e não em cookies de rastreamento. Ele é usado apenas para manter você conectado com segurança, vale por até 24 horas e é apagado quando você sai da conta.'],
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
    intro: `This policy explains how ${company}, registered under CNPJ ${cnpj}, headquartered at ${address}, processes the personal data of visitors to this website and of people who sign up for the CTBX Payments Customer Area (app.ctbxpayments.com), in accordance with Brazil’s General Data Protection Law (Law No. 13,709/2018 — LGPD).`,
    sections: [
      { title: 'Who is the data controller', body: [`The controller is ${company} (CNPJ ${cnpj}). The data protection officer (DPO) is ${dpo}, who can be reached at ${dpoEmail}.`] },
      {
        title: 'What data we collect',
        body: [
          'We only collect the data needed for each purpose:',
          { list: [
            'Website contact form: name, email, phone (optional), subject and message.',
            'Customer Area sign-up: full name, CPF (Brazilian taxpayer ID), email, mobile number and password. The password is stored only as a cryptographic hash; no one at CTBX Payments can see it.',
            'Identity verification (KYC) — personal data: date of birth, mother’s full name and nationality.',
            'Identity verification (KYC) — home address and declarations: whether you are a politically exposed person (PEP), occupation and monthly income range.',
            'Identity verification (KYC) — documents: photos of your ID (RG, CNH or RNE/CRNM, front and back) and proof of address, and a selfie taken with the camera during sign-up, used to confirm that the person is the document holder.',
            'Company sign-up: CNPJ, legal name, trade name, opening date, legal nature, main activity, company email and phone, annual revenue range, address, the applicant’s position and company documents (CNPJ card, articles of association or bylaws, proof of address and, where applicable, power of attorney).',
            'Technical and security data: access logs (date, time, IP address and browser or device type) and security event logs, such as sign-ins, password changes and sign-up review decisions.',
          ] },
          'The selfie is biometric data and therefore sensitive personal data under the LGPD. It is used only for identification and fraud prevention at sign-up, and it is checked by a person on our team, without automated facial recognition. We do not collect other sensitive data, such as racial origin, religious beliefs or health data.',
        ],
      },
      {
        title: 'How we use data and on what legal basis',
        body: [
          { list: [
            'Replying to contact form messages — consent (art. 7, I).',
            'Creating and maintaining your account, confirming your email, giving access to the Customer Area and notifying you about your sign-up status — performance of a contract and pre-contractual steps at your request (art. 7, V).',
            'Verifying your identity and your company’s, and preventing fraud and money laundering — compliance with legal or regulatory obligations (art. 7, II) and pre-contractual steps (art. 7, V).',
            'Confirming that the person in the selfie is the document holder — fraud prevention and the data subject’s security in identification and authentication processes (art. 11, II, g).',
            'Protecting account security and keeping access logs — legal obligation (Internet Civil Framework, art. 15) and legitimate interest (art. 7, IX).',
          ] },
          'We do not use your data for advertising, and we do not make decisions about your sign-up based solely on automated processing: every approval, rejection or request for changes is made by a person on our team, and rejections are always justified.',
        ],
      },
      {
        title: 'Who we share data with',
        body: [
          'We do not sell personal data. We only share data with providers that help us operate the service, under contract and only for these purposes:',
          { list: [
            'Railway: hosting of the website and the Customer Area, database and document storage, on servers in the United States.',
            'Resend: sending sign-up confirmation, password reset and sign-up status emails, from servers in Brazil (São Paulo); the company is based in the United States.',
            'Hostinger: corporate email, where contact form messages are received.',
            'Google Fonts: displaying the website’s typefaces; receives technical data such as the IP address.',
          ] },
          'When reviewing companies, we only send the CNPJ number to a service that queries the Brazilian Federal Revenue’s public database (BrasilAPI); no personal data about the applicant is sent.',
          'We also share data with public authorities when required by law or court order.',
        ],
      },
      { title: 'International data transfers', body: ['Part of the data, including ID photos and the selfie, is stored on servers in the United States. These transfers follow art. 33 of the LGPD, using standard contractual clauses approved by Brazil’s National Data Protection Authority (ANPD Resolution CD/ANPD No. 19/2024). Documents and selfies are stored encrypted (AES-256), and the encryption key is kept separately from the files.'] },
      {
        title: 'How long we keep data',
        body: [{ list: [
          'Contact form messages: while needed to handle your request.',
          'Sign-up, identity verification data and documents, including versions replaced during sign-up: while the account is active and for 5 years after it is closed, under anti-money-laundering law (Law No. 9,613/1998).',
          'Access logs: at least 6 months, under the Internet Civil Framework (Law No. 12,965/2014, art. 15).',
          'Security logs and sign-up review decisions: for the same period as sign-up data, as they show how each decision was made.',
        ] }],
      },
      {
        title: 'How we protect your data',
        body: [{ list: [
          'Passwords stored only as cryptographic hashes.',
          'Connections always encrypted (HTTPS).',
          'ID photos and selfies stored encrypted, outside the database, with the key kept separately.',
          'Database with no public internet access, with daily and weekly backups.',
          'Login session valid for up to 24 hours, kept in your browser and deleted when you sign out.',
          'Team access through a dedicated panel, with mandatory two-step verification and role-based permissions.',
          'Every team access to documents and every review decision is recorded in an audit trail protected against changes and deletion.',
          'Email confirmation and password reset links that expire and can only be used once.',
        ] }],
      },
      {
        title: 'Your rights',
        body: [
          'Under the LGPD (art. 18), you may at any time:',
          { list: [
            'confirm whether we process your data and access it;',
            'correct incomplete, inaccurate or outdated data;',
            'request anonymization, blocking or deletion of unnecessary data or data processed in breach of the law;',
            'request data portability to another provider;',
            'request deletion of data processed based on consent, and withdraw that consent;',
            'find out who we share your data with;',
            'be informed about the possibility of not giving consent and its consequences;',
            'request a review of decisions made about your sign-up.',
          ] },
          `To exercise these rights, write to ${dpoEmail}. Some data may need to be kept even after your request, when required by law. You may also file a complaint with Brazil’s National Data Protection Authority (ANPD).`,
        ],
      },
      { title: 'Children and teenagers', body: ['The website and the Customer Area are not intended for people under 18, and we do not knowingly collect data from children or teenagers.'] },
      { title: 'Changes to this policy', body: ['We may update this policy to reflect changes in the service or in the law. The date of the latest update is shown at the top of the page. Significant changes will be announced by email to registered customers and through CTBX Payments’ channels.'] },
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: `These terms govern the use of the CTBX Payments corporate website, operated by ${company} (CNPJ ${cnpj}). By browsing the website, you agree to these terms.`,
    sections: [
      { title: 'About the website', body: ['This is an informational corporate website. It presents CTBX Payments and the services that are available or in preparation. Opening and using the digital account takes place in the CTBX Payments Customer Area (app.ctbxpayments.com), and personal data is handled under the Privacy Policy.'] },
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
      { title: 'CTBX Payments Customer Area', body: ['In the Customer Area, your login is kept in your browser’s local storage, not in tracking cookies. It is used only to keep you securely signed in, lasts up to 24 hours and is deleted when you sign out.'] },
      { title: 'How to control cookies', body: ['You can delete or block cookies in your browser settings at any time. Since the website does not rely on its own cookies, it keeps working normally.'] },
      { title: 'Changes to this policy', body: ['If we start using analytics or other cookies in the future, this policy will be updated beforehand, and we will ask for your consent where the law requires it.'] },
    ],
  },
});
