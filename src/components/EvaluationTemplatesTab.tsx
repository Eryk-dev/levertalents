import { useState } from 'react';
import { Plus, Pencil, Star, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Btn, Chip } from '@/components/primitives/LinearKit';
import {
  useEvaluationTemplates,
  useUpdateTemplate,
  useDeleteTemplate,
} from '@/hooks/useEvaluationTemplates';
import { CreateTemplateDialog } from '@/components/CreateTemplateDialog';
import { EvaluationTemplateEditor } from '@/components/EvaluationTemplateEditor';
import { toast } from 'sonner';

export interface EvaluationTemplatesTabProps {
  companyId: string;
}

export function EvaluationTemplatesTab({ companyId }: EvaluationTemplatesTabProps) {
  const templates = useEvaluationTemplates();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const all = (templates.data ?? []).filter((t) => t.company_id === companyId);
  const editing = all.find((t) => t.id === editingId) ?? null;
  const confirming = all.find((t) => t.id === confirmDeleteId) ?? null;

  const setAsDefault = (id: string) => {
    const target = all.find((t) => t.id === id);
    if (!target) return;
    const others = all.filter((t) => t.id !== id && t.is_default);
    Promise.all(
      others.map((t) =>
        updateTemplate.mutateAsync({ id: t.id, is_default: false }),
      ),
    )
      .then(() => updateTemplate.mutateAsync({ id, is_default: true }))
      .then(() => toast.success(`"${target.name}" agora é o template padrão`))
      .catch((e) =>
        toast.error('Não foi possível atualizar', { description: (e as Error).message }),
      );
  };

  const handleDelete = () => {
    if (!confirming) return;
    deleteTemplate.mutate(confirming.id, {
      onSuccess: () => {
        toast.success('Template excluído');
        setConfirmDeleteId(null);
        if (editingId === confirming.id) setEditingId(null);
      },
      onError: (e) =>
        toast.error('Não foi possível excluir', { description: e.message }),
    });
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-muted">
          Templates definem as seções e perguntas usadas em cada ciclo desta empresa.
        </p>
        <Btn variant="accent" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Novo template
        </Btn>
      </div>

      {templates.isLoading ? (
        <div className="text-center py-8 text-sm text-text-muted">Carregando…</div>
      ) : all.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-subtle/40 px-4 py-10 text-center">
          <h3 className="text-[15px] font-semibold text-text">Nenhum template ainda</h3>
          <p className="text-sm text-text-muted mt-1">
            Crie um template para começar a abrir ciclos de avaliação.
          </p>
          <Btn
            variant="accent"
            size="sm"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Criar primeiro template
          </Btn>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {all.map((t) => {
            const sectionCount = countSections(t.schema_json);
            const questionCount = countQuestions(t.schema_json);
            return (
              <li
                key={t.id}
                className="rounded-md border border-border bg-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-semibold text-text truncate">{t.name}</h4>
                      {t.is_default && (
                        <Chip color="accent" size="sm">
                          Padrão
                        </Chip>
                      )}
                    </div>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      {sectionCount} {sectionCount === 1 ? 'seção' : 'seções'} ·{' '}
                      {questionCount} {questionCount === 1 ? 'pergunta' : 'perguntas'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(t.id)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  {!t.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAsDefault(t.id)}
                      disabled={updateTemplate.isPending}
                    >
                      <Star className="mr-1 h-3.5 w-3.5" /> Marcar como padrão
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-text-muted hover:text-status-red"
                    onClick={() => setConfirmDeleteId(t.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companyId={companyId}
        onCreated={(id) => setEditingId(id)}
      />

      <Dialog
        open={!!editingId}
        onOpenChange={(open) => (!open ? setEditingId(null) : undefined)}
      >
        <DialogContent className="max-w-[760px] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(92vh,860px)]">
          <DialogHeader className="border-b border-border bg-surface px-5 py-4 space-y-0.5 text-left">
            <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-text">
              Editor de template
            </DialogTitle>
            <DialogDescription className="text-[12px] text-text-muted">
              Mudanças são salvas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {editing ? <EvaluationTemplateEditor template={editing} /> : null}
          </div>
          <div className="border-t border-border bg-surface px-5 py-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => (!open ? setConfirmDeleteId(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming
                ? `"${confirming.name}" será removido. Ciclos já abertos com este template não são afetados.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-status-red text-white hover:bg-status-red/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function countSections(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const sections = (raw as { sections?: unknown }).sections;
  return Array.isArray(sections) ? sections.length : 0;
}

function countQuestions(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const sections = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((acc: number, s) => {
    const qs = (s as { questions?: unknown }).questions;
    return acc + (Array.isArray(qs) ? qs.length : 0);
  }, 0);
}
