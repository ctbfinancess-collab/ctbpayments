// Mês no fuso de Brasília (\"2026-11\"): os indicadores do painel agrupam
// por mês como a equipe enxerga, não em UTC.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' });
export function monthKey(d: Date): string {
  const parts = fmt.formatToParts(d);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}
