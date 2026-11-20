/**
 * E-mail automático de confirmação enviado a quem usa o formulário de Contato.
 * Por segurança, NÃO inclui nada digitado pelo visitante (nome, mensagem…),
 * para que o formulário não possa ser usado para mandar conteúdo a terceiros.
 */
type Lang = 'pt' | 'en';

const COPY = {
  pt: {
    subject: 'Recebemos sua mensagem | CTBX Payments',
    preheader: 'Confirmamos o recebimento do seu contato.',
    title: 'Obrigado pelo seu contato',
    greeting: 'Olá,',
    paragraphs: [
      'Recebemos a sua mensagem enviada pelo site da CTBX Payments.',
      'Nossa equipe vai analisar sua solicitação e responder pelo e-mail informado assim que possível.',
      'Se quiser complementar alguma informação, basta responder a este e-mail.',
    ],
    closing: 'Atenciosamente,',
    team: 'Equipe CTBX Payments',
    note: 'Esta é uma mensagem automática de confirmação.',
  },
  en: {
    subject: 'We have received your message | CTBX Payments',
    preheader: 'We confirm that we have received your message.',
    title: 'Thank you for contacting us',
    greeting: 'Hello,',
    paragraphs: [
      'We have received the message you sent through the CTBX Payments website.',
      'Our team will review your request and reply to the email address you provided as soon as possible.',
      'If you would like to add any information, simply reply to this email.',
    ],
    closing: 'Kind regards,',
    team: 'CTBX Payments Team',
    note: 'This is an automatic confirmation message.',
  },
} satisfies Record<Lang, unknown>;

export function confirmationEmail(lang: Lang, siteOrigin: string) {
  const c = COPY[lang];
  const logo = `${siteOrigin}/email/logo.png`;
  const html = `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'pt-BR'}"><body style="margin:0;padding:0;background:#292B2E">
  <span style="display:none;max-height:0;overflow:hidden">${c.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#292B2E;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#303236;border:1px solid #44474C;border-radius:16px;font-family:Arial,Helvetica,sans-serif">
        <tr><td style="padding:32px 32px 8px" align="left">
          <img src="${logo}" alt="CTBX Payments" width="96" style="display:block;border:0;width:96px;height:auto" />
        </td></tr>
        <tr><td style="padding:16px 32px 0">
          <div style="width:48px;height:2px;background:#C5A46C;margin:0 0 20px"></div>
          <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#F4F4F2">${c.title}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#BFC2C7">${c.greeting}</p>
          ${c.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#BFC2C7">${p}</p>`).join('')}
          <p style="margin:24px 0 4px;font-size:15px;color:#BFC2C7">${c.closing}</p>
          <p style="margin:0 0 28px;font-size:15px;font-weight:bold;color:#F4F4F2">${c.team}</p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid #44474C">
          <p style="margin:0;font-size:12px;color:#8E9298">${c.note}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text = `${c.title}\n\n${c.greeting}\n\n${c.paragraphs.join('\n\n')}\n\n${c.closing}\n${c.team}\n\n${c.note}`;
  return { subject: c.subject, html, text };
}
