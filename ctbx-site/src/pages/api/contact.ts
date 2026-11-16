import type { APIRoute } from 'astro';
import { confirmationEmail } from '../../lib/confirmationEmail';
import { site } from '../../config/site';

/**
 * Envio do formulário de Contato (roda no servidor, nunca no navegador).
 *
 * Fluxo: 1) avisa a equipe (CONTACT_TO_EMAIL), com "responder para" o visitante;
 *        2) se deu certo, manda ao visitante uma confirmação automática
 *           (no máximo 1 por e-mail a cada 24 h, sem repetir nada do que ele digitou).
 *
 * Variáveis de ambiente (veja .env.example):
 *   RESEND_API_KEY      chave do Resend (só "Sending access")
 *   CONTACT_FROM_EMAIL  remetente em domínio verificado no Resend
 *   CONTACT_TO_EMAIL    caixa(s) que recebem as mensagens, separadas por vírgula
 * Sem elas, responde 503 e o site avisa que o envio está sendo configurado.
 *
 * Proteções: validação no servidor, honeypot, limite por IP, escape de HTML,
 * bloqueio de envios vindos de outros sites e tamanho máximo dos campos.
 */
export const prerender = false;

const MAX = { name: 120, email: 160, phone: 30, subject: 120, message: 3000 };
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

// Limite por IP (memória do processo): 5 envios a cada 10 minutos.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((ts) => now - ts < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

// Confirmação ao visitante: no máximo 1 por endereço a cada 24 h.
const CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;
const confirmed = new Map<string, number>();
function shouldConfirm(email: string) {
  const key = email.toLowerCase();
  const now = Date.now();
  const last = confirmed.get(key);
  if (last && now - last < CONFIRM_WINDOW_MS) return false;
  confirmed.set(key, now);
  if (confirmed.size > 5000) confirmed.clear();
  return true;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Lê a variável em tempo de execução, removendo espaços/aspas extras. */
const env = (key: string): string | undefined => {
  const raw = process.env[key] ?? (import.meta.env[key] as string | undefined);
  if (raw == null) return undefined;
  const v = raw.trim().replace(/^(['"])(.*)\1$/s, '$2').trim();
  return v || undefined;
};

async function sendEmail(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend ${res.status} ${await res.text().catch(() => '')}`);
}

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  // Bloqueia envios disparados por outros sites. Atrás do proxy do Railway,
  // url.host é o endereço interno; por isso também aceitamos o Host público
  // (x-forwarded-host / host) e o domínio oficial do site (com e sem www).
  const origin = request.headers.get('origin');
  if (origin) {
    const official = new URL(env('SITE_URL') ?? site.url).host.replace(/^www\./, '');
    const allowed = new Set(
      [url.host, request.headers.get('x-forwarded-host'), request.headers.get('host'), official, `www.${official}`]
        .filter(Boolean)
        .map((h) => String(h).split(',')[0].trim().toLowerCase()),
    );
    let originHost = '';
    try { originHost = new URL(origin).host.toLowerCase(); } catch { /* origem inválida */ }
    if (!allowed.has(originHost)) return json(403, { ok: false, error: 'forbidden' });
  }

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_body' });
  }
  const field = (k: keyof typeof MAX) => String(data[k] ?? '').trim().slice(0, MAX[k]);

  // Honeypot preenchido → robô. Responde "ok" sem enviar nada.
  if (String(data.website ?? '').trim() !== '') return json(200, { ok: true });

  const name = field('name');
  const email = field('email');
  const phone = field('phone');
  const subject = field('subject').replace(/[\r\n]+/g, ' ');
  const message = field('message');
  const lang = data.lang === 'en' ? 'en' : 'pt';
  if (!name || !subject || !message || data.consent !== true || !EMAIL_RE.test(email)) {
    return json(422, { ok: false, error: 'validation' });
  }

  let ip = 'unknown';
  try { ip = clientAddress; } catch { /* indisponível em alguns ambientes */ }
  if (rateLimited(ip)) return json(429, { ok: false, error: 'rate_limited' });

  const apiKey = env('RESEND_API_KEY');
  const from = env('CONTACT_FROM_EMAIL');
  const to = env('CONTACT_TO_EMAIL');
  if (!apiKey || !from || !to) {
    console.warn('[contact] Resend não configurado (RESEND_API_KEY / CONTACT_FROM_EMAIL / CONTACT_TO_EMAIL).');
    return json(503, { ok: false, error: 'not_configured' });
  }
  const toList = to.split(',').map((s) => s.trim()).filter(Boolean);

  // 1) Aviso para a equipe
  const rows: [string, string][] = [
    ['Nome', name],
    ['E-mail', email],
    ['Telefone', phone || '—'],
    ['Assunto', subject],
    ['Idioma', lang.toUpperCase()],
    ['Consentimento LGPD', 'Sim'],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0B1C33;max-width:640px">
      <h2 style="margin:0 0 16px">Nova mensagem — site CTBX Payments</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows.map(([k, v]) => `<tr><td style="color:#55657C"><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`).join('')}
      </table>
      <p style="white-space:pre-wrap;border-top:1px solid #DCE2EB;padding-top:16px">${escapeHtml(message)}</p>
      <p style="color:#7E8DA3;font-size:12px;margin-top:16px">Responda este e-mail para falar diretamente com o remetente.</p>
    </div>`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${message}`;

  try {
    await sendEmail(apiKey, { from, to: toList, reply_to: email, subject: `[Site CTBX Payments] ${subject}`, html, text });
  } catch (err) {
    console.error('[contact] Resend respondeu', String(err));
    return json(502, { ok: false, error: 'send_failed' });
  }

  // 2) Confirmação ao visitante. Uma falha aqui não afeta a resposta:
  //    a mensagem já chegou à equipe.
  if (shouldConfirm(email)) {
    try {
      // Imagens do e-mail sempre do domínio oficial (nunca localhost).
      const c = confirmationEmail(lang, env('SITE_URL') ?? site.url);
      await sendEmail(apiKey, { from, to: [email], reply_to: toList[0], subject: c.subject, html: c.html, text: c.text });
    } catch (err) {
      console.error('[contact] Falha na confirmação automática', String(err));
    }
  }

  return json(200, { ok: true });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'method_not_allowed' });
