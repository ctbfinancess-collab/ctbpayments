export interface VerifyEmailTemplateInput {
  verificationUrl: string;
  expiresInMinutes: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Identidade visual CTBX Payments (fundo azul-marinho muito escuro,
// gradiente azul/violeta → laranja no CTA, cartão claro central) — mesma
// linguagem visual do mockup de recuperação de senha já aprovado. Sem
// nenhuma imagem externa (o wordmark "CTBX PAYMENTS" é só CSS/texto) —
// não depende de hospedar nenhum asset pra funcionar. Sem nenhum dado
// sensível: só o link de verificação (o token em si só existe como query
// param desse link, nunca em texto explicado/rotulado).
export function renderVerifyEmailTemplate(input: VerifyEmailTemplateInput): RenderedEmail {
  const { verificationUrl, expiresInMinutes } = input;
  const subject = 'Verifique seu e-mail — CTBX Payments';

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
    <style>
      /* Largura em pixel fixo (não %) evita clientes que ignoram
         max-width e esticam o card pra tela inteira — a media query
         abaixo é o único lugar que encolhe em telas pequenas. */
      @media only screen and (max-width: 520px) {
        .ctbx-email-container { width:100% !important; max-width:100% !important; }
        .ctbx-email-card { padding:24px 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#070b1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070b1a; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" align="center" width="480" class="ctbx-email-container" style="width:480px; max-width:480px;" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <span style="font-size:18px; font-weight:800; letter-spacing:0.4px; color:#ffffff;">CTBX <span style="background:linear-gradient(90deg,#7C6CF2,#FF7A3D); -webkit-background-clip:text; background-clip:text; color:#FF7A3D;">PAYMENTS</span></span>
                <div style="margin-top:5px; font-size:10px; letter-spacing:1.5px; color:#7C8BB0; text-transform:uppercase;">Payments &bull; Investments &bull; Solutions</div>
              </td>
            </tr>
            <tr>
              <td class="ctbx-email-card" style="background-color:#ffffff; border-radius:14px; border-top:3px solid #FF7A3D; padding:28px 28px; box-shadow:0 16px 40px rgba(0,0,0,0.3);">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:40px; height:40px; border-radius:50%; background-color:#F1EEFE; text-align:center; vertical-align:middle; font-size:18px; line-height:40px;">&#9993;&#65039;</td>
                  </tr>
                </table>
                <h1 style="margin:16px 0 4px; font-size:18px; color:#161B33;">Verifique seu e-mail</h1>
                <p style="margin:0 0 14px; font-size:13px; color:#4B5573;">Olá!</p>
                <p style="margin:0 0 18px; font-size:13px; line-height:1.55; color:#4B5573;">
                  Recebemos um cadastro no <strong style="color:#161B33;">CTBX Payments</strong> com este endereço de e-mail.
                  Para confirmar que é você e ativar sua conta, clique no botão abaixo.
                  O link é válido por <strong>${expiresInMinutes} minutos</strong> e pode ser usado apenas uma vez.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                  <tr>
                    <td align="center" style="border-radius:8px; background:linear-gradient(90deg,#5B3FE0,#FF7A3D);">
                      <a href="${verificationUrl}" style="display:inline-block; padding:12px 26px; font-size:13px; font-weight:700; color:#ffffff; text-decoration:none;">VERIFICAR MEU E-MAIL</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F6FB; border-radius:10px; padding:14px 16px;">
                  <tr>
                    <td style="font-size:12px; font-weight:700; color:#161B33; padding-bottom:6px;">&#128737;&#65039; Por sua segurança</td>
                  </tr>
                  <tr><td style="font-size:12px; color:#4B5573; padding:2px 0;">&#10003; Este link expira em ${expiresInMinutes} minutos.</td></tr>
                  <tr><td style="font-size:12px; color:#4B5573; padding:2px 0;">&#10003; Ele pode ser usado apenas uma vez.</td></tr>
                  <tr><td style="font-size:12px; color:#4B5573; padding:2px 0;">&#10003; Se você não criou esta conta, ignore este e-mail — nenhuma ação será tomada.</td></tr>
                </table>
                <p style="margin:18px 0 0; font-size:11px; color:#8B93AB;">Se o botão não funcionar, copie e cole este link no navegador:<br /><span style="word-break:break-all; color:#5B3FE0;">${verificationUrl}</span></p>
                <hr style="border:none; border-top:1px solid #EDEEF5; margin:20px 0 16px;" />
                <p style="margin:0; font-size:12px; color:#4B5573;">Atenciosamente,<br /><strong style="color:#161B33;">Equipe CTBX Payments</strong></p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:18px; font-size:11px; color:#7C8BB0;">
                Este é um e-mail automático — por favor, não responda.<br />
                &copy; ${new Date().getFullYear()} CTBX Payments. Todos os direitos reservados.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'Verifique seu e-mail — CTBX Payments',
    '',
    'Olá!',
    '',
    'Recebemos um cadastro no CTBX Payments com este endereço de e-mail. Para confirmar que é você e ativar sua conta, acesse o link abaixo.',
    `O link é válido por ${expiresInMinutes} minutos e pode ser usado apenas uma vez.`,
    '',
    verificationUrl,
    '',
    'Por sua segurança:',
    `- Este link expira em ${expiresInMinutes} minutos.`,
    '- Ele pode ser usado apenas uma vez.',
    '- Se você não criou esta conta, ignore este e-mail — nenhuma ação será tomada.',
    '',
    'Atenciosamente,',
    'Equipe CTBX Payments',
    '',
    'Este é um e-mail automático — por favor, não responda.',
  ].join('\n');

  return { subject, html, text };
}
