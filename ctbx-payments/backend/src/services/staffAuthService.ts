import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { renderStaffInviteTemplate } from '../emails/staffAndKycTemplates.js';
import { ApiError } from '../errors/ApiError.js';
import type { EmailProvider } from '../providers/EmailProvider.js';
import type { StaffRepository, StaffRole, StaffUserRecord } from '../repositories/StaffRepository.js';
import { generateTotpSecret, openTotpSecret, otpauthUrl, sealTotpSecret, totpStep, verifyTotp } from '../security/totp.js';

// Acesso da equipe ao painel administrativo (análise de KYC).
// Regras: convite por e-mail (48 h, uso único) → senha forte → cadastro do
// autenticador (TOTP obrigatório) → login sempre em duas etapas. 5 erros
// seguidos (senha ou código) bloqueiam a conta por 15 minutos. Sessão de
// no máximo 8 horas e encerrada após 30 minutos sem uso.
export const STAFF_ROLES: StaffRole[] = ['ADMIN', 'ANALYST'];
const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
const ENROLL_TTL_MS = 15 * 60 * 1000;
const MFA_LOGIN_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const ISSUER = 'CTBX Payments (equipe)';
// Hash de verdade (de uma senha aleatória) para gastar o mesmo tempo quando o
// e-mail não existe: o tempo de resposta não revela quem é da equipe.
let dummyHash: Promise<string> | undefined;

export interface AuthenticatedStaff { id: string; name: string; email: string; role: StaffRole }
export interface StaffView extends AuthenticatedStaff { status: string; mfaEnabled: boolean; lastLoginAt: string | null; createdAt: string }

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const newToken = () => randomBytes(32).toString('hex');
const invalidLogin = () => new ApiError('STAFF_LOGIN_INVALID', 'E-mail ou senha inválidos.', { statusCode: 401 });
const lockedError = () => new ApiError('STAFF_LOCKED', 'Muitas tentativas erradas. Acesso bloqueado por 15 minutos.', { statusCode: 423 });

export function staffPasswordProblem(password: string): string | null {
  if (password.length < 12) return 'A senha precisa ter pelo menos 12 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return 'Use letras, números e pelo menos um símbolo.';
  return null;
}

export class StaffAuthService {
  constructor(
    private readonly repo: StaffRepository,
    private readonly totpKey: Buffer,
    private readonly email: EmailProvider | undefined,
    private readonly staffAppBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (totpKey.length !== 32) throw new Error('STAFF_TOTP_ENCRYPTION_KEY inválida.');
  }

