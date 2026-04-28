import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  loadCardPreferences,
  saveCardPreferences,
  type CardPreferences,
} from "@/lib/hiring/cardCustomization";

/**
 * Plan 02-06 — D-08 hook React para card customization (TAL-07 / RS-13).
 *
 * Wraps `loadCardPreferences` / `saveCardPreferences` (Plan 02-03 lib) com:
 *   - useState inicial via load síncrono no primeiro render
 *   - useEffect de sync entre tabs (`storage` event listener) — toggle em outra
 *     tab atualiza este componente também
 *   - Reset on userId change (logout / view-as-role troca de usuário)
 *
 * Persistência: localStorage namespaced `leverup:rs:card-fields:{userId}`
 * (chave gerenciada por `cardCustomization.ts`). Sem userId → DEFAULT em memória,
 * sem persistência (UI continua funcionando para usuário não autenticado).
 *
 * Returns tuple [prefs, setPrefs] estilo useState. setPrefs persiste em
 * localStorage automaticamente (silent fail se quota cheia).
 */
export function useCardPreferences(): [
  CardPreferences,
  (next: CardPreferences) => void,
] {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [prefs, setPrefs] = useState<CardPreferences>(() =>
    loadCardPreferences(userId),
  );

  // Reset prefs quando userId muda (login/logout, view-as-role troca usuário)
  useEffect(() => {
    setPrefs(loadCardPreferences(userId));
  }, [userId]);

  // Cross-tab sync: outra tab edita prefs → reflect aqui
  useEffect(() => {
    if (!userId) return;
    const storageKey = `leverup:rs:card-fields:${userId}`;
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) setPrefs(loadCardPreferences(userId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const update = (next: CardPreferences) => {
    setPrefs(next);
    if (userId) saveCardPreferences(userId, next);
  };

  return [prefs, update];
}
