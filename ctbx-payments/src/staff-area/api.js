import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { env } from '../config';

// Painel da equipe: cliente HTTP e sessão. A sessão fica só no
// sessionStorage (some ao fechar a aba) e expira no servidor após 30
// minutos sem uso ou 8 horas no máximo.
const KEY = 'ctbx_staff_session';

export async function staffApi(path, { method = 'GET', body, token, raw = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${env.apiBaseUrl.replace(/\/$/, '')}/v1/staff${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw Object.assign(new Error('Sem conexão com o servidor.'), { code: 'NETWORK_ERROR' });
  }
  if (raw && res.ok) return res;
  if (res.status === 204) return null;
  let json = null;
  try { json = await res.json(); } catch { /* sem corpo */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || 'Não foi possível concluir.'), { code: json?.error?.code || 'API_ERROR', status: res.status });
  return json?.data;
}

const read = () => {
  try { const s = JSON.parse(window.sessionStorage.getItem(KEY) || 'null'); return s && new Date(s.expiresAt) > new Date() ? s : null; } catch { return null; }
};
const write = (s) => { try { if (s) window.sessionStorage.setItem(KEY, JSON.stringify(s)); else window.sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

const StaffSessionContext = createContext(null);

export function StaffSessionProvider({ children }) {
  const [session, setSession] = useState(() => (typeof window !== 'undefined' ? read() : null));
  const [notice, setNotice] = useState('');
  const signIn = useCallback((s) => { write(s); setSession(s); setNotice(''); }, []);
  const signOut = useCallback(async (reason) => {
    const current = session;
    write(null); setSession(null);
    if (reason) setNotice(reason);
    if (current?.token && !reason) { try { await staffApi('/auth/logout', { method: 'POST', body: {}, token: current.token }); } catch { /* sessão local apagada mesmo assim */ } }
  }, [session]);
  // Chamada autenticada: sessão inválida/expirada → volta ao login com aviso.
  const call = useCallback(async (path, opts = {}) => {
    try { return await staffApi(path, { ...opts, token: session?.token }); }
    catch (e) {
      if (e.status === 401) await signOut('Sua sessão terminou. Entre novamente.');
      throw e;
    }
  }, [session, signOut]);
  useEffect(() => {
    if (!session) return undefined;
    const t = setInterval(() => { if (!read()) signOut('Sua sessão terminou. Entre novamente.'); }, 60_000);
    return () => clearInterval(t);
  }, [session, signOut]);
  const value = useMemo(() => ({ session, staff: session?.staff || null, signIn, signOut, call, notice, setNotice }), [session, signIn, signOut, call, notice]);
  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>;
}

export const useStaff = () => useContext(StaffSessionContext);

const MESSAGES = {
  STAFF_LOGIN_INVALID: 'E-mail ou senha inválidos.',
  STAFF_LOCKED: 'Muitas tentativas erradas. Seu acesso foi bloqueado por 15 minutos.',
  STAFF_MFA_INVALID: 'Código inválido. Confira o código atual no aplicativo autenticador.',
  STAFF_MFA_EXPIRED: 'A etapa de verificação expirou. Entre novamente.',
  STAFF_RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um minuto.',
  STAFF_INVITE_INVALID: 'Convite inválido, expirado ou já usado. Peça um novo ao administrador.',
  STAFF_ENROLL_INVALID: 'O cadastro do autenticador expirou. Peça um novo convite ao administrador.',
  STAFF_FORBIDDEN: 'Você não tem permissão para isso.',
  STAFF_ALREADY_EXISTS: 'Já existe um usuário da equipe com este e-mail.',
  STAFF_SELF_DISABLE: 'Você não pode desativar o seu próprio acesso.',
  KYC_REASON_REQUIRED: 'Explique o motivo para o cliente (de 10 a 1.000 caracteres).',
  KYC_NOT_PENDING: 'Este caso não está mais aguardando análise (outra pessoa pode já ter decidido).',
  NETWORK_ERROR: 'Sem conexão com o servidor.',
};
export const staffMessage = (e, fallback = 'Não foi possível concluir. Tente novamente.') => MESSAGES[e?.code] || e?.message || fallback;
