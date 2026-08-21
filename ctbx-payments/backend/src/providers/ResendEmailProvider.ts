import { Resend } from 'resend';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './EmailProvider.js';

// Implementação real (produção) — usa o SDK oficial `resend`. Fail-closed
// na CONSTRUÇÃO, não só no envio: sem RESEND_API_KEY ou EMAIL_FROM, o
// provider nem chega a existir (mesmo espírito do "forbidden in
// production"/"providerNotConfigured" já usados no resto do backend —
// nunca um modo aberto por omissão, nunca envia de um remetente
// inventado). Quem decide QUANDO usar esta classe (produção sempre; dev/
// test só se as duas variáveis estiverem presentes) é createEmailProvider,
// não esta classe.
export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string | undefined, emailFrom: string | undefined) {
    if (!apiKey) throw new Error('RESEND_API_KEY não configurada.');
    if (!emailFrom) throw new Error('EMAIL_FROM não configurada.');
    this.client = new Resend(apiKey);
    this.from = emailFrom;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!input.html && !input.text) throw new Error('SendEmailInput precisa de "html" ou "text".');
    const base = { from: this.from, to: input.to, subject: input.subject };
    // O SDK do Resend tipa o payload como união discriminada (precisa de
    // html e/ou text como propriedade concreta, não "opcionalmente
    // presente" via spread condicional) — por isso o branch explícito, em
    // vez de espalhar html/text condicionalmente num único objeto.
    const { data, error } = input.html
      ? await this.client.emails.send(input.text ? { ...base, html: input.html, text: input.text } : { ...base, html: input.html })
      : await this.client.emails.send({ ...base, text: input.text as string });
    if (error) throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
    if (!data) throw new Error('Resend não retornou o id do e-mail enviado.');
    return { id: data.id };
  }
}
