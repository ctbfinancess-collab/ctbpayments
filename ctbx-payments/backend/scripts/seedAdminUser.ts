// Cria (ou atualiza a senha de) um usuário admin. Não roda automaticamente
// em nenhum lugar — é uma ferramenta manual para depois que DATABASE_URL
// existir. Lê tudo de variáveis de ambiente, nunca de argumento de linha de
// comando (evita a senha ficar no histórico do shell) e nunca imprime a
// senha nem o hash.
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { loadLocalEnvFiles } from '../src/config/loadLocalEnv.js';
import { createDbConnection } from '../src/db/client.js';
import { adminUsers } from '../src/db/schema/index.js';

loadLocalEnvFiles();

const name = process.env.ADMIN_SEED_NAME;
const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!name || !email || !password) {
  throw new Error('Defina ADMIN_SEED_NAME, ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD no ambiente antes de rodar este script.');
}
if (password.length < 12) {
  throw new Error('ADMIN_SEED_PASSWORD precisa ter pelo menos 12 caracteres.');
}
if (!databaseUrl) {
  throw new Error('Defina DATABASE_URL antes de rodar este script.');
}

const { db, close } = createDbConnection(databaseUrl);
try {
  const passwordHash = await argon2.hash(password);
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing) {
    await db.update(adminUsers).set({ name, passwordHash, active: true, updatedAt: new Date() }).where(eq(adminUsers.id, existing.id));
    console.log(`Admin atualizado: ${email}`);
  } else {
    await db.insert(adminUsers).values({ name, email, passwordHash, role: 'admin', active: true });
    console.log(`Admin criado: ${email}`);
  }
} finally {
  await close();
}
