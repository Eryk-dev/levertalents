import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Btn, Row } from "@/components/primitives/LinearKit";
import { useTeams } from "@/hooks/useTeams";

const LEADER_ROLES = new Set(["lider", "socio", "admin"]);

const createUserSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  role: z.enum(["admin", "socio", "lider", "rh", "colaborador"], {
    required_error: "Selecione um papel",
  }),
  companyId: z.string().optional(),
  teamId: z.string().optional(),
  leaderId: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function CreateUser() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { companies, teams, users, loading: teamsLoading } = useTeams();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
  });

  const teamsForCompany = useMemo(
    () => (selectedCompanyId ? teams.filter((t) => t.company_id === selectedCompanyId) : []),
    [teams, selectedCompanyId],
  );

  const leadersForTeam = useMemo(() => {
    const eligible = users.filter((u) => u.role && LEADER_ROLES.has(u.role));
    if (!selectedTeamId) return eligible;
    const team = teams.find((t) => t.id === selectedTeamId);
    if (team?.leader_id) {
      const leader = eligible.find((u) => u.id === team.leader_id);
      if (leader) return [leader, ...eligible.filter((u) => u.id !== leader.id)];
    }
    return eligible;
  }, [users, teams, selectedTeamId]);

  const onSubmit = async (data: CreateUserForm) => {
    try {
      setIsLoading(true);

      const { data: result, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          department: data.department || null,
          hireDate: data.hireDate || null,
          role: data.role,
          teamId: selectedTeamId || null,
          leaderId: selectedLeaderId || null,
        },
      });

      if (error) {
        let serverMessage: string | undefined;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.clone().json();
            serverMessage = body?.error || body?.msg || body?.message;
          } catch {
            /* noop */
          }
        }
        throw new Error(serverMessage || error.message || "Erro ao criar usuário");
      }
      if (!result?.success) throw new Error(result?.error || "Erro ao criar usuário");

      toast.success("Usuário criado com sucesso!");
      navigate("/admin");
    } catch (error: any) {
      console.error("Error creating user:", error);
      const msg: string = error?.message || "Erro ao criar usuário";
      const friendly = /already been registered|already registered|user.*exists/i.test(msg)
        ? "Este email já está cadastrado. Use outro ou peça reset de senha no Supabase."
        : /invalid/i.test(msg) && /email/i.test(msg)
        ? "Email inválido ou domínio bloqueado pelo Supabase. Tente outro email."
        : msg;
      toast.error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[720px] mx-auto animate-fade-in">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Criar usuário</h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            Adicione uma pessoa à base e defina seu papel inicial
          </div>
        </div>
        <Btn
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />}
          onClick={() => navigate("/admin")}
        >
          Voltar
        </Btn>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 surface-paper p-5 space-y-4">
        <CreateField label="Nome completo *" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" {...register("fullName")} placeholder="João Silva" />
        </CreateField>

        <CreateField label="Email *" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="joao.silva@exemplo.com"
          />
        </CreateField>

        <CreateField label="Senha *" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            {...register("password")}
            placeholder="Mínimo 6 caracteres"
          />
        </CreateField>

        <CreateField label="Papel *" htmlFor="role" error={errors.role?.message}>
          <Select onValueChange={(value) => setValue("role", value as any)}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecione o papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="colaborador">Colaborador</SelectItem>
              <SelectItem value="lider">Líder</SelectItem>
              <SelectItem value="rh">RH</SelectItem>
              <SelectItem value="socio">Sócio</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </CreateField>

        <CreateField label="Departamento" htmlFor="department">
          <Input id="department" {...register("department")} placeholder="TI, RH, Comercial..." />
        </CreateField>

        <CreateField label="Data de contratação" htmlFor="hireDate">
          <Input id="hireDate" type="date" {...register("hireDate")} />
        </CreateField>

        <div className="pt-1">
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold mb-3">
            Vínculo (opcional)
          </div>

          <div className="space-y-4">
            <CreateField label="Empresa" htmlFor="companyId">
              <Select
                value={selectedCompanyId}
                onValueChange={(value) => {
                  setSelectedCompanyId(value);
                  setSelectedTeamId("");
                  setSelectedLeaderId("");
                  setValue("companyId", value);
                  setValue("teamId", undefined);
                  setValue("leaderId", undefined);
                }}
                disabled={teamsLoading || companies.length === 0}
              >
                <SelectTrigger id="companyId">
                  <SelectValue
                    placeholder={
                      teamsLoading
                        ? "Carregando empresas..."
                        : companies.length === 0
                        ? "Nenhuma empresa cadastrada"
                        : "Selecione uma empresa"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CreateField>

            <CreateField label="Time" htmlFor="teamId">
              <Select
                value={selectedTeamId}
                onValueChange={(value) => {
                  setSelectedTeamId(value);
                  setValue("teamId", value);
                  const team = teams.find((t) => t.id === value);
                  if (team?.leader_id) {
                    setSelectedLeaderId(team.leader_id);
                    setValue("leaderId", team.leader_id);
                  }
                }}
                disabled={!selectedCompanyId || teamsForCompany.length === 0}
              >
                <SelectTrigger id="teamId">
                  <SelectValue
                    placeholder={
                      !selectedCompanyId
                        ? "Selecione uma empresa primeiro"
                        : teamsForCompany.length === 0
                        ? "Nenhum time nessa empresa"
                        : "Selecione um time"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {teamsForCompany.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CreateField>

            <CreateField label="Gestor" htmlFor="leaderId">
              <Select
                value={selectedLeaderId}
                onValueChange={(value) => {
                  setSelectedLeaderId(value);
                  setValue("leaderId", value);
                }}
                disabled={leadersForTeam.length === 0}
              >
                <SelectTrigger id="leaderId">
                  <SelectValue
                    placeholder={
                      leadersForTeam.length === 0
                        ? "Nenhum gestor disponível"
                        : "Selecione um gestor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {leadersForTeam.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CreateField>
          </div>
        </div>

        <Row gap={12} className="pt-3">
          <Btn
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 justify-center"
            onClick={() => navigate("/admin")}
          >
            Cancelar
          </Btn>
          <Btn
            type="submit"
            variant="primary"
            size="md"
            className="flex-1 justify-center"
            disabled={isLoading}
          >
            {isLoading ? "Criando..." : "Salvar"}
          </Btn>
        </Row>
      </form>
    </div>
  );
}

function CreateField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold"
      >
        {label}
      </Label>
      {children}
      {error && <p className="text-[12px] text-status-red">{error}</p>}
    </div>
  );
}
