import { useEffect, useRef } from 'react';

const CHANNEL_NAME = 'leverup:scope';
const STORAGE_KEY = 'leverup:scope';

/**
 * Cross-tab scope sync. Uses BroadcastChannel where available, falls back
 * to the storage event for older browsers (Safari < 15.4 — RESEARCH.md
 * Common Pitfalls #3).
 *
 * `onChange` receives the raw token string from the other tab (e.g.,
 * "company:UUID"). The caller is responsible for parsing + validating.
 *
 * Returns a `broadcast` function the caller invokes after a local scope
 * change to notify other tabs.
 */
export function useScopeBroadcast(onChange: (token: string) => void) {
  const onChangeRef = useRef(onChange);
  // Keep the latest callback without re-binding listeners
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    const broadcastSupported = 'BroadcastChannel' in window;

    if (broadcastSupported) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      const handleMessage = (e: MessageEvent) => {
        if (typeof e.data === 'string') onChangeRef.current(e.data);
      };
      channel.addEventListener('message', handleMessage);

      return () => {
        channel?.removeEventListener('message', handleMessage);
        channel?.close();
      };
    }

    // Fallback: storage event (fires across tabs but not within same tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        const token = parsed?.state?.scopeToken;
        if (typeof token === 'string') onChangeRef.current(token);
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  function broadcast(token: string) {
    if (typeof window === 'undefined') return;
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage(token);
      ch.close();
    }
    // The storage event fires automatically when Zustand persists, so we
    // don't need to manually re-write localStorage here. The caller's
    // setPersistedToken() in the store handles that path.
  }

  return { broadcast };
}
