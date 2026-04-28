import { useState } from 'react';
import { Info } from 'lucide-react';
import { Btn, SectionHeader } from '@/components/primitives/LinearKit';
import { ClimateAggregateCard } from '@/components/ClimateAggregateCard';
import { ClimateSurveyFormDialog } from '@/components/ClimateSurveyFormDialog';
import { ClimateQuestionsDialog } from '@/components/ClimateQuestionsDialog';
import { ClimateAnswerDialog } from '@/components/ClimateAnswerDialog';
import { useClimateSurveys } from '@/hooks/useClimateSurveys';
import { useAuth } from '@/hooks/useAuth';

/**
 * PERF-05, PERF-06, D-11 (UI enforcement):
 * - Banner "100% anônima" is mandatory and permanent (UI-SPEC §Climate response form).
 * - Grid of ClimateAggregateCards — each card is k-anon-aware (D-10 via hook).
 * - No user identity rendered in the response flow (ClimateAnswerDialog uses submit_climate_response RPC).
 * - Surveys scoped by company via useClimateSurveys → useScopedQuery (D-25, PERF-06).
 */
export default function Climate() {
  const surveys = useClimateSurveys();
  const { userRole } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<{ id: string; title: string } | null>(null);
  const [answerTarget, setAnswerTarget] = useState<{ id: string; title: string } | null>(null);

  const canManage = userRole === 'rh' || userRole === 'socio' || userRole === 'admin';
  const active = (surveys.data ?? []).filter((s) => s.status === 'active');
  const all = surveys.data ?? [];

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Clima</h1>
        {canManage && (
          <Btn variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
            Disparar pesquisa
          </Btn>
        )}
      </header>

      {/* Banner anônima — UI-SPEC §Climate response form (mandatory, no toggle) */}
      <div
        className="bg-status-blue-soft border border-status-blue/30 rounded p-3 mb-6 flex items-start gap-2"
        aria-label="Esta pesquisa é 100% anônima."
      >
        <Info className="size-4 text-status-blue mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Esta pesquisa é 100% anônima.</p>
          <p className="text-xs text-text-subtle">Suas respostas não ficam vinculadas a você.</p>
        </div>
      </div>

      {/* Pesquisas ativas — grid de ClimateAggregateCards (k-anon-aware, D-10) */}
      <SectionHeader
        title="Pesquisas ativas"
        right={
          <span className="text-[11.5px] text-text-subtle tabular">
            {active.length} ativa{active.length !== 1 ? 's' : ''}
          </span>
        }
      />

      {active.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-[16px] font-semibold text-text tracking-[-0.01em]">
            Nenhuma pesquisa de clima ativa
          </h3>
          <p className="text-sm text-text-subtle mt-2">
            Dispare uma pesquisa para entender o clima desta empresa nesta janela.
          </p>
          {canManage && (
            <Btn variant="primary" size="sm" onClick={() => setDialogOpen(true)} className="mt-4">
              Disparar pesquisa
            </Btn>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((s) => (
            <ClimateAggregateCard
              key={s.id}
              surveyId={s.id}
              surveyName={s.title}
            />
          ))}
        </div>
      )}

      {/* All surveys list (for answering + managing) */}
      {all.length > 0 && (
        <>
          <SectionHeader
            title="Todas as pesquisas"
            right={
              <span className="text-[11.5px] text-text-subtle tabular">{all.length} total</span>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {all.map((s) => (
              <div key={s.id} className="surface-paper p-3.5">
                <div className="text-[14px] font-semibold text-text tracking-[-0.01em] line-clamp-2">
                  {s.title}
                </div>
                {s.description && (
                  <div className="text-[11.5px] text-text-muted mt-1 line-clamp-2">
                    {s.description}
                  </div>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {canManage && (
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => setManageTarget({ id: s.id, title: s.title })}
                    >
                      Perguntas
                    </Btn>
                  )}
                  {s.status === 'active' && (
                    <Btn
                      variant="primary"
                      size="sm"
                      aria-label="Pesquisa de clima — anônima"
                      onClick={() => setAnswerTarget({ id: s.id, title: s.title })}
                    >
                      Responder
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dialogs */}
      <ClimateSurveyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ClimateQuestionsDialog
        open={!!manageTarget}
        onOpenChange={(v) => !v && setManageTarget(null)}
        surveyId={manageTarget?.id}
        surveyTitle={manageTarget?.title}
      />
      {/* D-11: ClimateAnswerDialog submit uses RPC submit_climate_response (no user_id).
           aria-label on Responder button signals anonymous form intent. */}
      <ClimateAnswerDialog
        open={!!answerTarget}
        onOpenChange={(v) => !v && setAnswerTarget(null)}
        surveyId={answerTarget?.id}
        surveyTitle={answerTarget?.title}
      />
    </div>
  );
}
