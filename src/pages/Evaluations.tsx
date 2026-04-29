import { useState } from 'react';
import { toast } from 'sonner';
import { Btn } from '@/components/primitives/LinearKit';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { CycleCard } from '@/components/CycleCard';
import { CreateCycleDialog } from '@/components/CreateCycleDialog';
import { EvaluationTemplatesTab } from '@/components/EvaluationTemplatesTab';
import { useEvaluationCycles, useDeleteCycle } from '@/hooks/useEvaluationCycles';
import { useScope } from '@/app/providers/ScopeProvider';
import { useAuth } from '@/hooks/useAuth';

export default function EvaluationsPage() {
  const cyclesQuery = useEvaluationCycles();
  const deleteCycle = useDeleteCycle();
  const { scope } = useScope();
  const { userRole } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const all = cyclesQuery.data ?? [];
  const active = all.filter((c) => c.status === 'active' || c.status === 'draft');
  const closed = all.filter((c) => c.status === 'closed');
  const confirming = all.find((c) => c.id === confirmDeleteId) ?? null;

  const canDelete =
    userRole === 'rh' || userRole === 'socio' || userRole === 'admin';

  const handleDelete = () => {
    if (!confirming) return;
    deleteCycle.mutate(confirming.id, {
      onSuccess: () => {
        toast.success('Ciclo excluído');
        if (selectedCycleId === confirming.id) setSelectedCycleId(null);
        setConfirmDeleteId(null);
      },
      onError: (e) =>
        toast.error('Não foi possível excluir', { description: e.message }),
    });
  };

  const canManageTemplates =
    userRole === 'rh' || userRole === 'socio' || userRole === 'admin';

  // companyId for create dialog: first company in current scope
  const firstCompanyId =
    scope?.kind === 'company'
      ? scope.id
      : (scope?.companyIds?.[0] ?? null);

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Avaliações</h1>
        {firstCompanyId && (
          <Btn variant="accent" onClick={() => setDialogOpen(true)}>
            Criar ciclo
          </Btn>
        )}
      </header>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Em andamento ({active.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Encerrados ({closed.length})
          </TabsTrigger>
          {canManageTemplates && firstCompanyId && (
            <TabsTrigger value="templates">Templates</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active">
          {active.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-[15px] font-semibold text-text">
                Nenhum ciclo de avaliação aberto
              </h3>
              <p className="text-sm text-text-subtle mt-2">
                Abra um ciclo para coletar avaliações entre líderes e liderados desta empresa.
              </p>
              {firstCompanyId && (
                <Btn
                  variant="accent"
                  onClick={() => setDialogOpen(true)}
                  className="mt-4"
                >
                  Criar ciclo
                </Btn>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {active.map((c) => (
                <CycleCard
                  key={c.id}
                  cycle={c}
                  selected={selectedCycleId === c.id}
                  onClick={() => setSelectedCycleId(c.id)}
                  onDelete={canDelete ? () => setConfirmDeleteId(c.id) : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {closed.map((c) => (
              <CycleCard
                key={c.id}
                cycle={c}
                onDelete={canDelete ? () => setConfirmDeleteId(c.id) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        {canManageTemplates && firstCompanyId && (
          <TabsContent value="templates">
            <EvaluationTemplatesTab companyId={firstCompanyId} />
          </TabsContent>
        )}
      </Tabs>

      {firstCompanyId && (
        <CreateCycleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={firstCompanyId}
        />
      )}

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => (!open ? setConfirmDeleteId(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ciclo de avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming
                ? `"${confirming.name}" e todas as avaliações ligadas a ele serão removidos. Esta ação não pode ser desfeita.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCycle.isPending}
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
