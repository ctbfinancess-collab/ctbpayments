import type { FastifyInstance } from 'fastify';

// Relatórios de Política de Segurança de Conteúdo (CSP) enviados pelo
// navegador do painel. Na fase de teste (Report-Only) nada é bloqueado: o
// navegador só avisa o que SERIA bloqueado, e registramos aqui para ajustar
// a política antes de aplicá-la de verdade. Gravamos só a diretiva e a
// ORIGEM do recurso (sem caminho nem parâmetros, que podem conter tokens).
const originOf = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '';
  if (/^(inline|eval|data|blob|self|wasm-eval|trusted-types-sink)$/i.test(value)) return value.toLowerCase();
  try { return new URL(value).origin; } catch { return value.split(/[/?#]/)[0]!.slice(0, 60); }
};
const pathOf = (value: unknown): string => { try { return typeof value === 'string' ? new URL(value).pathname.slice(0, 80) : ''; } catch { return ''; } };

export async function cspReportRoutes(app: FastifyInstance): Promise<void> {
  for (const type of ['application/csp-report', 'application/reports+json']) {
    app.addContentTypeParser(type, { parseAs: 'string', bodyLimit: 16 * 1024 }, (_req, body, done) => {
      try { done(null, JSON.parse(body as string)); } catch { done(null, {}); }
    });
  }
  app.post('/security/csp-report', { bodyLimit: 16 * 1024 }, async (request, reply) => {
    const body = request.body as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const items = Array.isArray(body) ? body.map((r) => (r?.body ?? {}) as Record<string, unknown>) : [((body?.['csp-report'] ?? body ?? {}) as Record<string, unknown>)];
    for (const r of items.slice(0, 20)) {
      request.log.warn({
        csp: {
          directive: String(r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive'] ?? '').slice(0, 60),
          blocked: originOf(r['blocked-uri'] ?? r.blockedURL),
          page: pathOf(r['document-uri'] ?? r.documentURL),
          disposition: String(r.disposition ?? 'report').slice(0, 10),
        },
      }, 'csp violation');
    }
    return reply.status(204).send();
  });
}
