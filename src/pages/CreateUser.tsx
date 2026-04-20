import { useState } from "react";
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

// TODO: Os campos Time/Empresa/Gestor precisam que a edge function
// `create-user` aceite esses parâmetros e faça o insert correspondente
// em `team_members` após criar o usuário. Manter no formulário só geraria
// divergência com o backend; melhor adicionar em uma passada de backend.

const createUserSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  role: z.enum(["admin", "socio", "lider", "rh", "colaborador"], {
    required_error: "Selecione um papel",
  }),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function CreateUser() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
  });

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
