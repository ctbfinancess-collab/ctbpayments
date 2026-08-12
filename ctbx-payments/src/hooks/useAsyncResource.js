import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAsyncResource(loader, initialData = null) {
  const mounted = useRef(true);
  const [state, setState] = useState({ data: initialData, error: null, loading: true });
  const execute = useCallback(async () => {
    setState((current) => ({ ...current, error: null, loading: true }));
    try {
      const data = await loader();
      if (mounted.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (mounted.current) setState((current) => ({ ...current, error, loading: false }));
    }
  }, [loader]);
  useEffect(() => { mounted.current = true; execute(); return () => { mounted.current = false; }; }, [execute]);
  return { ...state, retry: execute };
}
