import { useCallback, useEffect, useRef, useState } from 'react';
export default function useAsyncAction(action) {
  const mounted = useRef(true); const running = useRef(false); const [state, setState] = useState({ error: null, loading: false });
  useEffect(() => () => { mounted.current = false; }, []);
  const execute = useCallback(async (...args) => { if (running.current) return undefined; running.current = true; if (mounted.current) setState({ error: null, loading: true }); try { return await action(...args); } catch (error) { if (mounted.current) setState({ error, loading: false }); throw error; } finally { running.current = false; if (mounted.current) setState((current) => ({ ...current, loading: false })); } }, [action]);
  const reset = useCallback(() => setState({ error: null, loading: false }), []);
  return { ...state, execute, reset };
}
