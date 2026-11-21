import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { renderStaffAccessResetNoticeTemplate, renderStaffAccessResetTemplate, renderStaffInviteTemplate, renderStaffPasswordChangedTemplate, renderStaffPasswordResetTemplate } from '../emails/staffAndKycTemplates.js';
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
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const ACCESS_RESET_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 2 * 60 * 1000;
const ISSUER = 'CTBX Payments (equipe)';
// Hash de verdade (de uma senha aleatória) para gastar o mesmo tempo quando o
// e-mail não existe: o tempo de resposta não revela quem é da equipe.
let dummyHash: Promise<string> | undefined;

export interface AuthenticatedStaff { id: string; name: string; email: string; role: StaffRole }
export interface StaffView extends AuthenticatedStaff { status: string; mfaEnabled: boolean; lastLoginAt: string | null; createdAt: string }

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const newToken = () => randomBytes(32).toString('hex');
const invalidLogin = () => new ApiError('STAFF_LOGIN_INVALID', 'E-mail ou senha inválidos.', { statusCode: 401 });
const resetInvalid = () => new ApiError('STAFF_RESET_INVALID', 'Link inválido, expirado ou já usado. Peça um novo em "Esqueci minha senha".', { statusCode: 400 });
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
    const failures = await this.repo.incrementFailures(user.id, now);
    if (failures >= MAX_FAILURES) await this.repo.updateUser(user.id, { failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MS) }, now);
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

  // ---- Recuperação de acesso -------------------------------------------
  // Senha esquecida (o celular com o autenticador continua com a pessoa):
  // link de uso único por e-mail (30 min) + código do autenticador para
  // concluir. A resposta é sempre a mesma, exista ou não o e-mail.
  async requestPasswordReset(email: string): Promise<{ staffId: string | null }> {
    const now = this.now();
    const user = await this.repo.findUserByEmail(email.trim().toLowerCase());
    if (!user || user.status !== 'ACTIVE' || !user.totpEnabledAt || !this.email) return { staffId: user?.id ?? null };
    // Todo o trabalho (link e e-mail) acontece DEPOIS da resposta: o tempo de
    // resposta não revela se o e-mail é da equipe.
    this.pendingWork = this.issuePasswordReset(user, now).catch(() => undefined);
    return { staffId: user.id };
  }

  // Só para os testes aguardarem o trabalho em segundo plano.
  pendingWork: Promise<unknown> = Promise.resolve();

  private async issuePasswordReset(user: StaffUserRecord, now: Date): Promise<void> {
    // Intervalo mínimo de 2 minutos entre links para a mesma pessoa: um
    // estranho que conhece o e-mail não consegue ficar cancelando o link
    // válido nem encher a caixa de entrada.
    const last = await this.repo.latestTokenCreatedAt(user.id, 'PASSWORD_RESET');
    if (last && now.getTime() - last.getTime() < RESET_COOLDOWN_MS) return;
    await this.repo.invalidateTokens(user.id, now, 'PASSWORD_RESET');
    const token = newToken();
    await this.repo.createToken(user.id, 'PASSWORD_RESET', hashToken(token), new Date(now.getTime() + PASSWORD_RESET_TTL_MS));
    const link = `${this.staffAppBaseUrl.replace(/\/$/, '')}/redefinir-senha?token=${token}`;
    await this.email!.send({ to: user.email, ...renderStaffPasswordResetTemplate(user.name, link) });
  }

  async resetPassword(token: string, password: string, code: string): Promise<{ staffId: string }> {
    const problem = staffPasswordProblem(password);
    if (problem) throw new ApiError('STAFF_PASSWORD_WEAK', problem, { statusCode: 422 });
    const now = this.now();
    const hash = hashToken(token);
    const staffId = await this.repo.peekToken(hash, 'PASSWORD_RESET', now);
    const user = staffId ? await this.repo.findUserById(staffId) : undefined;
    if (!user || user.status !== 'ACTIVE' || !user.totpSecretEnc) throw resetInvalid();
    if (user.lockedUntil && user.lockedUntil > now) throw lockedError();
    const step = verifyTotp(openTotpSecret(user.totpSecretEnc, this.totpKey), code, now, user.totpLastStep);
    if (step === null) { await this.registerFailure(user, now); throw new ApiError('STAFF_MFA_INVALID', 'Código inválido.', { statusCode: 401 }); }
    // Grava já o código usado: ele não vale de novo nem num login simultâneo.
    await this.repo.updateUser(user.id, { totpLastStep: step }, now);
    if (!(await this.repo.consumeToken(hash, 'PASSWORD_RESET', now))) throw resetInvalid();
    await this.repo.updateUser(user.id, { passwordHash: await argon2.hash(password), totpLastStep: step, failedAttempts: 0, lockedUntil: null }, now);
    await this.repo.revokeAllSessions(user.id, now);
    await this.repo.invalidateTokens(user.id, now);
    if (this.email) await this.email.send({ to: user.email, ...renderStaffPasswordChangedTemplate(user.name) }).catch(() => undefined);
    return { staffId: user.id };
  }

  // Celular do autenticador perdido (ou senha e celular): só outro
  // administrador redefine, confirmando com o PRÓPRIO código (verificação
  // reforçada) e informando o motivo. A senha e o autenticador antigos
  // deixam de valer, as sessões caem, a pessoa recebe um link para criar o
  // acesso de novo e todos os administradores são avisados.
  async resetAccess(actor: AuthenticatedStaff, staffId: string, reason: string, actorCode: string): Promise<{ notifiedAdmins: number; linkEmailed: boolean }> {
    if (actor.id === staffId) throw new ApiError('STAFF_SELF_RESET', 'Você não pode redefinir o seu próprio acesso. Peça a outro administrador.', { statusCode: 409 });
    const why = reason.trim();
    if (why.length < 10 || why.length > 500) throw new ApiError('STAFF_REASON_REQUIRED', 'Explique o motivo (de 10 a 500 caracteres).', { statusCode: 422 });
    if (!this.email) throw new ApiError('EMAIL_NOT_CONFIGURED', 'O envio de e-mail não está configurado.', { statusCode: 503 });
    const now = this.now();
    const admin = await this.repo.findUserById(actor.id);
    if (!admin || admin.status !== 'ACTIVE' || admin.role !== 'ADMIN' || !admin.totpSecretEnc) throw new ApiError('STAFF_FORBIDDEN', 'Apenas administradores podem fazer isto.', { statusCode: 403 });
    if (admin.lockedUntil && admin.lockedUntil > now) throw lockedError();
    const step = verifyTotp(openTotpSecret(admin.totpSecretEnc, this.totpKey), actorCode, now, admin.totpLastStep);
    if (step === null) {
      await this.registerFailure(admin, now);
      throw new ApiError('STAFF_STEPUP_INVALID', 'O seu código de verificação está incorreto.', { statusCode: 422 });
    }
    await this.repo.updateUser(admin.id, { totpLastStep: step, failedAttempts: 0 }, now);
    const target = await this.repo.findUserById(staffId);
    if (!target) throw new ApiError('STAFF_NOT_FOUND', 'Usuário não encontrado.', { statusCode: 404 });
    return this.applyAccessReset(target, admin.name, why, now);
  }

  // Emergência (nenhum administrador consegue entrar): só pelo comando no
  // servidor (scripts/resetStaffAccess.ts), que também grava na auditoria.
  async emergencyResetAccess(email: string, reason: string): Promise<{ staffId: string; notifiedAdmins: number; linkEmailed: boolean }> {
    const why = reason.trim();
    if (why.length < 10 || why.length > 500) throw new ApiError('STAFF_REASON_REQUIRED', 'Explique o motivo (de 10 a 500 caracteres).', { statusCode: 422 });
    if (!this.email) throw new ApiError('EMAIL_NOT_CONFIGURED', 'O envio de e-mail não está configurado.', { statusCode: 503 });
    const target = await this.repo.findUserByEmail(email.trim().toLowerCase());
    if (!target) throw new ApiError('STAFF_NOT_FOUND', 'Usuário não encontrado.', { statusCode: 404 });
    const result = await this.applyAccessReset(target, 'O suporte técnico (comando de emergência no servidor)', why, this.now());
    return { staffId: target.id, ...result };
  }

  private async applyAccessReset(target: StaffUserRecord, actorName: string, why: string, now: Date): Promise<{ notifiedAdmins: number; linkEmailed: boolean }> {
    if (target.status !== 'ACTIVE') throw new ApiError('STAFF_RESET_NOT_ALLOWED', target.status === 'INVITED' ? 'Este acesso ainda não foi ativado: use "Reenviar convite".' : 'Este acesso está desativado.', { statusCode: 409 });
    await this.repo.updateUser(target.id, { status: 'INVITED', passwordHash: null, totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, failedAttempts: 0, lockedUntil: null }, now);
    await this.repo.revokeAllSessions(target.id, now);
    await this.repo.invalidateTokens(target.id, now);
    const token = newToken();
    await this.repo.createToken(target.id, 'INVITE', hashToken(token), new Date(now.getTime() + ACCESS_RESET_TTL_MS));
    const link = `${this.staffAppBaseUrl.replace(/\/$/, '')}/convite?token=${token}`;
    // Se o e-mail falhar, a redefinição já valeu (acesso antigo bloqueado):
    // informamos isso em vez de devolver erro; "Reenviar convite" resolve.
    const linkEmailed = await this.email!.send({ to: target.email, ...renderStaffAccessResetTemplate(target.name, link) }).then(() => true, () => false);
    const admins = (await this.repo.listUsers()).filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE' && u.id !== target.id);
    const notice = renderStaffAccessResetNoticeTemplate(target.name, actorName, why);
    await Promise.all(admins.map((a) => this.email!.send({ to: a.email, ...notice }).catch(() => undefined)));
    return { notifiedAdmins: admins.length, linkEmailed };
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
