/**
 * AUTH-01/AUTH-02: Cadastro de pessoa com senha temporária via Edge Function.
 * Após sucesso, exibe OnboardingMessageBlock com mensagem WhatsApp pronta (D-20).
 * Pitfall §12: tempPassword armazenado apenas em local state — limpo no Concluir.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useCreateUserWithTempPassword } from "@/hooks/useCreateUserWithTempPassword";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OnboardingMessageBlock } from "@/components/OnboardingMessageBlock";
import { normalizeUsername, usernameSchemaMessage } from "@/lib/username";

const LEADER_ROLES = new Set(["lider", "socio", "admin"]);

const createUserSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  username: z
    .string()
    .transform(normalizeUsername)
    .pipe(z.string().regex(/^[a-z0-9][a-z0-9._-]{2,39}$/, usernameSchemaMessage)),
  // password field removed — Edge Function generates temp password (AUTH-02/D-21)
  role: z.enum(["admin", "socio", "lider", "rh", "liderado"], {
    required_error: "Selecione um papel",
  }),
  companyId: z.string().optional(),
  teamId: z.string().optional(),
  leaderId: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface OnboardingResult {
  fullName: string;
  username: string;
  tempPassword: string;
  expiresAt: string;
}

export default function CreateUser() {
  const navigate = useNavigate();
  const { companies, teams, users, loading: teamsLoading } = useTeams();
  const create = useCreateUserWithTempPassword();
  const { data: rhProfile } = useUserProfile();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  // Pitfall §12: tempPassword in local state only — cleared on Concluir/unmount
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [duplicateError, setDuplicateError] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'liderado' },
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

  const onSubmit = (data: CreateUserForm) => {
    setDuplicateError(false);
    const payload = {
      ...data,
      username: data.username,
      fullName: data.fullName.trim(),
      companyId: selectedCompanyId || undefined,
      orgUnitId: selectedTeamId || undefined,
    };

    create.mutate(payload, {
      onSuccess: (res) => {
        // Pitfall §12: store only in local state, clear on Concluir
        setResult({
          fullName: payload.fullName,
          username: payload.username,
          tempPassword: res.tempPassword,
          expiresAt: res.expiresAt,
        });
        reset();
        setSelectedCompanyId("");
        setSelectedTeamId("");
        setSelectedLeaderId("");
        toast.success("Pessoa cadastrada");
      },
      onError: (e) => {
        if (e.message === "duplicate_username") {
          setDuplicateError(true);
        } else {
          toast.error("Não foi possível cadastrar", { description: e.message });
        }
      },
    });
  };

  // Post-success: render OnboardingMessageBlock (D-20 WhatsApp message)
  if (result) {
    return (
      <div className="p-5 lg:p-7 max-w-[720px] mx-auto">
        <OnboardingMessageBlock
          fullName={result.fullName}
          username={result.username}
          tempPassword={result.tempPassword}
          expiresAt={result.expiresAt}
          rhFullName={rhProfile?.full_name ?? "RH"}
          onComplete={() => {
            // Clear tempPassword from memory before navigating (Pitfall §12)
            setResult(null);
            navigate("/admin");
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[720px] mx-auto animate-fade-in">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Cadastrar pessoa</h1>
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
          Voltar para a lista
        </Btn>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 surface-paper p-5 space-y-4">
        <CreateField label="Nome completo *" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" {...register("fullName")} placeholder="João Silva" />
        </CreateField>

        <CreateField label="Usuário *" htmlFor="username" error={errors.username?.message}>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            {...register("username")}
            placeholder="joao.silva"
          />
          {duplicateError && (
            <p className="text-[12px] text-status-red mt-1">
              Já existe uma pessoa com este usuário. Verifique antes de criar uma duplicada.
            </p>
          )}
        </CreateField>

        <CreateField label="Papel *" htmlFor="role" error={errors.role?.message}>
          <Select onValueChange={(value) => setValue("role", value as CreateUserForm["role"])}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecione o papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="liderado">Liderado</SelectItem>
              <SelectItem value="lider">Líder</SelectItem>
              <SelectItem value="rh">RH</SelectItem>
              <SelectItem value="socio">Sócio</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
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
            disabled={create.isPending}
          >
            {create.isPending ? "Cadastrando…" : "Cadastrar e gerar mensagem"}
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
