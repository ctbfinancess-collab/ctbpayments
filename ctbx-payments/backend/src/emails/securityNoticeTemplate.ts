import type { RenderedEmail } from './resetPasswordTemplate.js';

// Avisos de segurança da conta (sem link de ação e sem nenhum dado
// sensível): senha alterada, e-mail alterado, tentativa de cadastro com
// um e-mail que já tem conta. Servem para o titular perceber uma ação
// que não fez e procurar o suporte.
export type SecurityNoticeKind = 'PASSWORD_CHANGED' | 'EMAIL_CHANGED' | 'ACCOUNT_EXISTS';

const COPY: Record<SecurityNoticeKind, { subject: string; title: string; body: string; hint: string }> = {
  PASSWORD_CHANGED: {
    subject: 'Sua senha foi alterada — CTBX Payments',
    title: 'Sua senha foi alterada',
    body: 'A senha da sua conta CTBX Payments acabou de ser alterada. Por segurança, todas as sessões anteriores foram encerradas.',
    hint: 'Se não foi você, redefina sua senha imediatamente pela opção "Esqueci minha senha" e fale com nossa equipe.',
  },
  EMAIL_CHANGED: {
    subject: 'O e-mail da sua conta foi alterado — CTBX Payments',
    title: 'O e-mail da sua conta foi alterado',
    body: 'O e-mail de acesso da sua conta CTBX Payments foi trocado e este endereço deixou de ser usado para entrar. Por segurança, todas as sessões foram encerradas.',
    hint: 'Se não foi você, fale com nossa equipe imediatamente.',
  },
  ACCOUNT_EXISTS: {
    subject: 'Tentativa de cadastro com seu e-mail — CTBX Payments',
    title: 'Você já tem uma conta',
    body: 'Recebemos um pedido de cadastro com este e-mail, que já está vinculado a uma conta CTBX Payments. Nenhuma conta nova foi criada.',
    hint: 'Se foi você, basta entrar normalmente ou usar "Esqueci minha senha". Se não foi você, pode ignorar esta mensagem.',
  },
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export function renderSecurityNoticeTemplate(kind: SecurityNoticeKind): RenderedEmail {
  const c = COPY[kind];
  const html = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(c.subject)}</title></head>
  <body style="margin:0; padding:0; background-color:#1C1E21; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1C1E21; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#26282C; border:1px solid #3A3D42; border-radius:16px;">
          <tr><td style="padding:32px;">
            <div style="width:48px; height:2px; background:#C5A46C; margin:0 0 20px;"></div>
            <h1 style="margin:0 0 16px; font-size:21px; line-height:1.3; color:#F4F4F2;">${escapeHtml(c.title)}</h1>
            <p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#BFC2C7;">${escapeHtml(c.body)}</p>
            <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#BFC2C7;">${escapeHtml(c.hint)}</p>
            <p style="margin:0; font-size:12px; color:#8E9298;">Mensagem automática de segurança da CTBX Payments.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = `${c.title}\n\n${c.body}\n\n${c.hint}\n\nMensagem automática de segurança da CTBX Payments.`;
  return { subject: c.subject, html, text };
}
