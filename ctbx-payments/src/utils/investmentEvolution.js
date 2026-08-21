const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Rótulos dos últimos `count` meses terminando no mês atual (ex.: Mar/26 …
// Ago/26), usados nos eixos dos gráficos de evolução/rentabilidade.
export function recentMonthLabels(count, referenceDate = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (count - 1 - index), 1);
    return `${MONTH_ABBR[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
  });
}

// Série de pontos estrutural/demonstrativa entre `start` e `end` com uma leve
// ondulação (não é uma reta perfeita), preservando a tendência real de alta
// ou baixa entre os dois valores conhecidos (aplicado vs. atual).
export function buildEvolutionSeries(start, end, steps = 6) {
  return Array.from({ length: steps }, (_, index) => {
    const t = index / (steps - 1);
    const wobble = Math.sin(t * Math.PI * 1.4) * (end - start) * 0.05;
    return start + (end - start) * t + wobble;
  });
}
