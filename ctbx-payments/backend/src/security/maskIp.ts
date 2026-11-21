// Etapa B do painel: analistas veem só a parte inicial do IP (rede/provedor),
// suficiente para notar padrões; o IP completo fica para administradores.
// IPv4: 189.45.•••.•••  |  IPv6: 2804:14c:•••  |  IPv4 mapeado em IPv6 é
// tratado como IPv4.
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v = ip.trim().replace(/^::ffff:/i, '');
  const v4 = v.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) return `${v4[1]}.${v4[2]}.•••.•••`;
  if (v.includes(':')) { const parts = v.split(':').filter(Boolean).slice(0, 2); return parts.length ? `${parts.join(':')}:•••` : '•••'; }
  return '•••';
}
