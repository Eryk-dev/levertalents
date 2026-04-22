import { useState, useMemo, useEffect } from "react";
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
import { useTeams, type TeamMember, type UserProfile } from "@/hooks/useTeams";
import { Search, Plus, X, Users, Building2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/supabaseError";
import { LoadingState } from "@/components/primitives/LoadingState";
import {
  Btn,
  Row,
  LinearAvatar,
  LinearEmpty,
} from "@/components/primitives/LinearKit";

const LEADER_ROLES = new Set(["lider", "socio", "admin"]);

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
    assignLeaderToTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    updateMemberCost,
    updateMemberPosition,
  } = useTeams();

  // Create-team dialog (separate from detail panel)
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCompany, setNewTeamCompany] = useState("");

  // Detail panel state
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null);
  const [detailName, setDetailName] = useState("");
  const [detailCompany, setDetailCompany] = useState("");

  // Add member sub-dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberPosition, setNewMemberPosition] = useState("");
  const [newMemberCost, setNewMemberCost] = useState("");

  // Confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Search
  const [query, setQuery] = useState("");

  const detailTeam = useMemo(
    () => teams.find((t) => t.id === detailTeamId) || null,
    [teams, detailTeamId],
  );

  // Sync local edit fields when team data changes (e.g. after refresh)
  useEffect(() => {
    if (detailTeam) {
      setDetailName(detailTeam.name);
      setDetailCompany(detailTeam.company_id);
    }
  }, [detailTeam?.id, detailTeam?.name, detailTeam?.company_id]);

  const handleCreateTeam = async () => {
    if (!newTeamName || !newTeamCompany) return;
    await createTeam(newTeamName, newTeamCompany);
    setCreateDialogOpen(false);
    setNewTeamName("");
    setNewTeamCompany("");
  };

  const handleSaveDetail = async () => {
    if (!detailTeamId || !detailName || !detailCompany) return;
    if (detailName === detailTeam?.name && detailCompany === detailTeam?.company_id) return;
    await updateTeam(detailTeamId, detailName, detailCompany);
  };

  const handleAddMember = async () => {
    if (!newMemberUserId || !detailTeamId) return;
    const cost = newMemberCost ? Number(newMemberCost) : undefined;
    try {
      await addMemberToTeam(
        newMemberUserId,
        detailTeamId,
        newMemberPosition || undefined,
        Number.isFinite(cost) ? cost : undefined,
      );
      toast.success("Membro adicionado ao time");
      setAddMemberOpen(false);
      setNewMemberUserId("");
      setNewMemberPosition("");
      setNewMemberCost("");
    } catch (err) {
      handleSupabaseError(err as Error, "Erro ao adicionar membro");
    }
  };

  const closeDetail = () => {
    setDetailTeamId(null);
    setAddMemberOpen(false);
  };

  const getTeamLeader = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team?.leader_id) return null;
    return users.find((u) => u.id === team.leader_id);
  };

  const getTeamMembers = (teamId: string) => {
    return teamMembers.filter((m) => m.team_id === teamId);
  };

  const detailMembers = detailTeamId ? getTeamMembers(detailTeamId) : [];
  const eligibleLeaders = useMemo(
    () => users.filter((u) => u.role && LEADER_ROLES.has(u.role)),
    [users],
  );
  const availableUsersForAdd = useMemo(() => {
    if (!detailTeamId) return [];
    const taken = new Set(detailMembers.map((m) => m.user_id));
    return users.filter((u) => !taken.has(u.id));
  }, [users, detailMembers, detailTeamId]);

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
              setNewTeamName("");
              setNewTeamCompany("");
              setCreateDialogOpen(true);
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
              onClick={() => setDetailTeamId(r.id)}
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

      {/* Dialog: Novo time */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo time</DialogTitle>
            <DialogDescription>Preencha as informações do time</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                Nome do time
              </Label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex: Time de Desenvolvimento"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                Empresa
              </Label>
              <Select value={newTeamCompany} onValueChange={setNewTeamCompany}>
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
            <Row gap={8} justify="end" className="pt-2">
              <Btn variant="secondary" size="sm" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Btn>
              <Btn variant="primary" size="sm" onClick={handleCreateTeam}>
                Criar time
              </Btn>
            </Row>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawer-style: Detalhes do time */}
      <Dialog open={!!detailTeamId} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-[720px] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(92vh,820px)] bg-bg border border-border">
          <DialogHeader className="shrink-0 px-5 py-4 border-b border-border bg-surface space-y-0 text-left">
            <div className="flex items-center gap-3 pr-6">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-subtle border border-border">
                <Users className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                  {detailTeam?.name || "Time"}
                </DialogTitle>
                <DialogDescription className="text-[11.5px] text-text-muted mt-0.5">
                  {detailTeam?.company?.name || ""} ·{" "}
                  {detailMembers.length} {detailMembers.length === 1 ? "membro" : "membros"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-7 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {/* Section: Detalhes */}
            <section className="space-y-3.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
                <span className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                  Detalhes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                    Nome do time
                  </Label>
                  <Input
                    className="h-[34px] text-[13px]"
                    value={detailName}
                    onChange={(e) => setDetailName(e.target.value)}
                    onBlur={handleSaveDetail}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                    Empresa
                  </Label>
                  <Select
                    value={detailCompany}
                    onValueChange={async (value) => {
                      setDetailCompany(value);
                      if (detailTeamId && detailName && value !== detailTeam?.company_id) {
                        await updateTeam(detailTeamId, detailName, value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-[34px] text-[13px]">
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
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                    Líder
                  </Label>
                  <Select
                    value={detailTeam?.leader_id || ""}
                    onValueChange={async (value) => {
                      if (!detailTeamId || !value) return;
                      await assignLeaderToTeam(value, detailTeamId);
                    }}
                  >
                    <SelectTrigger className="h-[34px] text-[13px]">
                      <SelectValue placeholder="Selecione o líder" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleLeaders.length === 0 ? (
                        <div className="px-2 py-1.5 text-[12px] text-text-muted">
                          Nenhum usuário com papel líder/sócio/admin
                        </div>
                      ) : (
                        eligibleLeaders.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-1">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (detailTeam) {
                      setConfirmDelete({ id: detailTeam.id, name: detailTeam.name });
                    }
                  }}
                  className="text-status-red hover:text-status-red"
                >
                  Excluir time
                </Btn>
              </div>
            </section>

            {/* Section: Membros */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
                  <span className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                    Membros ({detailMembers.length})
                  </span>
                </div>
                <Btn
                  variant="secondary"
                  size="xs"
                  icon={<UserPlus className="w-3 h-3" strokeWidth={1.75} />}
                  onClick={() => {
                    setNewMemberUserId("");
                    setNewMemberPosition("");
                    setNewMemberCost("");
                    setAddMemberOpen(true);
                  }}
                >
                  Adicionar membro
                </Btn>
              </div>

              {detailMembers.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center">
                  <div className="text-[12.5px] text-text-muted">
                    Nenhum membro neste time ainda.
                  </div>
                  <div className="text-[11.5px] text-text-subtle mt-0.5">
                    Use "Adicionar membro" para vincular pessoas.
                  </div>
                </div>
              ) : (
                <div className="border border-border rounded-md bg-surface overflow-hidden">
                  <div className="grid grid-cols-[1.6fr_1.4fr_0.9fr_28px] gap-3 px-3 py-2 border-b border-border bg-bg-subtle text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                    <div>Pessoa</div>
                    <div>Posição</div>
                    <div>Custo</div>
                    <div />
                  </div>
                  {detailMembers.map((m, idx) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      user={users.find((u) => u.id === m.user_id)}
                      isLast={idx === detailMembers.length - 1}
                      onUpdatePosition={(p) => updateMemberPosition(m.id, p)}
                      onUpdateCost={(c) => updateMemberCost(m.id, c)}
                      onRemove={() => removeMemberFromTeam(m.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialog: Adicionar membro */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
            <DialogDescription>
              Vincule uma pessoa ao time {detailTeam?.name ? `"${detailTeam.name}"` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                Pessoa
              </Label>
              <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsersForAdd.length === 0 ? (
                    <div className="px-2 py-1.5 text-[12px] text-text-muted">
                      Todos os usuários já estão neste time
                    </div>
                  ) : (
                    availableUsersForAdd.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                Posição (opcional)
              </Label>
              <Input
                value={newMemberPosition}
                onChange={(e) => setNewMemberPosition(e.target.value)}
                placeholder="Ex: Desenvolvedor Pleno"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
                Custo mensal (opcional)
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={newMemberCost}
                onChange={(e) => setNewMemberCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Row gap={8} justify="end" className="pt-2">
              <Btn variant="secondary" size="sm" onClick={() => setAddMemberOpen(false)}>
                Cancelar
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                onClick={handleAddMember}
                disabled={!newMemberUserId}
              >
                Adicionar
              </Btn>
            </Row>
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
                if (confirmDelete) {
                  deleteTeam(confirmDelete.id);
                  if (confirmDelete.id === detailTeamId) closeDetail();
                }
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

function MemberRow({
  member,
  user,
  isLast,
  onUpdatePosition,
  onUpdateCost,
  onRemove,
}: {
  member: TeamMember;
  user?: UserProfile;
  isLast: boolean;
  onUpdatePosition: (p: string | null) => Promise<void> | void;
  onUpdateCost: (c: number | null) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
}) {
  const [position, setPosition] = useState(member.position || "");
  const [cost, setCost] = useState(member.cost != null ? String(member.cost) : "");

  useEffect(() => {
    setPosition(member.position || "");
  }, [member.position]);
  useEffect(() => {
    setCost(member.cost != null ? String(member.cost) : "");
  }, [member.cost]);

  const handlePositionBlur = async () => {
    const next = position.trim() || null;
    if (next === (member.position || null)) return;
    await onUpdatePosition(next);
  };

  const handleCostBlur = async () => {
    const trimmed = cost.trim();
    if (trimmed === "" && member.cost == null) return;
    if (trimmed !== "" && Number(trimmed) === member.cost) return;
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && !Number.isFinite(value)) return;
    await onUpdateCost(value);
  };

  const displayName = user?.full_name || member.profile?.full_name || "Usuário";

  return (
    <div
      className={`grid grid-cols-[1.6fr_1.4fr_0.9fr_28px] gap-3 items-center px-3 py-2 ${
        isLast ? "" : "border-b border-border"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <LinearAvatar name={displayName} size={22} />
        <span className="text-[13px] text-text truncate">{displayName}</span>
      </div>
      <Input
        className="h-[28px] text-[12.5px]"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        onBlur={handlePositionBlur}
        placeholder="—"
      />
      <Input
        className="h-[28px] text-[12.5px] tabular"
        type="number"
        inputMode="decimal"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        onBlur={handleCostBlur}
        placeholder="—"
      />
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-sm text-text-subtle hover:bg-bg-subtle hover:text-status-red"
        aria-label={`Remover ${displayName}`}
      >
        <X className="h-3 w-3" strokeWidth={1.75} />
      </button>
    </div>
  );
}
