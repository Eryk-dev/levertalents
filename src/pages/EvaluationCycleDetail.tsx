import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Btn } from '@/components/primitives/LinearKit';
import { CycleResultsContent } from '@/components/CycleResultsDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useCloseCycle, useEvaluationCycles } from '@/hooks/useEvaluationCycles';

export default function EvaluationCycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const cyclesQuery = useEvaluationCycles();
  const closeCycle = useCloseCycle();
  const cycles = cyclesQuery.data ?? [];
  const cycle = cycles.find((c) => c.id === cycleId) ?? null;
  const canClose = userRole === 'rh' || userRole === 'socio' || userRole === 'admin';

  const handleCloseCycle = () => {
    if (!cycle) return;
    closeCycle.mutate(cycle.id, {
      onSuccess: () => toast.success('Ciclo encerrado'),
      onError: (e) =>
        toast.error('Não foi possível encerrar', { description: e.message }),
    });
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1040px] space-y-5">
        <header className="flex items-center justify-between gap-3">
          <Btn
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-3.5 w-3.5" />}
            onClick={() => navigate('/avaliacoes')}
          >
            Avaliações
          </Btn>
          {cycle && canClose && cycle.status !== 'closed' && (
            <Btn
              variant="secondary"
              size="sm"
              onClick={handleCloseCycle}
              disabled={closeCycle.isPending}
            >
              {closeCycle.isPending ? 'Encerrando...' : 'Encerrar ciclo'}
            </Btn>
          )}
        </header>

        {cyclesQuery.isLoading ? (
          <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center text-sm text-text-muted">
            Carregando avaliação...
          </div>
        ) : cycle ? (
          <CycleResultsContent cycle={cycle} />
        ) : (
          <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center">
            <h1 className="text-[16px] font-semibold text-text">Avaliação não encontrada</h1>
            <p className="mt-1 text-sm text-text-muted">
              O ciclo pode ter sido removido ou não está disponível no escopo atual.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
