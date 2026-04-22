import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseError";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Users as UsersIcon,
  Shield,
  Plus,
  Download,
  Calendar,
  TrendingUp,
  Target,
  ArrowRight,
  Filter,
  Briefcase,
  UserCog,
  UserX,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/hooks/useUsers";
import { useDeleteUser } from "@/hooks/useDeleteUser";
import { useAuth } from "@/hooks/useAuth";
import { useOrgIndicators } from "@/hooks/useOrgIndicators";
import { useClimateOverview } from "@/hooks/useClimateOverview";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LoadingState } from "@/components/primitives/LoadingState";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import {
  Btn,
  Row,
  Card,
  SectionHeader,
  LinearAvatar,
  LinearEmpty,
} from "@/components/primitives/LinearKit";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, error: usersError } = useUsers();
  useEffect(() => {
    if (usersError) handleSupabaseError(usersError, "Falha ao carregar usuários");
  }, [usersError]);
  const { data: org } = useOrgIndicators();
  const { data: climate } = useClimateOverview();
  const { data: profile } = useUserProfile();

  const { user: currentAuthUser } = useAuth();
  const deleteUser = useDeleteUser();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const ROLE_OPTIONS = ["socio", "lider", "rh", "colaborador", "sem-papel"] as const;
  type RoleFilter = (typeof ROLE_OPTIONS)[number];
  const [roleFilters, setRoleFilters] = useState<Set<RoleFilter>>(new Set());

  const toggleRoleFilter = (role: RoleFilter) => {
    setRoleFilters((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const downloadCSV = (rows: Record<string, unknown>[], filename: string) => {
    if (!rows.length) {
      toast.error("Nada para exportar.");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error("Selecione um usuário e uma role.");
      return;
    }
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", selectedUser);
    if (deleteError) {
      handleSupabaseError(deleteError, "Erro ao atribuir papel");
      return;
    }
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: selectedUser, role: selectedRole as any });
    if (insertError) {
      handleSupabaseError(insertError, "Erro ao atribuir papel");
      return;
    }
    toast.success("Papel atribuído");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setSelectedUser("");
    setSelectedRole("");
  };

  const handleRemoveRole = async (userId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
      toast.success("Papel removido");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error(`Erro ao remover: ${error.message}`);
    } finally {
      setConfirmRemoveUserId(null);
    }
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser.mutate(userId, {
      onSettled: () => setConfirmDeleteUserId(null),
    });
  };

  const userBeingDeleted = users.find((u) => u.id === confirmDeleteUserId);

  const firstName = (profile?.full_name || "").split(" ")[0] || "Admin";
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const totalUsers = users.length;
  const withRole = users.filter((u) => u.role).length;
  const withoutRole = totalUsers - withRole;
  const usersWithoutRole = users.filter((u) => !u.role);

  const filteredUsers = useMemo(() => {
    if (roleFilters.size === 0) return users;
    return users.filter((u) => {
      const key: RoleFilter = u.role ? (u.role as RoleFilter) : "sem-papel";
      return roleFilters.has(key);
    });
  }, [users, roleFilters]);
  const recentUsers = filteredUsers.slice(0, 5);
  const filteredCount = filteredUsers.length;

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-0.5">
            Administração
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            {greeting}, {firstName}
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {totalUsers
              ? `${totalUsers} ${totalUsers === 1 ? "usuário" : "usuários"}${
                  withoutRole > 0 ? ` · ${withoutRole} sem papel` : ""
                }`
              : "Comece cadastrando o primeiro usuário"}
          </div>
        </div>
        <Row gap={6}>
          <Popover>
            <PopoverTrigger asChild>
              <Btn
                variant="ghost"
                size="sm"
                icon={<Filter className="w-3.5 h-3.5" strokeWidth={1.75} />}
              >
                Filtros{roleFilters.size > 0 ? ` · ${roleFilters.size}` : ""}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-2">
                Filtrar por papel
              </div>
              <div className="space-y-1.5">
                {ROLE_OPTIONS.map((role) => {
                  const label =
                    role === "socio"
                      ? "Sócio"
                      : role === "lider"
                      ? "Líder"
                      : role === "rh"
                      ? "RH"
                      : role === "colaborador"
                      ? "Colaborador"
                      : "Sem papel";
                  return (
                    <label
                      key={role}
                      className="flex items-center gap-2 text-[12.5px] cursor-pointer py-1"
                    >
                      <Checkbox
                        checked={roleFilters.has(role)}
                        onCheckedChange={() => toggleRoleFilter(role)}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
              {roleFilters.size > 0 && (
                <button
                  onClick={() => setRoleFilters(new Set())}
                  className="text-[11.5px] text-accent-text mt-2 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </PopoverContent>
          </Popover>
          <Btn
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
            onClick={() => {
              const rows = filteredUsers.map((u) => ({
                nome: u.full_name || "",
                email: u.email || "",
                papel: u.role || "sem-papel",
              }));
              const date = new Date().toISOString().slice(0, 10);
              downloadCSV(rows, `usuarios-${date}.csv`);
            }}
          >
            Relatório
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
            onClick={() => navigate("/admin/criar-usuario")}
          >
            Criar usuário
          </Btn>
        </Row>
      </div>

      {/* Next action hero — usuários sem papel */}
      {withoutRole > 0 && (
        <div className="mt-4 mb-5 surface-paper border-l-[3px] border-l-accent p-3.5 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent-text grid place-items-center shrink-0">
            <UserCog className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <Row gap={6} className="mb-0.5">
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-accent-text font-semibold">
                Próxima ação
              </span>
              <span className="text-[10.5px] text-text-subtle">·</span>
              <span className="text-[10.5px] text-text-subtle">
                Acesso limitado até receber papel
              </span>
            </Row>
            <div className="text-[15px] font-medium tracking-[-0.01em]">
              {withoutRole} {withoutRole === 1 ? "usuário sem papel atribuído" : "usuários sem papel atribuído"}
            </div>
            <div className="text-[12px] text-text-muted mt-0.5 line-clamp-1">
              Defina o papel para habilitar as áreas corretas do produto.
            </div>
          </div>
          <Row gap={6}>
            <Btn
              variant="accent"
              size="sm"
              iconRight={<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={() => {
                document.getElementById("atribuir-papel")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Atribuir
            </Btn>
          </Row>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        <KpiTile
          label="Total"
          value={String(totalUsers)}
          detail={`${withRole} com papel · ${withoutRole} sem`}
          icon={<UsersIcon className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Em times"
          value={String(org?.totalCollaborators ?? 0)}
          detail="pessoas alocadas"
          icon={<Briefcase className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="Avaliações"
          value={String(org?.completedEvaluations ?? 0)}
          detail={
            org?.avgPerformanceScore != null ? `média ${org.avgPerformanceScore.toFixed(1)}` : "concluídas no ciclo"
          }
          icon={<Shield className="w-4 h-4" strokeWidth={1.75} />}
        />
        <KpiTile
          label="PDIs"
          value={String(org?.pendingApprovalPdis ?? 0)}
          detail="aguardando aprovação"
          icon={<Target className="w-4 h-4" strokeWidth={1.75} />}
          delta={(org?.pendingApprovalPdis ?? 0) > 5 ? "bad" : undefined}
        />
        <KpiTile
          label="Clima"
          value={climate?.avgScore != null ? climate.avgScore.toFixed(1) : "—"}
          detail={climate?.survey?.title || "sem pesquisa"}
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.75} />}
          delta={
            climate?.avgScore != null
              ? climate.avgScore >= 4
                ? "good"
                : climate.avgScore < 3.5
                ? "bad"
                : undefined
              : undefined
          }
        />
      </div>

      {/* Recentes + Atribuir papéis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <SectionHeader
            title="Pessoas recentes"
            right={
              filteredCount > 0 ? (
                <span className="text-[11.5px] text-text-subtle tabular">
                  {filteredCount} {filteredCount === 1 ? "pessoa" : "pessoas"}
                  {roleFilters.size > 0 ? ` · de ${totalUsers}` : ""}
                </span>
              ) : null
            }
          />
          {isLoading ? (
            <LoadingState variant="skeleton" layout="table" count={5} />
          ) : recentUsers.length === 0 ? (
            <LinearEmpty
              icon={<UsersIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Nenhum usuário cadastrado"
              description="Clique em Criar usuário para adicionar o primeiro."
              actions={
                <Btn
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                  onClick={() => navigate("/admin/criar-usuario")}
                >
                  Criar usuário
                </Btn>
              }
            />
          ) : (
            <div className="surface-paper">
              <div className="cell-header grid grid-cols-[2fr_1.4fr_1fr_100px] gap-5">
                <div>Pessoa</div>
                <div>Email</div>
                <div>Papel</div>
                <div className="text-right">Ações</div>
              </div>
              {recentUsers.map((user, idx) => (
                <div
                  key={user.id}
                  className={`grid grid-cols-[2fr_1.4fr_1fr_100px] gap-5 items-center px-3.5 py-2.5 text-[13px] ${
                    idx < recentUsers.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LinearAvatar name={user.full_name || "?"} size={24} />
                    <span className="font-medium truncate">{user.full_name || "Sem nome"}</span>
                  </div>
                  <div className="text-text-muted truncate">{user.email}</div>
                  <div>
                    {user.role ? (
                      <StatusBadge kind="role" status={user.role} size="sm" />
                    ) : (
                      <span className="text-[11.5px] text-text-subtle">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {user.role && (
                      <Btn
                        variant="ghost"
                        size="xs"
                        onClick={() => setConfirmRemoveUserId(user.id)}
                        className="text-text-muted hover:bg-bg-subtle"
                        icon={<Shield className="w-3 h-3" strokeWidth={1.75} />}
                        aria-label="Remover papel do usuário"
                        title="Remover papel"
                      >
                        <span className="sr-only">Remover papel do usuário</span>
                      </Btn>
                    )}
                    {user.id !== currentAuthUser?.id && (
                      <Btn
                        variant="ghost"
                        size="xs"
                        onClick={() => setConfirmDeleteUserId(user.id)}
                        className="text-status-red hover:bg-status-red-soft"
                        icon={<UserX className="w-3 h-3" strokeWidth={1.75} />}
                        aria-label="Excluir usuário"
                        title="Excluir usuário"
                      >
                        <span className="sr-only">Excluir usuário</span>
                      </Btn>
                    )}
                  </div>
                </div>
              ))}
              {filteredCount > recentUsers.length && (
                <button
                  onClick={() =>
                    document
                      .getElementById("todos-usuarios")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="w-full flex items-center justify-center gap-1 px-3.5 py-2.5 text-[12px] text-accent-text hover:bg-bg-subtle transition-colors border-t border-border"
                >
                  Ver todos os {filteredCount}
                  <ArrowRight className="w-3 h-3" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <SectionHeader
            title="Sem papel"
            right={
              usersWithoutRole.length > 0 ? (
                <span className="text-[11.5px] text-text-subtle tabular">{usersWithoutRole.length}</span>
              ) : null
            }
          />
          {usersWithoutRole.length === 0 ? (
            <LinearEmpty
              icon={<Shield className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Tudo atribuído"
              description="Todos os usuários têm papel definido."
              dashed={false}
            />
          ) : (
            <div className="surface-paper">
              {usersWithoutRole.slice(0, 6).map((user, idx) => {
                const visible = usersWithoutRole.slice(0, 6);
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user.id);
                      document
                        .getElementById("atribuir-papel")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-bg-subtle transition-colors ${
                      idx < visible.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <LinearAvatar name={user.full_name || "?"} size={26} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-text truncate">
                        {user.full_name || "Sem nome"}
                      </div>
                      <div className="text-[11px] text-text-subtle truncate">{user.email}</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Atribuir papel */}
      <div id="atribuir-papel">
        <SectionHeader title="Atribuir papel" />
      </div>
      <Card contentClassName="p-3.5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
              Usuário
            </Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="h-[30px] text-[13px]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} · {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
              Papel
            </Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-[30px] text-[13px]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="socio">Sócio</SelectItem>
                <SelectItem value="lider">Líder</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Btn variant="primary" size="md" onClick={handleAssignRole} className="w-full md:w-auto">
              Atribuir
            </Btn>
          </div>
        </div>
      </Card>

      {/* Tabela completa */}
      <div id="todos-usuarios">
        <SectionHeader
          title="Todos os usuários"
          right={
            <span className="text-[11.5px] text-text-subtle tabular">
              {filteredCount}
              {roleFilters.size > 0 ? ` de ${totalUsers}` : ""} resultados
            </span>
          }
        />
      </div>
      <Card contentClassName="p-0">
        {isLoading ? (
          <div className="p-5">
            <LoadingState variant="skeleton" layout="table" count={5} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-5">
            <LinearEmpty
              icon={<UsersIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title={users.length === 0 ? "Nenhum usuário cadastrado" : "Nenhum resultado"}
              description={
                users.length === 0
                  ? "Clique em Criar usuário para adicionar o primeiro."
                  : "Ajuste os filtros para ver outros usuários."
              }
            />
          </div>
        ) : (
          <div>
            <div className="cell-header grid grid-cols-[2fr_1.4fr_1fr_100px] gap-5">
              <div>Pessoa</div>
              <div>Email</div>
              <div>Papel</div>
              <div className="text-right">Ações</div>
            </div>
            {filteredUsers.map((user, idx) => (
              <div
                key={user.id}
                className={`grid grid-cols-[2fr_1.4fr_1fr_100px] gap-5 items-center px-3.5 py-2.5 text-[13px] ${
                  idx < filteredUsers.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LinearAvatar name={user.full_name || "?"} size={24} />
                  <span className="font-medium truncate">{user.full_name || "Sem nome"}</span>
                </div>
                <div className="text-text-muted truncate">{user.email}</div>
                <div>
                  {user.role ? (
                    <StatusBadge kind="role" status={user.role} size="sm" />
                  ) : (
                    <span className="text-[11.5px] text-text-subtle">—</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {user.role && (
                    <Btn
                      variant="ghost"
                      size="xs"
                      onClick={() => setConfirmRemoveUserId(user.id)}
                      className="text-text-muted hover:bg-bg-subtle"
                      icon={<Shield className="w-3 h-3" strokeWidth={1.75} />}
                      title="Remover papel"
                    >
                      {""}
                    </Btn>
                  )}
                  {user.id !== currentAuthUser?.id && (
                    <Btn
                      variant="ghost"
                      size="xs"
                      onClick={() => setConfirmDeleteUserId(user.id)}
                      className="text-status-red hover:bg-status-red-soft"
                      icon={<UserX className="w-3 h-3" strokeWidth={1.75} />}
                      title="Excluir usuário"
                    >
                      {""}
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={!!confirmRemoveUserId} onOpenChange={() => setConfirmRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover papel do usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário perderá acesso às áreas restritas até receber um novo papel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveUserId && handleRemoveRole(confirmRemoveUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteUserId}
        onOpenChange={(open) => !open && setConfirmDeleteUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário do sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                <strong className="text-text">
                  {userBeingDeleted?.full_name || userBeingDeleted?.email || "Este usuário"}
                </strong>{" "}
                será removido definitivamente — conta de acesso, perfil, papel, vínculos
                com times e histórico. Essa ação é irreversível.
              </span>
              <span className="block mt-2 text-status-amber">
                Se o usuário tiver criado vagas, entrevistas ou outros registros, a exclusão
                será bloqueada — nesse caso, anonimize ou reatribua antes.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteUser.isPending}
              onClick={() => confirmDeleteUserId && handleDeleteUser(confirmDeleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiTile({
  label,
  value,
  detail,
  icon,
  delta,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  delta?: "good" | "bad";
}) {
  return (
    <div className="surface-paper p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
          {label}
        </div>
        <span className="text-text-muted">{icon}</span>
      </div>
      <div className="text-[26px] font-semibold tabular tracking-[-0.02em] mt-2 leading-[1.05]">
        {value}
      </div>
      <div
        className={`text-[11.5px] mt-1 ${
          delta === "good" ? "text-status-green" : delta === "bad" ? "text-status-red" : "text-text-muted"
        }`}
      >
        {detail}
      </div>
    </div>
  );
}
