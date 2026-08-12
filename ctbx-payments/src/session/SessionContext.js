import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { configureApiClient } from '../api';
import { isDemoMode, isSandboxMode } from '../config';
import * as authService from '../services/authService';
import { clearSession, readSession, writeSession } from './sessionStorage';
import { initialSessionState, sessionReducer } from './sessionReducer';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, { ...initialSessionState, demoMode: isDemoMode, sandboxMode: isSandboxMode });
  const sessionRef = useRef(null);
  useEffect(() => {
    readSession().then((session) => {
      sessionRef.current = session;
      dispatch({ type: 'RESTORE', payload: session });
    }).catch(() => dispatch({ type: 'RESTORE', payload: null }));
  }, []);
  const clearLocalSession = useCallback(async () => {
    sessionRef.current = null;
    await clearSession();
    dispatch({ type: 'LOGOUT', demoMode: isDemoMode, sandboxMode: isSandboxMode });
  }, []);
  const refresh = useCallback(async () => {
    try {
      const session = await authService.refreshSession(sessionRef.current);
      sessionRef.current = session;
      await writeSession(session);
      dispatch({ type: 'AUTHENTICATED', payload: session });
      return session;
    } catch (error) {
      await clearLocalSession();
      throw error;
    }
  }, [clearLocalSession]);
  useEffect(() => {
    configureApiClient({
      getAccessToken: () => sessionRef.current?.accessToken || null,
      getDeviceId: () => sessionRef.current?.deviceId || sessionRef.current?.device?.id || null,
      onUnauthorized: refresh,
      onSessionInvalid: clearLocalSession,
    });
    return () => configureApiClient();
  }, [clearLocalSession, refresh]);
  const login = useCallback(async (credentials) => {
    const session = await authService.login(credentials);
    sessionRef.current = session;
    await writeSession(session);
    dispatch({ type: 'AUTHENTICATED', payload: session });
    return session;
  }, []);
  const logout = useCallback(async () => {
    try { await authService.logout(sessionRef.current); }
    finally { await clearLocalSession(); }
  }, [clearLocalSession]);
  const touch = useCallback(() => dispatch({ type: 'ACTIVITY' }), []);
  const value = useMemo(() => ({ ...state, login, logout, refresh, touch }), [state, login, logout, refresh, touch]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
