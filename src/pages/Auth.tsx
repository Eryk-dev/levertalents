import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LeverArrow } from "@/components/primitives/LeverArrow";
import wordmarkDark from "@/assets/lever-wordmark-dark.svg";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { normalizeUsername, usernameSchemaMessage, usernameToAuthEmail } from "@/lib/username";

const authSchema = z.object({
  username: z
    .string()
    .transform(normalizeUsername)
    .pipe(z.string().regex(/^[a-z0-9][a-z0-9._-]{2,39}$/, { message: usernameSchemaMessage })),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  full_name: z.string().trim().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }).optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getUserRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.role || "colaborador";
  }, []);

  const redirectByRole = useCallback((_role: string) => {
    navigate("/dashboard");
  }, [navigate]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const role = await getUserRole(session.user.id);
        redirectByRole(role);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const role = await getUserRole(session.user.id);
        redirectByRole(role);
      }
    });

    return () => subscription.unsubscribe();
  }, [getUserRole, redirectByRole]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin
        ? { username, password }
        : { username, password, full_name: fullName };

      const validated = authSchema.parse(validationData);

      if (isLogin) {
        const { data, error } = await supabase.functions.invoke("sign-in-with-username", {
          body: {
            username: validated.username,
            password: validated.password,
          },
        });
        if (error) throw error;
        const session = data?.session;
        if (!session?.access_token || !session?.refresh_token) {
          throw new Error("Credenciais inválidas");
        }
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (sessionError) throw sessionError;
        toast.success("Bem-vindo de volta.");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: usernameToAuthEmail(validated.username),
          password: validated.password,
          options: {
            data: { full_name: validated.full_name, username: validated.username },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada. Bem-vindo!");
        } else {
          toast.success("Conta criada. Confirme seu email para entrar.");
          setIsLogin(true);
        }
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else toast.error((error as Error).message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg font-sans text-text flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-5 lg:px-8 py-3.5">
          <img src={wordmarkDark} alt="Lever Talents" className="h-7 w-auto" />
          <p className="hidden md:block text-[11px] text-text-subtle uppercase tracking-[0.08em]">
            Volume I · Edição Contínua
          </p>
        </div>
      </header>

      {/* Split main: pitch left, form right */}
      <main className="flex-1 flex items-center justify-center px-5 lg:px-8 py-10">
        <div className="w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: pitch */}
          <section className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-text-subtle uppercase tracking-[0.06em] mb-4">
              <LeverArrow className="h-3 w-3 text-accent" variant="solid" />
              Manifesto
            </div>
            <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-text max-w-[20ch]">
              Contratar com método. Desenvolver com evidência.
            </h1>
            <p className="mt-5 text-[14px] leading-[1.6] text-text-muted max-w-[48ch]">
              Plataforma de performance e recrutamento para PMEs que se cansaram
              de decidir por achismo. Avaliações, PDIs, clima e hiring com a
              disciplina de quem entende que decisão certa começa em critério claro.
            </p>
            <div className="mt-8 flex flex-wrap gap-1.5">
              {["Método", "Evidência", "Critério", "Cultura", "ROI"].map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center h-[22px] px-2 text-[11.5px] font-medium rounded border border-border bg-surface text-text-muted"
                >
                  {w}
                </span>
              ))}
            </div>
          </section>

          {/* Right: form */}
          <section className="w-full max-w-[400px] lg:ml-auto">
            <div className="surface-raised p-6 md:p-7">
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-[10.5px] font-semibold text-text-subtle uppercase tracking-[0.06em]">
                  {isLogin ? "Acesso" : "Nova conta"}
                </p>
                <p className="text-[11px] text-text-subtle tabular">
                  § {isLogin ? "1.1" : "1.2"}
                </p>
              </div>

              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-text mb-1">
                {isLogin ? "Bem-vindo." : "Vamos começar."}
              </h2>
              <p className="text-[12.5px] text-text-muted mb-6">
                {isLogin
                  ? "Informe suas credenciais para entrar."
                  : "Preencha os dados para criar seu acesso."}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1.5 animate-fade-in">
                    <Label htmlFor="fullName" className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
                      Nome completo
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Seu nome"
                      autoComplete="name"
                      className="h-9 text-[13px]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
                    Usuário
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="nome.sobrenome"
                    autoComplete="username"
                    className="h-9 text-[13px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
                      Senha
                    </Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() =>
                          toast.info("Solicite redefinição ao administrador da sua empresa.")
                        }
                        className="text-[11px] text-text-muted hover:text-text transition-colors"
                      >
                        esqueci
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="h-9 text-[13px]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-text text-[hsl(var(--text-inverse))] hover:bg-[#1f2128] text-[13px] font-medium rounded-md gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isLogin ? "Entrando…" : "Criando conta…"}
                    </>
                  ) : (
                    <>
                      {isLogin ? "Entrar" : "Criar conta"}
                      <LeverArrow className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-border text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[12.5px] text-text-muted hover:text-text transition-colors"
                >
                  {isLogin ? (
                    <>
                      Primeira vez aqui? <span className="text-accent-text font-medium">Criar conta</span>
                    </>
                  ) : (
                    <>
                      Já tem acesso? <span className="text-accent-text font-medium">Entrar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10.5px] text-text-subtle uppercase tracking-[0.06em] mt-4 text-center">
              Privado por padrão · Criptografia em repouso e trânsito
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-4 flex items-center justify-between text-[11px] text-text-subtle">
          <span>© 2026 Lever Talents — Pessoas que alavancam resultados.</span>
          <span className="uppercase tracking-[0.06em]">v 2.0</span>
        </div>
      </footer>
    </div>
  );
}