  // ---- Convites e cadastro -------------------------------------------
  async invite(input: { name: string; email: string; role: string }): Promise<StaffView> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!STAFF_ROLES.includes(input.role as StaffRole)) throw new ApiError('STAFF_ROLE_INVALID', 'Perfil inválido.', { statusCode: 422 });
    if (name.length < 2) throw new ApiError('STAFF_NAME_INVALID', 'Informe o nome.', { statusCode: 422 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('STAFF_EMAIL_INVALID', 'E-mail inválido.', { statusCode: 422 });
    const now = this.now();
    let user = await this.repo.findUserByEmail(email);
    if (user && user.status !== 'INVITED') throw new ApiError('STAFF_ALREADY_EXISTS', 'Já existe um usuário da equipe com este e-mail.', { statusCode: 409 });
    if (!user) user = await this.repo.createUser({ name, email, role: input.role as StaffRole }, now);
    await this.sendInvite(user, now);
    return toView(user);
  }

  async resendInvite(staffId: string): Promise<void> {
    const user = await this.repo.findUserById(staffId);
    if (!user || user.status !== 'INVITED') throw new ApiError('STAFF_NOT_INVITED', 'Este usuário não tem convite pendente.', { statusCode: 409 });
    await this.sendInvite(user, this.now());
  }

  private async sendInvite(user: StaffUserRecord, now: Date): Promise<void> {
    if (!this.email) throw new ApiError('EMAIL_NOT_CONFIGURED', 'O envio de e-mail não está configurado.', { statusCode: 503 });
    const token = newToken();
    await this.repo.createToken(user.id, 'INVITE', hashToken(token), new Date(now.getTime() + INVITE_TTL_MS));
    const link = `${this.staffAppBaseUrl.replace(/\/$/, '')}/convite?token=${token}`;
    await this.email.send({ to: user.email, ...renderStaffInviteTemplate(user.name, link) });
  }

  // Convite aceito: define a senha e devolve o segredo do autenticador para
  // o QR code. O acesso só fica ATIVO depois de confirmar um código.
  async acceptInvite(token: string, password: string): Promise<{ enrollmentToken: string; otpauthUrl: string; secret: string }> {
    const problem = staffPasswordProblem(password);
    if (problem) throw new ApiError('STAFF_PASSWORD_WEAK', problem, { statusCode: 422 });
    const now = this.now();
    const staffId = await this.repo.consumeToken(hashToken(token), 'INVITE', now);
    if (!staffId) throw new ApiError('STAFF_INVITE_INVALID', 'Convite inválido, expirado ou já usado. Peça um novo ao administrador.', { statusCode: 400 });
    const user = await this.repo.findUserById(staffId);
    if (!user || user.status !== 'INVITED') throw new ApiError('STAFF_INVITE_INVALID', 'Convite inválido, expirado ou já usado. Peça um novo ao administrador.', { statusCode: 400 });
    const secret = generateTotpSecret();
    await this.repo.updateUser(user.id, { passwordHash: await argon2.hash(password), totpSecretEnc: sealTotpSecret(secret, this.totpKey), totpEnabledAt: null, totpLastStep: null }, now);
    const enrollmentToken = newToken();
    await this.repo.createToken(user.id, 'MFA_ENROLL', hashToken(enrollmentToken), new Date(now.getTime() + ENROLL_TTL_MS));
    return { enrollmentToken, otpauthUrl: otpauthUrl(ISSUER, user.email, secret), secret };
  }

  async confirmEnrollment(enrollmentToken: string, code: string): Promise<void> {
    const now = this.now();
    const hash = hashToken(enrollmentToken);
    const staffId = await this.repo.peekToken(hash, 'MFA_ENROLL', now);
    const user = staffId ? await this.repo.findUserById(staffId) : undefined;
    if (!user || user.status !== 'INVITED' || !user.totpSecretEnc) throw new ApiError('STAFF_ENROLL_INVALID', 'Cadastro do autenticador expirou. Peça um novo convite ao administrador.', { statusCode: 400 });
    const step = verifyTotp(openTotpSecret(user.totpSecretEnc, this.totpKey), code, now, null);
    if (step === null) throw new ApiError('STAFF_MFA_INVALID', 'Código inválido. Confira o horário do celular e tente de novo.', { statusCode: 401 });
    if (!(await this.repo.consumeToken(hash, 'MFA_ENROLL', now))) throw new ApiError('STAFF_ENROLL_INVALID', 'Cadastro do autenticador expirou. Peça um novo convite ao administrador.', { statusCode: 400 });
    await this.repo.updateUser(user.id, { status: 'ACTIVE', totpEnabledAt: now, totpLastStep: step, failedAttempts: 0, lockedUntil: null }, now);
  }

  // ---- Login em duas etapas -------------------------------------------
  async login(email: string, password: string): Promise<{ mfaToken: string; staffId: string }> {
    const now = this.now();
    const user = await this.repo.findUserByEmail(email.trim().toLowerCase());
    if (!user || user.status !== 'ACTIVE' || !user.passwordHash || !user.totpEnabledAt) {
      dummyHash ??= argon2.hash(randomBytes(16).toString('hex'));
      await argon2.verify(await dummyHash, password).catch(() => false);
      throw invalidLogin();
    }
    const passwordOk = await argon2.verify(user.passwordHash, password);
    // O bloqueio só é revelado a quem acertou a senha: para um estranho, a
    // resposta é sempre a mesma ("e-mail ou senha inválidos").
    if (user.lockedUntil && user.lockedUntil > now) { if (passwordOk) throw lockedError(); throw invalidLogin(); }
    if (!passwordOk) { await this.registerFailure(user, now); throw invalidLogin(); }
    const mfaToken = newToken();
    await this.repo.createToken(user.id, 'MFA_LOGIN', hashToken(mfaToken), new Date(now.getTime() + MFA_LOGIN_TTL_MS));
    return { mfaToken, staffId: user.id };
  }

  async verifyMfa(mfaToken: string, code: string): Promise<{ token: string; expiresAt: Date; staff: AuthenticatedStaff }> {
    const now = this.now();
    const hash = hashToken(mfaToken);
    const staffId = await this.repo.peekToken(hash, 'MFA_LOGIN', now);
    const user = staffId ? await this.repo.findUserById(staffId) : undefined;
    if (!user || user.status !== 'ACTIVE' || !user.totpSecretEnc) throw new ApiError('STAFF_MFA_EXPIRED', 'A etapa de verificação expirou. Entre novamente.', { statusCode: 401 });
    if (user.lockedUntil && user.lockedUntil > now) throw lockedError();
    const step = verifyTotp(openTotpSecret(user.totpSecretEnc, this.totpKey), code, now, user.totpLastStep);
    if (step === null) { await this.registerFailure(user, now); throw new ApiError('STAFF_MFA_INVALID', 'Código inválido.', { statusCode: 401 }); }
    if (!(await this.repo.consumeToken(hash, 'MFA_LOGIN', now))) throw new ApiError('STAFF_MFA_EXPIRED', 'A etapa de verificação expirou. Entre novamente.', { statusCode: 401 });
    await this.repo.updateUser(user.id, { totpLastStep: step, failedAttempts: 0, lockedUntil: null, lastLoginAt: now }, now);
    const token = newToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await this.repo.createSession(user.id, hashToken(token), expiresAt, now);
    return { token, expiresAt, staff: toAuthenticated(user) };
  }

  private async registerFailure(user: StaffUserRecord, now: Date): Promise<void> {
    const failures = user.failedAttempts + 1;
    await this.repo.updateUser(user.id, failures >= MAX_FAILURES ? { failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MS) } : { failedAttempts: failures }, now);
  }

  async validateSession(token: string): Promise<AuthenticatedStaff | null> {
    const now = this.now();
    const hash = hashToken(token);
    const session = await this.repo.findSession(hash);
    if (!session || session.revokedAt || session.expiresAt <= now) return null;
    if (now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS) { await this.repo.revokeSession(hash, now); return null; }
    const user = await this.repo.findUserById(session.staffId);
    if (!user || user.status !== 'ACTIVE') return null;
    await this.repo.touchSession(hash, now);
    return toAuthenticated(user);
  }

  async logout(token: string): Promise<void> {
    await this.repo.revokeSession(hashToken(token), this.now());
  }

  // ---- Gestão da equipe (só ADMIN) -------------------------------------
  async listUsers(): Promise<StaffView[]> {
    return (await this.repo.listUsers()).map(toView);
  }

  async disableUser(actor: AuthenticatedStaff, staffId: string): Promise<void> {
    if (actor.id === staffId) throw new ApiError('STAFF_SELF_DISABLE', 'Você não pode desativar o seu próprio acesso.', { statusCode: 409 });
    const user = await this.repo.findUserById(staffId);
    if (!user) throw new ApiError('STAFF_NOT_FOUND', 'Usuário não encontrado.', { statusCode: 404 });
    const now = this.now();
    await this.repo.updateUser(staffId, { status: 'DISABLED' }, now);
    await this.repo.revokeAllSessions(staffId, now);
  }
}

function toAuthenticated(u: StaffUserRecord): AuthenticatedStaff {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function toView(u: StaffUserRecord): StaffView {
  return { ...toAuthenticated(u), status: u.status, mfaEnabled: Boolean(u.totpEnabledAt), lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null, createdAt: u.createdAt.toISOString() };
}
