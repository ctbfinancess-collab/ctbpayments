import { loadConfig } from '../src/config/env.js';
import { createDbConnection } from '../src/db/client.js';
import { createEmailProvider } from '../src/providers/createEmailProvider.js';
import { PostgresStaffRepository } from '../src/repositories/StaffRepository.js';
import { PostgresSecurityAuditRepository } from '../src/repositories/SecurityAuditRepository.js';
import { StaffAuthService } from '../src/services/staffAuthService.js';
import { parseEncryptionKey } from '../src/storage/EncryptedDocumentVault.js';

// EMERGÊNCIA: redefine o acesso de um membro da equipe quando nenhum
// administrador consegue entrar no painel (ex.: o único administrador
// perdeu o celular do autenticador). No dia a dia, use o painel (Equipe →
// "Redefinir acesso"), que exige outro administrador e o código dele.
// Uso (dentro do servidor): node dist/scripts/resetStaffAccess.js --email x@y --reason "motivo com 10+ caracteres"
// Efeito: senha e autenticador antigos deixam de valer, sessões encerradas,
// link de 24 h para a pessoa, aviso a todos os administradores e registro
// STAFF_USER_ACCESS_RESET_CLI na auditoria.
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; };
const email = arg('email'); const reason = arg('reason');
if (!email || !reason) { console.error('Uso: --email <e-mail> --reason "<motivo>"'); process.exit(1); }

const config = loadConfig();
const key = parseEncryptionKey(config.staff?.totpEncryptionKey);
if (!config.databaseUrl || !key || !config.staff?.appBaseUrl) { console.error('Faltam DATABASE_URL, STAFF_TOTP_ENCRYPTION_KEY ou STAFF_APP_BASE_URL.'); process.exit(1); }
const { db, close } = createDbConnection(config.databaseUrl);
try {
  const repo = new PostgresStaffRepository(db);
  const email$ = createEmailProvider({ nodeEnv: config.nodeEnv, resendApiKey: config.resendApiKey, emailFrom: config.emailFrom });
  const service = new StaffAuthService(repo, key, email$, config.staff.appBaseUrl);
  const { staffId, notifiedAdmins, linkEmailed } = await service.emergencyResetAccess(email, reason);
  await new PostgresSecurityAuditRepository(db).record({ event: 'STAFF_USER_ACCESS_RESET_CLI', outcome: 'SUCCESS', staffId, details: { reason: reason.trim().slice(0, 500), linkEmailed } });
  console.log(linkEmailed ? `Acesso redefinido. A pessoa recebeu um link de 24 horas; ${notifiedAdmins} administrador(es) avisado(s).` : 'Acesso redefinido, mas o e-mail com o link falhou: reenvie o convite (inviteStaff).');
} catch (error) {
  console.error('Falhou:', (error as Error).message);
  process.exitCode = 1;
} finally {
  await close();
}
