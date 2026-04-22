import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Target,
  BarChart3,
  Activity,
  Users,
  UserPlus,
  Building,
  Building2,
  Briefcase,
  UserSearch,
  LineChart,
  Sparkles,
  Kanban,
  ArrowRight,
  FileText,
  User,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Kbd } from "@/components/primitives/LinearKit";
import { supabase } from "@/integrations/supabase/client";

type RemoteKind = "candidate" | "job" | "pdi" | "person";

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
  group: "Ações" | "Ir para" | "Pessoas";
  shortcut?: string;
  action: () => void;
}

const REMOTE_META: Record<RemoteKind, { label: string; icon: React.ElementType }> = {
  candidate: { label: "Candidatos", icon: UserSearch },
  job: { label: "Vagas", icon: Briefcase },
  pdi: { label: "PDIs", icon: FileText },
  person: { label: "Pessoas", icon: User },
};

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
  const debouncedQuery = useDebouncedValue(query.trim(), 180);
  const navigate = useNavigate();
  const { userRole } = useAuth();

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

  const { data: remoteResults = [], isFetching: remoteLoading } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchRow[]> => {
      const { data, error } = await supabase.rpc(
        "global_search" as never,
        { q: debouncedQuery, max_per_kind: 6 } as never,
      );
      if (error) throw error;
      return (data ?? []) as SearchRow[];
    },
  });

  const remoteGroups = useMemo(() => {
    const order: RemoteKind[] = ["candidate", "job", "pdi", "person"];
    const grouped: Record<RemoteKind, SearchRow[]> = {
      candidate: [],
      job: [],
      pdi: [],
      person: [],
    };
    for (const row of remoteResults) grouped[row.kind].push(row);
    return order
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

    const homeRoute =
      userRole === "admin"
        ? "/admin"
        : userRole === "socio"
        ? "/socio"
        : userRole === "lider"
        ? "/gestor"
        : userRole === "rh"
        ? "/rh"
        : "/colaborador";

    const nav = (to: string) => () => {
      setOpen(false);
      navigate(to);
    };

    const items: Entry[] = [
      // Actions
      { id: "act-pdi", label: "Criar novo PDI", icon: Target, group: "Ações", action: nav("/pdi") },
      { id: "act-11", label: "Agendar 1:1", icon: Calendar, group: "Ações", action: nav("/11s") },
      { id: "act-eval", label: "Iniciar avaliação", icon: BarChart3, group: "Ações", action: nav("/avaliacoes") },
      ...(canManage
        ? [{ id: "act-invite", label: "Convidar pessoa", icon: UserPlus, group: "Ações" as const, action: nav("/criar-usuario") }]
        : []),

      // Navigation
      { id: "go-home", label: "Início", icon: Home, group: "Ir para", shortcut: "G H", action: nav(homeRoute) },
      { id: "go-pdi", label: "Desenvolvimento", icon: Target, group: "Ir para", shortcut: "G P", action: nav("/pdi") },
      { id: "go-evals", label: "Avaliações", icon: BarChart3, group: "Ir para", shortcut: "G A", action: nav("/avaliacoes") },
      { id: "go-climate", label: "Clima", icon: Activity, group: "Ir para", shortcut: "G C", action: nav("/clima") },
      { id: "go-profile", label: "Meu perfil", icon: UserPlus, group: "Ir para", action: nav("/perfil") },
    ];

    if (hasTeamView) {
      items.push(
        { id: "go-team", label: "Meu time", icon: Users, group: "Ir para", shortcut: "G T", action: nav("/meu-time") },
        { id: "go-11s", label: "1:1s", icon: Calendar, group: "Ir para", shortcut: "G 1", action: nav("/11s") },
        { id: "go-kanban", label: "Kanban de PDIs", icon: Kanban, group: "Ir para", action: nav("/kanban") },
      );
    }

    if (canManage || isLeader) {
      items.push({ id: "go-jobs", label: "Vagas", icon: Briefcase, group: "Ir para", shortcut: "G V", action: nav("/hiring/jobs") });
    }
    if (canManage) {
      items.push(
        { id: "go-cand", label: "Candidatos", icon: UserSearch, group: "Ir para", action: nav("/hiring/candidates") },
        { id: "go-fit", label: "Fit Cultural", icon: Sparkles, group: "Ir para", action: nav("/hiring/fit-templates") },
        { id: "go-hdash", label: "Dashboard de recrutamento", icon: LineChart, group: "Ir para", action: nav("/hiring/dashboard") },
        { id: "go-teams", label: "Times", icon: Building, group: "Ir para", action: nav("/times") },
        { id: "go-comp", label: "Empresas", icon: Building2, group: "Ir para", action: nav("/empresas") },
      );
    }

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="p-0 max-w-[560px] gap-0 overflow-hidden border-border shadow-popup top-[18%] translate-y-0"
      >
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <Command
          className="bg-surface"
          shouldFilter={false}
        >
          <div className="flex items-center gap-2 px-3.5 py-3 border-b border-border">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar candidatos, vagas, PDIs, pessoas…"
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
                      className="gap-2.5 py-2 px-2.5 text-[13px] data-[selected=true]:bg-bg-subtle data-[selected=true]:text-text cursor-pointer"
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
                ? list.filter((e) =>
                    e.label.toLowerCase().includes(debouncedQuery.toLowerCase()),
                  )
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
                        className="gap-2.5 py-2 px-2.5 text-[13px] data-[selected=true]:bg-bg-subtle data-[selected=true]:text-text cursor-pointer"
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
