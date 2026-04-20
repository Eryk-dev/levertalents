import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Search, Plus } from "lucide-react";
import { LoadingState } from "@/components/primitives/LoadingState";
import {
  Btn,
  Row,
  LinearAvatar,
  LinearEmpty,
} from "@/components/primitives/LinearKit";
import { Users } from "lucide-react";

export default function TeamManagement() {
  const {
    companies,
    teams,
    teamMembers,
    users,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
  } = useTeams();

  // Team form state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamCompany, setTeamCompany] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Search
  const [query, setQuery] = useState("");

  const handleSaveTeam = async () => {
    if (!teamName || !teamCompany) return;

    if (editingTeam) {
      await updateTeam(editingTeam, teamName, teamCompany);
    } else {
      await createTeam(teamName, teamCompany);
    }

    setTeamDialogOpen(false);
    setEditingTeam(null);
    setTeamName("");
    setTeamCompany("");
  };

  const getTeamLeader = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team?.leader_id) return null;
    return users.find((u) => u.id === team.leader_id);
  };

  const getTeamMembers = (teamId: string) => {
    return teamMembers.filter((m) => m.team_id === teamId);
  };

  const rows = useMemo(() => {
    return teams
      .map((team) => {
        const leader = getTeamLeader(team.id);
        const members = getTeamMembers(team.id);
        return {
          id: team.id,
          name: team.name,
          company: team.company?.name || "—",
          leader,
          peopleCount: members.length,
          // TODO: integrar clima por time (climate_responses agregado por equipe).
          clima: null as number | null,
          // TODO: integrar PDI ativo por time (development_plans filtrados por time).
          pdiAtivo: null as number | null,
          _team: team,
        };
      })
      .filter((r) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.company.toLowerCase().includes(q) ||
          (r.leader?.full_name || "").toLowerCase().includes(q)
        );
      });
  }, [teams, teamMembers, users, query]);

  if (loading) {
    return <LoadingState variant="spinner" message="Carregando gestão de times..." />;
  }

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Times</h1>
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
            onClick={() => {
              setEditingTeam(null);
              setTeamName("");
              setTeamCompany("");
              setTeamDialogOpen(true);
            }}
          >
            Novo time
          </Btn>
        </Row>
      </div>

      {/* Dense table — Linear style */}
      {rows.length === 0 ? (
        <div className="mt-5">
          <LinearEmpty
            icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title={query ? "Nenhum time encontrado" : "Nenhum time cadastrado"}
            description={
              query
                ? "Ajuste a busca para ver mais resultados."
                : "Crie o primeiro time para começar a organizar líderes e colaboradores."
            }
          />
        </div>
      ) : (
        <div className="mt-5 surface-paper overflow-hidden">
          <div className="cell-header grid grid-cols-[1.6fr_1.3fr_1.4fr_0.8fr_0.8fr_0.9fr] gap-4">
            <div>Nome</div>
            <div>Empresa</div>
            <div>Líder</div>
            <div>Pessoas</div>
            <div>Clima</div>
            <div>PDI ativo</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              onClick={() => {
                setEditingTeam(r.id);
                setTeamName(r._team.name);
                setTeamCompany(r._team.company_id);
                setTeamDialogOpen(true);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setConfirmDelete({ id: r.id, name: r.name });
              }}
              className={`grid grid-cols-[1.6fr_1.3fr_1.4fr_0.8fr_0.8fr_0.9fr] gap-4 items-center px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-bg-subtle transition-colors ${
                i < rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="font-medium text-text truncate">{r.name}</div>
              <div className="text-text-muted truncate">{r.company}</div>
              <div className="min-w-0">
                {r.leader ? (
                  <Row gap={8}>
                    <LinearAvatar name={r.leader.full_name} size={22} />
                    <span className="text-text truncate">{r.leader.full_name}</span>
                  </Row>
                ) : (
                  <span className="text-text-subtle italic">Sem líder</span>
                )}
              </div>
              <div className="tabular text-text-muted">{r.peopleCount}</div>
              <div className="tabular text-text-muted">
                {r.clima != null ? r.clima.toFixed(1) : "—"}
              </div>
              <div className="tabular text-text-muted">
                {r.pdiAtivo != null ? `${r.pdiAtivo}%` : "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog criar/editar time */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Editar time" : "Novo time"}</DialogTitle>
            <DialogDescription>Preencha as informações do time</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                Nome do time
              </Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Time de Desenvolvimento"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                Empresa
              </Label>
              <Select value={teamCompany} onValueChange={setTeamCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-2">
              {editingTeam ? (
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const row = rows.find((x) => x.id === editingTeam);
                    if (row) {
                      setTeamDialogOpen(false);
                      setConfirmDelete({ id: row.id, name: row.name });
                    }
                  }}
                >
                  Excluir time
                </Btn>
              ) : (
                <span />
              )}
              <Row gap={8}>
                <Btn variant="secondary" size="sm" onClick={() => setTeamDialogOpen(false)}>
                  Cancelar
                </Btn>
                <Btn variant="primary" size="sm" onClick={handleSaveTeam}>
                  Salvar
                </Btn>
              </Row>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir time?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.name}</strong> será removido. Colaboradores vinculados ficarão
              sem time até que um novo seja atribuído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteTeam(confirmDelete.id);
                setConfirmDelete(null);
              }}
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
