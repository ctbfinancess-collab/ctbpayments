// Consulta pública do CNPJ na base da Receita Federal (via BrasilAPI). Usada
// SÓ na análise da equipe, para comparar com o que o cliente informou
// (situação cadastral, razão social, sócios). Falha nunca bloqueia nada:
// a análise mostra "consulta indisponível".
export interface CnpjLookupResult {
  ok: boolean;
  situacao?: string | undefined;
  razaoSocial?: string | undefined;
  nomeFantasia?: string | undefined;
  abertura?: string | undefined;
  naturezaJuridica?: string | undefined;
  atividadePrincipal?: string | undefined;
  municipio?: string | undefined;
  uf?: string | undefined;
  socios?: string[];
  error?: string | undefined;
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function lookupCnpj(cnpj: string, fetchImpl: FetchLike = fetch as unknown as FetchLike, timeoutMs = 6000): Promise<CnpjLookupResult> {
  try {
    const res = await fetchImpl(`https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, '')}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 404) return { ok: false, error: 'CNPJ não encontrado na Receita Federal.' };
    if (!res.ok) return { ok: false, error: 'Consulta à Receita indisponível no momento.' };
    const j = (await res.json()) as Record<string, unknown>;
    const s = (k: string) => (typeof j[k] === 'string' && j[k] ? (j[k] as string) : undefined);
    const qsa = Array.isArray(j.qsa) ? (j.qsa as Array<Record<string, unknown>>).map((q) => String(q.nome_socio ?? '')).filter(Boolean) : [];
    return {
      ok: true, situacao: s('descricao_situacao_cadastral'), razaoSocial: s('razao_social'), nomeFantasia: s('nome_fantasia'), abertura: s('data_inicio_atividade'),
      naturezaJuridica: s('natureza_juridica'), atividadePrincipal: [j.cnae_fiscal, s('cnae_fiscal_descricao')].filter(Boolean).join(' — ') || undefined,
      municipio: s('municipio'), uf: s('uf'), socios: qsa,
    };
  } catch {
    return { ok: false, error: 'Consulta à Receita indisponível no momento.' };
  }
}
