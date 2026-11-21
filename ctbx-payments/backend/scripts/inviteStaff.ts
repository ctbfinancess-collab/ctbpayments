import { loadConfig } from '../src/config/env.js';
import { createDbConnection } from '../src/db/client.js';
import { createEmailProvider } from '../src/providers/createEmailProvider.js';
import { PostgresStaffRepository } from '../src/repositories/StaffRepository.js';
import { PostgresSecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { StaffAuthService } from '../src/services/staffAuthService.js';
import { parseEncryptionKey } from '../src/storage/EncryptedDocumentVault.js';

// Cria (ou reenvia) o convite de um usuário da equipe — usado para o
// PRIMEIRO administrador, que ainda não tem como convidar pelo painel.
// Uso (dentro do servidor): node dist/scripts/inviteStaff.js --email x@y --name "Nome" --role ADMIN
// O e-mail recebe o link; a senha é criada pela própria pessoa.
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; };
const email = arg('email'); const name = arg('name'); const role = arg('role') ?? 'ADMIN';
if (!email || !name) { console.error('Uso: --email <e-mail> --name "<nome>" [--role ADMIN|ANALYST]'); process.exit(1); }

const config = loadConfig();
const key = parseEncryptionKey(config.staff?.totpEncryptionKey);
if (!config.databaseUrl || !key || !config.staff?.appBaseUrl) { console.error('Faltam DATABASE_URL, STAFF_TOTP_ENCRYPTION_KEY ou STAFF_APP_BASE_URL.'); process.exit(1); }
const { db, close } = createDbConnection(config.databaseUrl);
try {
  const repo = new PostgresStaffRepository(db);
  const email$ = createEmailProvider({ nodeEnv: config.nodeEnv, resendApiKey: config.resendApiKey, emailFrom: config.emailFrom });
  const service = new StaffAuthService(repo, key, email$, config.staff.appBaseUrl);
  const user = await service.invite({ name, email, role });
  await new PostgresSecurityAuditRepository(db).record({ event: 'STAFF_USER_INVITE_CLI', outcome: 'SUCCESS', staffId: user.id, details: { role: user.role } });
  console.log(`Convite enviado (perfil ${user.role}). O link vale por 48 horas.`);
} catch (error) {
  console.error('Falhou:', (error as Error).message);
  process.exitCode = 1;
} finally {
  await close();
}
