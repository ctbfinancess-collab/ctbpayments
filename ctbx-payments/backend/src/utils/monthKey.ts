// Mês no fuso de Brasília (\"2026-11\"): os indicadores do painel agrupam
// por mês como a equipe enxerga, não em UTC.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' });
export function monthKey(d: Date): string {
  const parts = fmt.formatToParts(d);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}

// Os últimos N meses (fuso de Brasília), do mais antigo ao atual: "2026-11".
export function lastMonths(now: Date, n: number): string[] {
  const [y, m] = monthKey(now).split('-').map(Number) as [number, number];
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) { const t = (y * 12 + (m - 1)) - i; out.push(`${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`); }
  return out;
}
