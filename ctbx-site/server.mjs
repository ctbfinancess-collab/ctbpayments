// Servidor do site em produção: o mesmo servidor do Astro (adaptador Node,
// modo standalone), com uma regra antes dele: quem chega pelo domínio sem
// "www" é redirecionado (301) para https://www.ctbxpayments.com, mantendo
// o caminho. O endereço oficial do site é o www (ver src/config/site.ts).
import http from 'node:http';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const CANONICAL_HOST = 'www.ctbxpayments.com';
const BARE_HOSTS = new Set(['ctbxpayments.com']);

const server = http.createServer((req, res) => {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().split(':')[0].toLowerCase();
  if (BARE_HOSTS.has(host)) {
    res.writeHead(301, { Location: `https://${CANONICAL_HOST}${req.url || '/'}`, 'Cache-Control': 'public, max-age=3600' });
    res.end();
    return;
  }
  handler(req, res);
});

const port = Number(process.env.PORT) || 4321;
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => console.log(`Site no ar em http://${host}:${port}`));
