import { useState } from "react";
import { useParams } from "react-router-dom";
import wordmarkDark from "@/assets/lever-wordmark-dark.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { usePublicFitForm } from "@/hooks/hiring/useCulturalFit";

export default function PublicCulturalFit() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicFitForm(token);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const url = `${(import.meta.env.VITE_SUPABASE_URL as string) ?? ""}/functions/v1/hiring-submit-fit-cultural-public`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, honeypot, responses }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((payload as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <img src={wordmarkDark} alt="Lever Talents" className="h-8 w-auto" />
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando questionário…</p>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {(error as Error).message.includes("expirado") || (error as Error).message.includes("utilizado")
              ? "Este link expirou ou já foi utilizado."
              : `Não foi possível carregar o questionário: ${(error as Error).message}`}
          </div>
        ) : submitted ? (
          <div className="rounded-md border border-status-green/30 bg-status-green/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-status-green">Obrigado!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Suas respostas foram enviadas com sucesso.</p>
          </div>
        ) : data ? (
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">{data.survey?.name ?? "Fit Cultural"}</h1>
              <p className="text-sm text-muted-foreground">
                Responda com sinceridade — não há respostas certas ou erradas.
              </p>
            </div>

            <div aria-hidden className="sr-only" style={{ display: "none" }}>
              <Label htmlFor="website">Website (deixe vazio)</Label>
              <Input
                id="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {data.questions.map((q) => (
              <div key={q.id} className="space-y-2 rounded-md border border-border bg-card p-4">
                <Label className="font-medium">{q.prompt}</Label>
                {q.kind === "scale" ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      { length: (q.scale_max ?? 5) - (q.scale_min ?? 1) + 1 },
                      (_, i) => (q.scale_min ?? 1) + i,
                    ).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`rounded-md border px-3 py-1 text-sm ${
                          responses[q.id] === n
                            ? "bg-accent-soft border-accent text-accent-text font-medium"
                            : "border-border text-text hover:bg-bg-subtle"
                        }`}
                        onClick={() => setResponses({ ...responses, [q.id]: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : q.kind === "multi_choice" ? (
                  <RadioGroup
                    value={(responses[q.id] as string) ?? ""}
                    onValueChange={(v) => setResponses({ ...responses, [q.id]: v })}
                  >
                    {(Array.isArray(q.options) ? (q.options as string[]) : []).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={opt} /> {opt}
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <Textarea
                    rows={3}
                    value={(responses[q.id] as string) ?? ""}
                    onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                  />
                )}
              </div>
            ))}

            {submitError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Enviando…" : "Enviar respostas"}
            </Button>
          </form>
        ) : null}
      </main>
    </div>
  );
}
