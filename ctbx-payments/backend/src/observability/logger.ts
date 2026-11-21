const redactPaths = [
  'req.headers.authorization', 'req.headers.cookie', 'req.headers["x-admin-token"]', 'req.body.password', 'req.body.senha',
  'req.body.otp', 'req.body.cvv', 'req.body.token', 'req.body.refreshToken',
  'req.body.pan', 'req.body.document', 'req.body.documento', 'res.headers.set-cookie',
];

export function loggerOptions(level: string, enabled = true): false | { level: string; redact: { paths: string[]; censor: string } } {
  if (!enabled) return false;
  return { level, redact: { paths: redactPaths, censor: '[REDACTED]' } };
}

const sensitiveKeys = /^(password|senha|otp|cvv|token|accessToken|refreshToken|authorization|pan|document|documento)$/i;
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sensitiveKeys.test(key) ? '[REDACTED]' : redactSensitive(entry)]));
  }
  return value;
}

export { redactPaths };

// Erros vão para o log SEM dados pessoais: mensagens do banco e do Drizzle
// costumam trazer os valores da consulta ("params: email,cpf…", "Key (email)=
// (x@y)…"). Guardamos só o tipo, o código e a mensagem limpa.
const EMAIL_RE = /[^\s@"'(),;:<>]+@[^\s@"'(),;:<>]+\.[a-z]{2,}/gi;
const LONG_DIGITS_RE = /\d[\d.\-/ ]{8,}\d/g;
export function scrubText(text: string, max = 300): string {
  const cut = text.split(/\bparams:|\bDETAIL:|Key \(/)[0] ?? '';
  return cut.replace(EMAIL_RE, '[e-mail]').replace(LONG_DIGITS_RE, '[número]').slice(0, max).trim();
}
export function safeError(error: unknown): { type: string; code?: string; message: string; stack?: string } {
  const e = (error ?? {}) as { name?: string; code?: unknown; message?: unknown; stack?: unknown; cause?: { code?: unknown } };
  const code = typeof e.code === 'string' ? e.code : typeof e.cause?.code === 'string' ? e.cause.code : undefined;
  const message = scrubText(typeof e.message === 'string' ? e.message : String(error));
  // Do rastro, só as linhas de código ("at …"): a continuação da mensagem
  // (ex.: "params: …") fica de fora.
  const frames = typeof e.stack === 'string' ? e.stack.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('at ')).slice(0, 7) : [];
  const stack = frames.length ? scrubText(frames.join(' | '), 1200) : undefined;
  return { type: e.name ?? 'Error', ...(code ? { code } : {}), message, ...(stack ? { stack } : {}) };
}
