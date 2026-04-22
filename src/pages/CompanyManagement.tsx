import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTeams } from "@/hooks/useTeams";
import { Plus, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseError";
import { LoadingState } from "@/components/primitives/LoadingState";
import { Btn, Row, LinearEmpty } from "@/components/primitives/LinearKit";
import { CompanyDrawer } from "@/components/company/CompanyDrawer";
import type { CompanyRow } from "@/integrations/supabase/hiring-types";

export default function CompanyManagement() {
  const { companies, teams, teamMembers, loading, refresh } = useTeams();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [query, setQuery] = useState("");

  const openCreate = () => {
    setEditingCompany(null);
    setDrawerOpen(true);
  };

  const openEdit = (company: CompanyRow) => {
    setEditingCompany(company);
    setDrawerOpen(true);
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      toast.success("Empresa excluída");
      refresh();
    } catch (err) {
      handleSupabaseError(err as Error, "Erro ao excluir empresa");
    } finally {
      setConfirmDelete(null);
    }
  };

  const rows = useMemo(() => {
    return companies
      .map((c) => {
        const companyTeams = teams.filter((t) => t.company_id === c.id);
        const teamIds = companyTeams.map((t) => t.id);
        const pessoas = teamMembers.filter((m) => teamIds.includes(m.team_id)).length;
        return {
          id: c.id,
          name: c.name,
          raw: c as unknown as CompanyRow,
          pessoas,
          times: companyTeams.length,
          vagas: null as number | null,
          clima: null as number | null,
          criadaEm: c.created_at
            ? format(new Date(c.created_at), "MMM yyyy", { locale: ptBR })
            : "—",
        };
      })
      .filter((r) => (query.trim() ? r.name.toLowerCase().includes(query.toLowerCase()) : true));
  }, [companies, teams, teamMembers, query]);

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Empresas</h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {rows.length} {rows.length === 1 ? "resultado" : "resultados"}
          </div>
        </div>
        <Row gap={6}>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-[5px] border border-border rounded-md bg-surface text-[12px]">
            <Search className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="bg-transparent outline-none w-[160px] text-text placeholder:text-text-subtle"
            />
          </div>
          <Btn
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
            onClick={openCreate}
          >
            Nova empresa
          </Btn>
        </Row>
      </div>

      {loading ? (
        <div className="mt-5">
          <LoadingState variant="skeleton" layout="table" count={4} />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5">
          <LinearEmpty
            icon={<Building2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title={query ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
            description={
              query
                ? "Ajuste a busca para ver mais resultados."
                : "Adicione a primeira empresa para começar a organizar times e colaboradores."
            }
            actions={
              !query ? (
                <Btn
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                  onClick={openCreate}
                >
                  Nova empresa
                </Btn>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-5 surface-paper overflow-hidden">
          <div className="cell-header grid grid-cols-[1.8fr_0.9fr_0.8fr_1fr_0.8fr_1fr] gap-4">
            <div>Nome</div>
            <div>Pessoas</div>
            <div>Times</div>
            <div>Vagas abertas</div>
            <div>Clima</div>
            <div>Criada em</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              onClick={() => openEdit(r.raw)}
              onContextMenu={(e) => {
                e.preventDefault();
                setConfirmDelete({ id: r.id, name: r.name });
              }}
              className={`grid grid-cols-[1.8fr_0.9fr_0.8fr_1fr_0.8fr_1fr] gap-4 items-center px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-bg-subtle transition-colors ${
                i < rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="font-medium text-text truncate">{r.name}</div>
              <div className="tabular text-text-muted">{r.pessoas}</div>
              <div className="tabular text-text-muted">{r.times}</div>
              <div className="tabular text-text-muted">
                {r.vagas != null ? r.vagas : "—"}
              </div>
              <div className="tabular text-text-muted">
                {r.clima != null ? r.clima.toFixed(1) : "—"}
              </div>
              <div className="text-text-muted">{r.criadaEm}</div>
            </div>
          ))}
        </div>
      )}

      <CompanyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        company={editingCompany}
        onSaved={refresh}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{confirmDelete?.name}</strong>. Todos os times
              vinculados podem ficar órfãos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDeleteCompany(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
