import type { EmailProvider } from '../providers/EmailProvider.js';

// Alertas de erro crítico por e-mail para a equipe técnica. O conteúdo
// nunca traz dados pessoais: só o ambiente, a rota (o modelo, ex.
// /v1/staff/kyc/cases/:customerId, sem os valores), o código do erro e o
// identificador da requisição para procurar no log. O mesmo problema gera
// no máximo 1 e-mail a cada 15 minutos.
export interface CriticalEvent { kind: 'REQUEST_ERROR' | 'PROCESS_ERROR'; method?: string | undefined; route?: string | undefined; statusCode?: number | undefined; code?: string | undefined; type?: string | undefined; requestId?: string | undefined }

export class CriticalAlerter {
  private readonly lastSent = new Map<string, number>();
  constructor(
    private readonly email: EmailProvider | undefined,
    private readonly recipients: string[],
    private readonly environment: string,
    private readonly now: () => Date = () => new Date(),
    private readonly throttleMs = 15 * 60 * 1000,
  ) {}

  get enabled(): boolean { return Boolean(this.email) && this.recipients.length > 0; }

  async notify(event: CriticalEvent): Promise<boolean> {
    if (!this.enabled) return false;
    const key = [event.kind, event.method, event.route, event.code, event.type].join('|');
    const t = this.now().getTime();
    const last = this.lastSent.get(key);
    if (last !== undefined && t - last < this.throttleMs) return false;
    this.lastSent.set(key, t);
    const title = event.kind === 'PROCESS_ERROR' ? 'Falha grave no servidor da API' : 'Erro interno em uma requisição';
    const lines = [
      `Ambiente: ${this.environment}`,
      `Quando: ${this.now().toISOString()}`,
      event.method || event.route ? `Rota: ${event.method ?? ''} ${event.route ?? ''}`.trim() : '',
      event.statusCode ? `Status: ${event.statusCode}` : '',
      event.code ? `Código: ${event.code}` : '',
      event.type ? `Tipo: ${event.type}` : '',
      event.requestId ? `Requisição: ${event.requestId} (procure este número nos logs do Railway)` : '',
      'Repetições do mesmo erro nos próximos 15 minutos não geram novo e-mail.',
    ].filter(Boolean);
    const text = `${title}\n\n${lines.join('\n')}`;
    const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
    const html = `<h2 style="font-family:Arial,sans-serif">${esc(title)}</h2><p style="font-family:Arial,sans-serif;line-height:1.6">${lines.map(esc).join('<br>')}</p>`;
    await Promise.all(this.recipients.map((to) => this.email!.send({ to, subject: `[CTBX · ${this.environment}] ${title}`, html, text }).catch(() => undefined)));
    return true;
  }
}

export function parseAlertRecipients(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)).slice(0, 10);
}
