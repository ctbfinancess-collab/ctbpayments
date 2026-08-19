import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Carrega variáveis de um .env.local simples (KEY=VALUE por linha) direto em
// process.env, sem nenhuma dependência externa. Nunca sobrescreve uma
// variável já definida no ambiente real (env do processo sempre vence) e
// nunca loga chave nem valor.
function applyEnvFile(path: string): void {
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return; // arquivo não existe — normal fora do ambiente local do dev.
  }
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Only used in dev/test: production must receive real environment
// variables from the deployment platform, never from a checked-out file.
export function loadLocalEnvFiles(nodeEnv: string | undefined = process.env.NODE_ENV): void {
  if (nodeEnv === 'production') return;
  const here = dirname(fileURLToPath(import.meta.url));
  applyEnvFile(resolve(here, '../../.env.local')); // backend/.env.local (overrides específicos do backend)
  applyEnvFile(resolve(here, '../../../.env.local')); // .env.local na raiz do projeto Expo
}
