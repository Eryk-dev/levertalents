import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Home,
  Calendar,
  BarChart3,
  Activity,
  Users,
  UserPlus,
  Building2,
  Briefcase,
  UserSearch,
  ArrowRight,
  User,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Kbd } from "@/components/primitives/LinearKit";
import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { useScope } from "@/app/providers/ScopeProvider";
import { supabase } from "@/integrations/supabase/client";

type RemoteKind = "candidate" | "job" | "person";

interface SearchRow {
  kind: RemoteKind;
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
}

interface Entry {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  group: "Ações" | "Ir para";
  shortcut?: string;
  action: () => void;
}

// D-07: Surface 2 ordering — Vagas → Candidatos → Pessoas
const REMOTE_META: Record<RemoteKind, { label: string; icon: React.ElementType }> = {
  job: { label: "Vagas", icon: Briefcase },
  candidate: { label: "Candidatos", icon: UserSearch },
  person: { label: "Pessoas", icon: User },
};

const REMOTE_ORDER: RemoteKind[] = ["job", "candidate", "person"];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function CmdKPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // UI-SPEC: debounce 150ms (was 180ms)
  const debouncedQuery = useDebouncedValue(query.trim(), 150);
  const navigate = useNavigate();
  const { userRole } = useAuth();
  // Subscribe to scope so the component re-renders on scope change.
  // Actual scope.companyIds reach the RPC via the useScopedQuery chokepoint.
  const { scope: _scope } = useScope();
  void _scope;

  // Register ⌘K and custom open event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-cmdk", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-cmdk", onOpenEvent);
    };
  }, []);

  // Clear search when palette closes so next open is fresh.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // D-09: scoped global search via useScopedQuery chokepoint.
  // queryKey shape becomes ['scope', scope.id, scope.kind, 'global-search', q]
  // and p_company_ids is forwarded to the RPC so out-of-scope rows
  // never appear (T-04-05-01).
  const { data: remoteResults = [], isFetching: remoteLoading } = useScopedQuery<SearchRow[]>(
    ["global-search", debouncedQuery],
    async (companyIds) => {
      const { data, error } = await supabase.rpc(
        "global_search" as never,
        { q: debouncedQuery, max_per_kind: 6, p_company_ids: companyIds } as never,
      );
      if (error) throw error;
      return (data ?? []) as SearchRow[];
    },
    { staleTime: 30_000, enabled: open && debouncedQuery.length >= 2 },
  );

  const remoteGroups = useMemo(() => {
    const grouped: Record<RemoteKind, SearchRow[]> = { job: [], candidate: [], person: [] };
    for (const row of remoteResults) {
      if (row.kind in grouped) grouped[row.kind as RemoteKind].push(row);
    }
    return REMOTE_ORDER
      .filter((k) => grouped[k].length > 0)
      .map((k) => ({ kind: k, rows: grouped[k] }));
  }, [remoteResults]);

  const entries = useMemo<Entry[]>(() => {
    const isAdmin = userRole === "admin";
    const isRH = userRole === "rh";
    const isSocio = userRole === "socio";
    const isLeader = userRole === "lider";
    const canManage = isAdmin || isRH || isSocio;
    const hasTeamView = canManage || isLeader;

    const homeRoute = "/dashboard";

    const nav = (to: string) => () => {
      setOpen(false);
      navigate(to);
    };

    // D-07 LOCK: Ações = vaga + pessoa só. Trocar escopo fica no header.
    const items: Entry[] = [
      ...(canManage
        ? [
            { id: "act-job", label: "Criar nova vaga", icon: Briefcase, group: "Ações" as const, action: nav("/hiring/jobs/nova") },
            { id: "act-invite", label: "Convidar / criar pessoa", icon: UserPlus, group: "Ações" as const, action: nav("/criar-usuario") },
          ]
        : []),

      // Ir para
      { id: "go-home", label: "Início", icon: Home, group: "Ir para" as const, shortcut: "G H", action: nav(homeRoute) },
      ...(canManage || isLeader
        ? [{ id: "go-jobs", label: "Vagas", icon: Briefcase, group: "Ir para" as const, shortcut: "G V", action: nav("/hiring/jobs") }]
        : []),
      ...(canManage
        ? [{ id: "go-cand", label: "Candidatos", icon: UserSearch, group: "Ir para" as const, action: nav("/hiring/candidates") }]
        : []),
      ...(hasTeamView
        ? [
            { id: "go-team", label: "Meu time", icon: Users, group: "Ir para" as const, shortcut: "G T", action: nav("/meu-time") },
            { id: "go-11s", label: "1:1s", icon: Calendar, group: "Ir para" as const, shortcut: "G 1", action: nav("/11s") },
          ]
        : []),
      { id: "go-evals", label: "Avaliações", icon: BarChart3, group: "Ir para" as const, shortcut: "G A", action: nav("/avaliacoes") },
      { id: "go-climate", label: "Clima", icon: Activity, group: "Ir para" as const, shortcut: "G C", action: nav("/clima") },
      ...(canManage
        ? [{ id: "go-comp", label: "Empresas", icon: Building2, group: "Ir para" as const, action: nav("/empresas") }]
        : []),
    ];

    return items;
  }, [navigate, userRole]);

  const groups = useMemo(() => {
    const g: Record<string, Entry[]> = {};
    entries.forEach((e) => {
      (g[e.group] = g[e.group] || []).push(e);
    });
    return g;
  }, [entries]);

  const selectRemote = (row: SearchRow) => {
    setOpen(false);
    navigate(row.url);
  };

  const showEmptyHint = debouncedQuery.length > 0 && debouncedQuery.length < 2;

  // UI-SPEC: CommandItem padding py-2 px-3 (was px-2.5)
  const itemClass =
    "gap-2.5 py-2 px-3 text-[13px] data-[selected=true]:bg-bg-subtle data-[selected=true]:text-text cursor-pointer";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-[560px] gap-0 overflow-hidden border-border shadow-popup top-[18%] translate-y-0">
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <Command className="bg-surface" shouldFilter={false}>
          {/* UI-SPEC: input row px-4 py-3 (was px-3.5) */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar vagas, candidatos, pessoas…"
              className="h-auto border-0 text-[14px] placeholder:text-text-subtle px-0"
            />
            {remoteLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-text-subtle animate-spin" strokeWidth={1.75} />
            ) : (
              <Kbd>Esc</Kbd>
            )}
          </div>
          <CommandList className="max-h-[420px] p-1.5">
            <CommandEmpty className="py-5 text-center text-[13px] text-text-subtle">
              {showEmptyHint ? "Digite ao menos 2 caracteres." : "Nada encontrado."}
            </CommandEmpty>

            {remoteGroups.map(({ kind, rows }) => {
              const meta = REMOTE_META[kind];
              const Icon = meta.icon;
              return (
                <CommandGroup key={`remote-${kind}`} heading={meta.label}>
                  {rows.map((row) => (
                    <CommandItem
                      key={`${kind}-${row.id}`}
                      value={`remote-${kind}-${row.id}`}
                      onSelect={() => selectRemote(row)}
                      className={itemClass}
                    >
                      <Icon className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.75} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{row.title}</div>
                        {row.subtitle && (
                          <div className="text-[11.5px] text-text-subtle truncate">{row.subtitle}</div>
                        )}
                      </div>
                      <ArrowRight className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}

            {Object.entries(groups).map(([group, list]) => {
              const filtered = debouncedQuery
                ? list.filter((e) => e.label.toLowerCase().includes(debouncedQuery.toLowerCase()))
                : list;
              if (filtered.length === 0) return null;
              return (
                <CommandGroup key={group} heading={group}>
                  {filtered.map((e) => {
                    const Icon = e.icon;
                    return (
                      <CommandItem
                        key={e.id}
                        value={e.id}
                        onSelect={e.action}
                        className={itemClass}
                      >
                        <Icon className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.75} />
                        <div className="flex-1 min-w-0">
                          <div>{e.label}</div>
                          {e.sub && <div className="text-[11.5px] text-text-subtle">{e.sub}</div>}
                        </div>
                        {e.shortcut ? (
                          <Kbd>{e.shortcut}</Kbd>
                        ) : (
                          <ArrowRight className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
          <div className="border-t border-border px-3.5 py-2 flex gap-3.5 text-[11px] text-text-subtle">
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> selecionar</span>
            <span className="flex items-center gap-1"><Kbd>↑↓</Kbd> navegar</span>
            <span className="flex items-center gap-1"><Kbd>⌘K</Kbd> abrir / fechar</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
