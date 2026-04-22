import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Plus, LayoutGrid, Rows3, Filter, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState, StatusBadge } from "@/components/primitives";
import { Btn, Chip, Row, LinearEmpty, Kbd } from "@/components/primitives/LinearKit";
import { JobOpeningForm } from "@/components/hiring/JobOpeningForm";
import { JobsKanban } from "@/components/hiring/JobsKanban";
import { useJobOpeningsList } from "@/hooks/hiring/useJobOpenings";
import { useApplicationCountsByJobs } from "@/hooks/hiring/useApplicationCountsByJob";
import { useVisibleCompanies } from "@/lib/hiring/rlsScope";
import { supabase } from "@/integrations/supabase/client";
import type { JobStatus } from "@/integrations/supabase/hiring-types";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "table";

export default function JobOpenings() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [companyId, setCompanyId] = useState<string>("all");
  const [confidentialScope, setConfidentialScope] = useState<"any" | "confidential" | "public">("any");
  const [view, setView] = useState<ViewMode>("board");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || t.isContentEditable) return;
      if (e.key === "n" || e.key === "N") {
        if (createOpen) return;
        e.preventDefault();
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen]);

  const { companyIds, canSeeAll } = useVisibleCompanies();
  const { data: companies = [] } = useQuery({
    queryKey: ["jobs-filter-companies", canSeeAll, companyIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("companies").select("id,name").order("name");
      if (!canSeeAll)
        q = q.in("id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: jobs = [], isLoading } = useJobOpeningsList({ status, companyId, confidentialScope });

  const companyById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of companies) map.set(c.id, c.name);
    return map;
  }, [companies]);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((j) => j.title.toLowerCase().includes(term));
  }, [jobs, search]);

  const jobIds = useMemo(() => filteredJobs.map((j) => j.id), [filteredJobs]);
  const { data: countsMap = {} } = useApplicationCountsByJobs(jobIds);

  const handleOpenJob = (id: string) => {
    navigate(`/hiring/jobs/${id}`);
  };

  const activeCount = filteredJobs.length;
  const totalCandidates = Object.values(countsMap).reduce((s, v: any) => s + (v?.total || 0), 0);
  const newToday = Object.values(countsMap).reduce((s, v: any) => s + (v?.today || 0), 0);

  return (
    <div className="flex flex-col h-full font-sans text-text animate-fade-in">
      {/* Header */}
      <div className="px-5 lg:px-7 pt-5">
        <div className="flex items-baseline justify-between mb-2.5">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0 flex items-center gap-2">
              Vagas
            </h1>
            <div className="text-[13px] text-text-muted mt-0.5">
              {activeCount} {activeCount === 1 ? "vaga" : "vagas"} · {totalCandidates} candidatos · {newToday} novos hoje
            </div>
          </div>
          <Row gap={6}>
            <div className="inline-flex bg-bg-muted rounded-md p-0.5">
              {[
                { k: "board" as const, label: "Board", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                { k: "table" as const, label: "Tabela", icon: <Rows3 className="w-3.5 h-3.5" /> },
              ].map(({ k, label, icon }) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={cn(
                    "px-2.5 h-[22px] text-[12px] rounded inline-flex items-center gap-1.5 transition-colors",
                    view === k
                      ? "bg-surface shadow-ds-sm text-text font-medium"
                      : "text-text-muted hover:text-text",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <Btn variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />} onClick={() => setCreateOpen(true)}>
              Nova vaga
            </Btn>
          </Row>
        </div>

        {/* Filter bar */}
        <Row gap={6} wrap className="pb-2.5 border-b border-border">
          <div className="inline-flex items-center gap-1.5 px-2 h-[26px] border border-border rounded-md bg-surface text-[12px] focus-within:ring-1 focus-within:ring-accent/40">
            <Search className="w-3 h-3 text-text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar vaga…"
              className="bg-transparent border-0 outline-none text-[12px] w-[160px] placeholder:text-text-subtle"
            />
            <Kbd>⌘F</Kbd>
          </div>
          <Chip color="neutral" size="md" icon={<Filter className="w-3 h-3" />}>Filtro</Chip>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="h-[22px] w-auto min-w-[150px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-[22px] w-auto min-w-[140px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aguardando_publicacao">Aguardando publicação</SelectItem>
              <SelectItem value="publicada">Publicada</SelectItem>
              <SelectItem value="fechada">Fechada</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={confidentialScope}
            onValueChange={(v) => setConfidentialScope(v as typeof confidentialScope)}
          >
            <SelectTrigger className="h-[22px] w-auto min-w-[130px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todas</SelectItem>
              <SelectItem value="public">Apenas abertas</SelectItem>
              <SelectItem value="confidential">Apenas confidenciais</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <div className="text-[11.5px] text-text-subtle flex items-center">
            Agrupado por <b className="text-text font-medium ml-1">status</b>
          </div>
        </Row>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto scrollbar-linear px-5 lg:px-7 py-3.5 min-h-0">
        {isLoading ? (
          <LoadingState layout="cards" count={4} />
        ) : filteredJobs.length === 0 ? (
          <LinearEmpty
            icon={<Briefcase className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Nenhuma vaga ainda"
            description={'Clique em "Nova vaga" para abrir o primeiro processo seletivo.'}
            actions={
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                onClick={() => setCreateOpen(true)}
              >
                Nova vaga
              </Btn>
            }
          />
        ) : view === "board" ? (
          <JobsKanban
            jobs={filteredJobs}
            companyById={companyById}
            onOpenJob={handleOpenJob}
            onCreateJob={() => setCreateOpen(true)}
          />
        ) : (
          <div className="surface-paper overflow-hidden">
            <div className="cell-header grid grid-cols-[3fr_1.5fr_1.2fr_0.8fr_0.8fr] gap-4">
              <div>Vaga</div>
              <div>Empresa</div>
              <div>Status</div>
              <div className="text-right">Candidatos</div>
              <div className="text-right">Aberta há</div>
            </div>
            {filteredJobs.map((job, i) => {
              const daysOpen = Math.max(
                0,
                Math.floor((Date.now() - new Date(job.opened_at).getTime()) / 86_400_000),
              );
              const total = countsMap[job.id]?.total ?? 0;
              return (
                <div
                  key={job.id}
                  onClick={() => handleOpenJob(job.id)}
                  className={cn(
                    "grid grid-cols-[3fr_1.5fr_1.2fr_0.8fr_0.8fr] gap-4 px-3.5 py-2.5 items-center text-[13px] cursor-pointer hover:bg-bg-subtle transition-colors",
                    i < filteredJobs.length - 1 && "border-b border-border",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{job.title}</span>
                    {job.confidential && (
                      <Chip color="neutral" size="sm">
                        confid.
                      </Chip>
                    )}
                  </div>
                  <div className="text-text-muted truncate">
                    {companyById.get(job.company_id) ?? "—"}
                  </div>
                  <div>
                    <StatusBadge kind="job" status={job.status} size="sm" />
                  </div>
                  <div className="text-right tabular">{total}</div>
                  <div className="text-right text-text-muted tabular">{daysOpen}d</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[720px] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(92vh,820px)]">
          <DialogHeader className="sr-only">
            <DialogTitle>Nova vaga</DialogTitle>
          </DialogHeader>
          <JobOpeningForm
            onCancel={() => setCreateOpen(false)}
            onSuccess={(createdId) => {
              setCreateOpen(false);
              if (createdId) handleOpenJob(createdId);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
