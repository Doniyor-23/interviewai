import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async fn on mount / when deps change. Returns { data, loading, error, reload }. */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef.current()
      .then((data) => id === seq.current && setState({ data, loading: false, error: null }))
      .catch((e) => id === seq.current && setState({ data: null, loading: false, error: e }));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  return { ...state, reload: run };
}
