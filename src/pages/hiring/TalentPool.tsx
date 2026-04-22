import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookmarkCheck,
  Filter,
  MessageCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { Icon, LoadingState } from "@/components/primitives";
import {
  Btn,
  Chip,
  LinearAvatar,
  LinearEmpty,
  Row,
} from "@/components/primitives/LinearKit";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTalentPool } from "@/hooks/hiring/useTalentPool";
import { useJobOpeningsList } from "@/hooks/hiring/useJobOpenings";
import type { DiscardReason } from "@/integrations/supabase/hiring-types";
import {
  DISCARD_REASONS,
  DISCARD_REASON_LABELS,
} from "@/lib/hiring/discardReasons";
import { cn } from "@/lib/utils";

export default function TalentPool() {
  const [search, setSearch] = useState("");
  const [discardReasons, setDiscardReasons] = useState<DiscardReason[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [onlyTalentPool, setOnlyTalentPool] = useState(true);

  const filters = useMemo(
    () => ({ search, discardReasons, jobIds, onlyTalentPool }),
    [search, discardReasons, jobIds, onlyTalentPool],
  );

  const { data: candidates = [], isLoading } = useTalentPool(filters);
  const { data: jobs = [] } = useJobOpeningsList({});

  const activeFilterCount =
    (discardReasons.length > 0 ? 1 : 0) + (jobIds.length > 0 ? 1 : 0);

  const clearAll = () => {
    setSearch("");
    setDiscardReasons([]);
    setJobIds([]);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden font-sans text-text animate-fade-in">
      {/* Header */}
      <div className="px-5 lg:px-7 pt-5 pb-3 border-b border-border">
        <Row justify="between" align="baseline" gap={12}>
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0 flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-accent-text" />
              Banco de Talentos
            </h1>
            <div className="text-[12.5px] text-text-muted mt-0.5">
              Consulte candidatos que já passaram por processos seletivos — CV, fit cultural, antecedentes e conversas.
            </div>
          </div>
          <Chip color="neutral" size="md">
            {candidates.length} {candidates.length === 1 ? "candidato" : "candidatos"}
          </Chip>
        </Row>

        <div className="pt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email…"
              className="pl-8 h-[30px]"
            />
          </div>

          <div className="flex items-center gap-2 px-2.5 h-[30px] rounded-md border border-border bg-surface">
            <Switch
              id="only-talent-pool"
              checked={onlyTalentPool}
              onCheckedChange={setOnlyTalentPool}
            />
            <Label htmlFor="only-talent-pool" className="text-[12px] cursor-pointer">
              Só marcados para o banco
            </Label>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Btn
                variant="secondary"
                size="sm"
                icon={<Filter className="h-3 w-3" />}
              >
                Filtros
                {activeFilterCount > 0 ? (
                  <Chip color="accent" size="sm" className="ml-1">
                    {activeFilterCount}
                  </Chip>
                ) : null}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 space-y-4">
              <div className="space-y-2">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
                  Motivo do descarte
                </div>
                <div className="space-y-1.5 max-h-52 overflow-auto scrollbar-linear pr-1">
                  {DISCARD_REASONS.map((r) => {
                    const checked = discardReasons.includes(r.value);
                    return (
                      <label
                        key={r.value}
                        className="flex items-start gap-2 cursor-pointer text-[12.5px]"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setDiscardReasons((curr) =>
                              v
                                ? [...curr, r.value]
                                : curr.filter((x) => x !== r.value),
                            );
                          }}
                          className="mt-0.5"
                        />
                        <span className="flex-1 leading-snug">{r.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
                  Vaga passada
                </div>
                <div className="space-y-1.5 max-h-52 overflow-auto scrollbar-linear pr-1">
                  {jobs.length === 0 ? (
                    <p className="text-[12px] text-text-subtle">Sem vagas cadastradas</p>
                  ) : (
                    jobs.map((j) => {
                      const checked = jobIds.includes(j.id);
                      return (
                        <label
                          key={j.id}
                          className="flex items-center gap-2 cursor-pointer text-[12.5px]"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setJobIds((curr) =>
                                v ? [...curr, j.id] : curr.filter((x) => x !== j.id),
                              );
                            }}
                          />
                          <span className="flex-1 truncate">{j.title}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {activeFilterCount > 0 ? (
                <Btn
                  variant="ghost"
                  size="sm"
                  icon={<X className="h-3 w-3" />}
                  onClick={() => {
                    setDiscardReasons([]);
                    setJobIds([]);
                  }}
                  className="w-full justify-center"
                >
                  Limpar filtros
                </Btn>
              ) : null}
            </PopoverContent>
          </Popover>

          {search || activeFilterCount > 0 ? (
            <Btn
              variant="ghost"
              size="sm"
              icon={<X className="h-3 w-3" />}
              onClick={clearAll}
            >
              Limpar tudo
            </Btn>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto scrollbar-linear px-5 lg:px-7 py-4 min-h-0">
        {isLoading ? (
          <LoadingState layout="list" count={5} />
        ) : candidates.length === 0 ? (
          <LinearEmpty
            icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Nenhum candidato no banco"
            description={
              onlyTalentPool
                ? "Quando um candidato é recusado, marque 'adicionar ao banco de talentos' para vê-lo aqui."
                : "Ajuste busca ou filtros para encontrar candidatos."
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {candidates.map((c) => {
              const poolApps = c.applications.filter((a) => a.added_to_talent_pool);
              const primary = poolApps[0] ?? c.applications[0];
              return (
                <Link
                  key={c.id}
                  to={`/hiring/candidates/${c.id}`}
                  className={cn(
                    "surface-paper p-3.5 flex flex-col gap-2.5",
                    "hover:border-border-strong hover:shadow-ds-sm transition-all",
                  )}
                >
                  <Row gap={10} align="start">
                    <LinearAvatar name={c.full_name || c.email} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[13.5px] font-semibold truncate">
                          {c.full_name}
                        </h3>
                        {poolApps.length > 0 ? (
                          <BookmarkCheck
                            className="h-3 w-3 text-accent-text shrink-0"
                            aria-label="No banco"
                          />
                        ) : null}
                      </div>
                      <p className="text-[11.5px] text-text-subtle truncate">{c.email}</p>
                    </div>
                    {c.conversation_count > 0 ? (
                      <Chip
                        color="blue"
                        size="sm"
                        icon={<MessageCircle className="h-3 w-3" />}
                      >
                        {c.conversation_count}
                      </Chip>
                    ) : null}
                  </Row>

                  {primary?.job_title ? (
                    <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted truncate">
                      <Icon name="briefcase" size={11} className="shrink-0" />
                      <span className="truncate">{primary.job_title}</span>
                      {c.applications.length > 1 ? (
                        <Chip color="neutral" size="sm" className="shrink-0">
                          +{c.applications.length - 1}
                        </Chip>
                      ) : null}
                    </div>
                  ) : null}

                  {primary?.discard_reason ? (
                    <div className="text-[11px] text-text-subtle">
                      Motivo:{" "}
                      <span className="text-text-muted">
                        {DISCARD_REASON_LABELS[primary.discard_reason]}
                      </span>
                    </div>
                  ) : null}

                  {c.last_conversation_summary ? (
                    <p className="text-[12px] text-text-muted leading-[1.45] line-clamp-3 border-t border-border pt-2 mt-auto">
                      <MessageCircle className="inline h-3 w-3 mr-1 text-text-subtle" />
                      {c.last_conversation_summary}
                    </p>
                  ) : c.applications[0]?.closed_at ? (
                    <p className="text-[11px] text-text-subtle mt-auto pt-2 border-t border-border">
                      Encerrado em{" "}
                      {new Date(c.applications[0].closed_at).toLocaleDateString("pt-BR")}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
