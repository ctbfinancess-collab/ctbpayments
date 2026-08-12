import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { isDemoMode } from '../config';
import * as authService from '../services/authService';
import { clearSession, readSession, writeSession } from './sessionStorage';
import { initialSessionState, sessionReducer } from './sessionReducer';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, { ...initialSessionState, demoMode: isDemoMode });
  useEffect(() => { readSession().then((session) => dispatch({ type: 'RESTORE', payload: session })).catch(() => dispatch({ type: 'RESTORE', payload: null })); }, []);
  const login = useCallback(async (credentials) => {
    const session = await authService.login(credentials);
    await writeSession(session);
    dispatch({ type: 'AUTHENTICATED', payload: session });
    return session;
  }, []);
  const logout = useCallback(async () => {
    await authService.logout();
    await clearSession();
    dispatch({ type: 'LOGOUT', demoMode: isDemoMode });
  }, []);
  const touch = useCallback(() => dispatch({ type: 'ACTIVITY' }), []);
  const value = useMemo(() => ({ ...state, login, logout, touch }), [state, login, logout, touch]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
