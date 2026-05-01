import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateClimateSurvey } from "@/hooks/useClimateSurveys";
import { useScope } from "@/app/providers/ScopeProvider";
import { handleSupabaseError } from "@/lib/supabaseError";
import { Btn, Col, Row } from "@/components/primitives/LinearKit";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (surveyId: string) => void;
}

/**
 * Dialog de criação de pesquisa de clima — padrão Linear
 * (labels uppercase caps 10.5px, inputs densos).
 */
export function ClimateSurveyFormDialog({ open, onOpenChange, onCreated }: Props) {
  const createSurvey = useCreateClimateSurvey();
  const { scope, visibleCompanies } = useScope();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [companyId, setCompanyId] = useState("");

  const scopeCompanies = useMemo(() => {
    if (!scope) return [];
    const allowed = new Set(scope.companyIds);
    return visibleCompanies.filter((company) => allowed.has(company.id));
  }, [scope, visibleCompanies]);

  useEffect(() => {
    if (!open) return;
    if (scope?.companyIds.length === 1) {
      setCompanyId(scope.companyIds[0]);
      return;
    }
    setCompanyId("");
  }, [open, scope]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStatus("draft");
    setCompanyId(scope?.companyIds.length === 1 ? scope.companyIds[0] : "");
  };

  const handleSubmit = async () => {
    if (!title || !startDate || !endDate) return;
    if (!companyId) {
      toast.error("Selecione a empresa da pesquisa.");
      return;
    }
    if (startDate > endDate) {
      toast.error("A data de início deve ser anterior ou igual à data de fim.");
      return;
    }
    try {
      const created = await createSurvey.mutateAsync({
        company_id: companyId,
        title: title.trim(),
        description: description || undefined,
        start_date: startDate,
        end_date: endDate,
        status,
      });
      reset();
      onOpenChange(false);
      onCreated?.(created.id);
    } catch (err) {
      handleSupabaseError(err as Error, "Erro ao criar pesquisa");
    }
  };

  const inputBase =
    "w-full h-[34px] px-2.5 text-[13px] text-text bg-surface border border-border rounded-md outline-none focus:border-border-focus transition-colors font-sans";
  const textareaBase =
    "w-full min-h-[70px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova pesquisa de clima</DialogTitle>
          <DialogDescription>
            Depois de criar, adicione perguntas antes de ativar.
          </DialogDescription>
        </DialogHeader>

        <Col gap={14}>
          <FieldLabel label="Título" htmlFor="survey-title">
            <input
              id="survey-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Clima Q2 2026"
              className={inputBase}
            />
          </FieldLabel>

          {scopeCompanies.length > 1 && (
            <FieldLabel label="Empresa" htmlFor="survey-company">
              <select
                id="survey-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className={`${inputBase} appearance-none cursor-pointer`}
              >
                <option value="">Selecione a empresa</option>
                {scopeCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
          )}

          <FieldLabel label="Descrição" htmlFor="survey-desc" optional>
            <textarea
              id="survey-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Contexto breve da pesquisa…"
              className={textareaBase}
            />
          </FieldLabel>

          <Row gap={10} align="start">
            <FieldLabel label="Início" htmlFor="survey-start" className="flex-1">
              <input
                id="survey-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputBase}
              />
            </FieldLabel>
            <FieldLabel label="Fim" htmlFor="survey-end" className="flex-1">
              <input
                id="survey-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputBase}
              />
            </FieldLabel>
          </Row>

          <FieldLabel label="Status inicial" htmlFor="survey-status">
            <select
              id="survey-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "active")}
              className={`${inputBase} appearance-none cursor-pointer`}
            >
              <option value="draft">Rascunho (não aparece para colaboradores)</option>
              <option value="active">Ativa (começa a aceitar respostas)</option>
            </select>
          </FieldLabel>
        </Col>

        <DialogFooter>
          <Btn variant="secondary" size="md" onClick={() => onOpenChange(false)}>
            Cancelar
          </Btn>
          <Btn
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!title.trim() || !startDate || !endDate || !companyId || createSurvey.isPending}
          >
            {createSurvey.isPending ? "Criando…" : "Criar pesquisa"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Helper ───────────────────────────────────────────────── */

function FieldLabel({
  label,
  htmlFor,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={htmlFor}
          className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text"
        >
          {label}
        </label>
        {optional && <span className="text-[11px] text-text-subtle">Opcional</span>}
      </div>
      {children}
    </div>
  );
}
