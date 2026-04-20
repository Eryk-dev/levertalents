import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SectionCard,
  EmptyState,
  LoadingState,
} from "@/components/primitives";
import { useFitSurveys, useCreateFitSurvey, useUpdateFitSurvey } from "@/hooks/hiring/useCulturalFit";
import { CulturalFitQuestionEditor } from "@/components/hiring/CulturalFitQuestionEditor";

export default function CulturalFitTemplates() {
  const { data: surveys = [], isLoading } = useFitSurveys();
  const createSurvey = useCreateFitSurvey();
  const updateSurvey = useUpdateFitSurvey();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Fit cultural</h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            Gerencie os questionários que serão enviados aos candidatos
          </div>
        </div>
        <Button variant="accent" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Novo questionário
        </Button>
      </div>

      {isLoading ? (
        <LoadingState layout="list" count={3} />
      ) : surveys.length === 0 ? (
        <EmptyState
          title="Nenhum questionário"
          message="Crie o primeiro template para começar a enviar o Fit Cultural."
          action={
            <Button variant="accent" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo questionário
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {surveys.map((s) => (
            <SectionCard
              key={s.id}
              title={s.name}
              description={s.company_id ? "Escopo: empresa específica" : "Escopo: global"}
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(s.id)}>
                    Editar perguntas
                  </Button>
                  <Button
                    size="sm"
                    variant={s.active ? "secondary" : "default"}
                    onClick={() => updateSurvey.mutate({ id: s.id, patch: { active: !s.active } })}
                  >
                    {s.active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              }
            >
              <p className="text-xs text-muted-foreground">Criado em {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo questionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="survey-name">Nome</Label>
              <Input
                id="survey-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Fit Cultural — Empresa X"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  createSurvey.mutate(
                    { name: newName.trim(), company_id: null },
                    {
                      onSuccess: (row) => {
                        setCreateOpen(false);
                        setNewName("");
                        setEditingId(row.id);
                      },
                    },
                  )
                }
                disabled={createSurvey.isPending || newName.trim().length === 0}
              >
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(open) => (!open ? setEditingId(null) : undefined)}>
        <DialogContent className="max-w-[720px] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(92vh,820px)]">
          <DialogHeader className="border-b border-border bg-surface px-5 py-4 space-y-0.5 text-left">
            <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-text">
              Editor de perguntas
            </DialogTitle>
            <DialogDescription className="text-[12px] text-text-muted">
              {surveys.find((s) => s.id === editingId)?.name ?? "Questionário"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-linear px-5 py-4">
            {editingId ? <CulturalFitQuestionEditor surveyId={editingId} /> : null}
          </div>
          <div className="border-t border-border bg-surface px-5 py-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
