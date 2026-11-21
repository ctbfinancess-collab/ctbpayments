import type { RenderedEmail } from './resetPasswordTemplate.js';

// E-mails do painel da equipe e das decisões de KYC. Mesmo visual dos
// demais (grafite, dourado). Nenhum dado sensível do cliente (CPF,
// documentos) vai no e-mail.
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function layout(title: string, paragraphs: string[], button?: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#BFC2C7;">${esc(p).replace(/\n/g, '<br />')}</p>`).join('');
  const cta = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="border-radius:999px; background:#C5A46C;"><a href="${esc(button.url)}" style="display:inline-block; padding:13px 26px; font-size:14px; font-weight:600; color:#1C1D20; text-decoration:none;">${esc(button.label)}</a></td></tr></table>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)}</title></head>
  <body style="margin:0; padding:0; background-color:#1C1E21; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1C1E21; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#26282C; border:1px solid #3A3D42; border-radius:16px;">
          <tr><td style="padding:32px;">
            <div style="width:48px; height:2px; background:#C5A46C; margin:0 0 20px;"></div>
            <h1 style="margin:0 0 16px; font-size:21px; line-height:1.3; color:#F4F4F2;">${esc(title)}</h1>
            ${body}${cta}
            <p style="margin:18px 0 0; font-size:12px; color:#8E9298;">Mensagem automática da CTBX Payments.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function renderStaffInviteTemplate(name: string, link: string): RenderedEmail {
  const title = 'Convite para o painel da equipe';
  const p = [
    `Olá, ${name}.`,
    'Você foi convidado(a) para o painel administrativo da CTBX Payments. No primeiro acesso você vai criar sua senha e configurar a verificação em duas etapas com um aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou similar).',
    'Este link vale por 48 horas e só pode ser usado uma vez. Se você não esperava este convite, ignore esta mensagem.',
  ];
  return { subject: `${title} — CTBX Payments`, html: layout(title, p, { label: 'Aceitar convite', url: link }), text: `${title}\n\n${p.join('\n\n')}\n\n${link}` };
}

// Recuperação de acesso da equipe (Fase 1 do painel). Nenhum destes e-mails
// leva senha, código ou dado de cliente: só o link de uso único.
export function renderStaffPasswordResetTemplate(name: string, link: string): RenderedEmail {
  const title = 'Redefinir a senha do painel';
  const p = [
    `Olá, ${name}.`,
    'Recebemos um pedido para redefinir a sua senha do painel administrativo da CTBX Payments.',
    'Para concluir, você vai criar uma nova senha e confirmar com o código do seu aplicativo autenticador. Este link vale por 30 minutos e só pode ser usado uma vez.',
    'Se você não pediu, ignore esta mensagem: a sua senha continua a mesma. Se receber pedidos que não fez, avise um administrador.',
  ];
  return { subject: `${title} — CTBX Payments`, html: layout(title, p, { label: 'Redefinir senha', url: link }), text: `${title}\n\n${p.join('\n\n')}\n\n${link}` };
}

export function renderStaffAccessResetTemplate(name: string, link: string): RenderedEmail {
  const title = 'Seu acesso ao painel foi redefinido';
  const p = [
    `Olá, ${name}.`,
    'Um administrador da CTBX Payments redefiniu o seu acesso ao painel. A senha e o aplicativo autenticador anteriores deixaram de funcionar e todas as sessões abertas foram encerradas.',
    'Para voltar a entrar, crie uma nova senha e configure de novo a verificação em duas etapas. Este link vale por 24 horas e só pode ser usado uma vez.',
    'Se você não pediu essa redefinição, avise um administrador imediatamente.',
  ];
  return { subject: `${title} — CTBX Payments`, html: layout(title, p, { label: 'Criar nova senha', url: link }), text: `${title}\n\n${p.join('\n\n')}\n\n${link}` };
}

export function renderStaffPasswordChangedTemplate(name: string): RenderedEmail {
  const title = 'A senha do painel foi alterada';
  const p = [
    `Olá, ${name}.`,
    'A sua senha do painel administrativo da CTBX Payments foi redefinida agora, e todas as sessões abertas foram encerradas.',
    'Se não foi você, avise um administrador imediatamente para que ele bloqueie e redefina o seu acesso.',
  ];
  return { subject: `${title} — CTBX Payments`, html: layout(title, p), text: `${title}\n\n${p.join('\n\n')}` };
}

// Aviso aos administradores: toda redefinição feita por um administrador
// chega a todos eles, para que ninguém redefina um acesso sem ser visto.
export function renderStaffAccessResetNoticeTemplate(targetName: string, actorName: string, reason: string): RenderedEmail {
  const title = 'Acesso de um membro da equipe redefinido';
  const p = [
    `${actorName} redefiniu o acesso de ${targetName} ao painel administrativo.`,
    `Motivo informado: ${reason}`,
    'A senha e o autenticador anteriores foram invalidados e as sessões foram encerradas. A pessoa recebeu um link para criar o acesso de novo.',
    'Se você não reconhece esta ação, verifique a auditoria do painel imediatamente.',
  ];
  return { subject: `${title} — CTBX Payments`, html: layout(title, p), text: `${title}\n\n${p.join('\n\n')}` };
}

