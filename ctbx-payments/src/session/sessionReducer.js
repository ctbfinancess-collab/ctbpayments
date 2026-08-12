export const initialSessionState = {
  status: 'loading', user: null, account: null, accessToken: null, refreshToken: null,
  device: null, lastActivity: null, demoMode: true,
};

export function sessionReducer(state, action) {
  switch (action.type) {
    case 'RESTORE': return action.payload ? { ...state, ...action.payload, status: 'authenticated' } : { ...state, status: 'unauthenticated' };
    case 'AUTHENTICATED': return { ...state, ...action.payload, status: 'authenticated', lastActivity: Date.now() };
    case 'ACTIVITY': return { ...state, lastActivity: Date.now() };
    case 'LOGOUT': return { ...initialSessionState, status: 'unauthenticated', demoMode: action.demoMode };
    default: return state;
  }
}
