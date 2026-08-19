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
