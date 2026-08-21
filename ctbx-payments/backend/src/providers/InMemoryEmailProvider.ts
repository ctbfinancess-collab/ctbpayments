import { randomUUID } from 'node:crypto';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './EmailProvider.js';

export interface SentEmailRecord extends SendEmailInput {
  id: string;
  sentAt: Date;
}

// Fallback/testes — mesmo papel de todo InMemoryX deste backend: nunca
// bate numa API externa de verdade, só guarda o que "enviaria" pra quem
// quiser inspecionar (testes) ou pra dev local sem RESEND_API_KEY. Nunca
// usado em produção — ver createEmailProvider.
export class InMemoryEmailProvider implements EmailProvider {
  readonly sent: SentEmailRecord[] = [];

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const record: SentEmailRecord = { ...input, id: `mock_email_${randomUUID()}`, sentAt: new Date() };
    this.sent.push(record);
    return { id: record.id };
  }
}