export type KycDecisionKind = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

export function renderKycDecisionTemplate(kind: KycDecisionKind, reason: string | null, appLink: string): RenderedEmail {
  const copy = {
    APPROVED: { title: 'Sua identidade foi verificada', p: ['Boa notícia: concluímos a análise e sua identidade foi verificada.', 'Os serviços financeiros serão liberados assim que estiverem disponíveis; avisaremos você.'] },
    CHANGES_REQUESTED: { title: 'Precisamos de um ajuste na sua verificação', p: ['Analisamos seus dados e precisamos que você corrija ou reenvie algumas informações.', `O que ajustar: ${reason ?? ''}`, 'Entre na Área do Cliente, faça o ajuste e envie novamente.'] },
    REJECTED: { title: 'Não foi possível verificar sua identidade', p: ['Concluímos a análise e, desta vez, não foi possível aprovar a sua verificação.', `Motivo: ${reason ?? ''}`, 'Se tiver dúvidas, responda a este e-mail ou fale com nosso atendimento: contato@ctbxpayments.com.'] },
  }[kind];
  return { subject: `${copy.title} — CTBX Payments`, html: layout(copy.title, copy.p, { label: 'Abrir a Área do Cliente', url: appLink }), text: `${copy.title}\n\n${copy.p.join('\n\n')}\n\n${appLink}` };
}

export function renderCompanyDecisionTemplate(kind: KycDecisionKind, companyName: string, reason: string | null, appLink: string): RenderedEmail {
  const copy = {
    APPROVED: { title: 'Conta PJ aprovada', p: [`O pedido de conta PJ da empresa ${companyName} foi aprovado.`, 'Os serviços financeiros para empresas serão liberados assim que estiverem disponíveis; avisaremos você.'] },
    CHANGES_REQUESTED: { title: 'Precisamos de um ajuste no pedido de conta PJ', p: [`Analisamos o pedido da empresa ${companyName} e precisamos de uma correção.`, `O que ajustar: ${reason ?? ''}`, 'Entre na Área do Cliente, em Empresas, faça o ajuste e envie novamente.'] },
    REJECTED: { title: 'Pedido de conta PJ não aprovado', p: [`Concluímos a análise do pedido da empresa ${companyName} e, desta vez, não foi possível aprovar.`, `Motivo: ${reason ?? ''}`, 'Se tiver dúvidas, fale com nosso atendimento: contato@ctbxpayments.com.'] },
  }[kind];
  return { subject: `${copy.title} — CTBX Payments`, html: layout(copy.title, copy.p, { label: 'Abrir a Área do Cliente', url: appLink }), text: `${copy.title}\n\n${copy.p.join('\n\n')}\n\n${appLink}` };
}

// Confirmação de recebimento (Fase 5, ajuste): enviada quando o cliente
// envia a verificação de identidade ou um pedido de conta PJ.
export function renderSubmissionReceivedTemplate(kind: 'KYC' | 'COMPANY', appLink: string, companyName?: string): RenderedEmail {
  const copy = kind === 'KYC'
    ? { title: 'Recebemos a sua verificação de identidade', p: ['Recebemos os seus dados e documentos. Nossa equipe vai analisar e você receberá um e-mail com o resultado.', 'Enquanto a análise não for concluída, você pode retirar o envio para corrigir algo pela Área do Cliente.'] }
    : { title: 'Recebemos o seu pedido de conta PJ', p: [`Recebemos o pedido de conta PJ da empresa ${companyName ?? ''}. Nossa equipe vai analisar e você receberá um e-mail com o resultado.`, 'Enquanto a análise não for concluída, você pode retirar o pedido para corrigir algo pela Área do Cliente, em Empresas.'] };
  return { subject: `${copy.title} — CTBX Payments`, html: layout(copy.title, copy.p, { label: 'Acompanhar na Área do Cliente', url: appLink }), text: `${copy.title}\n\n${copy.p.join('\n\n')}\n\n${appLink}` };
}

// Fase 6 — avisos ao cliente quando a equipe suspende ou reativa a conta.
// O motivo interno NÃO vai no e-mail.
export function renderAccountStatusTemplate(kind: 'BLOCKED' | 'REACTIVATED', appLink: string): RenderedEmail {
  const copy = kind === 'BLOCKED'
    ? { title: 'Sua conta foi suspensa', p: ['Por segurança, o acesso à sua conta CTBX Payments foi suspenso e as sessões abertas foram encerradas.', 'Para entender o motivo ou pedir a reativação, fale com nosso atendimento: contato@ctbxpayments.com.'] }
    : { title: 'Sua conta foi reativada', p: ['O acesso à sua conta CTBX Payments foi reativado. Você já pode entrar normalmente.', 'Se não reconhece esta mudança, fale com nosso atendimento: contato@ctbxpayments.com.'] };
  return { subject: `${copy.title} — CTBX Payments`, html: layout(copy.title, copy.p, kind === 'REACTIVATED' ? { label: 'Entrar na Área do Cliente', url: appLink } : undefined), text: `${copy.title}\n\n${copy.p.join('\n\n')}` };
}
