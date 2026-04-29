import { useMemo, useState } from 'react';
import { Users, Building2, UserSearch, Search, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Btn, Chip } from '@/components/primitives/LinearKit';
import { useEvaluationTemplates } from '@/hooks/useEvaluationTemplates';
import {
  useCreateCycle,
  type AudienceKind,
  type EvaluationDirection,
} from '@/hooks/useEvaluationCycles';
import { useOrgUnits } from '@/features/org-structure/hooks/useOrgUnits';
import { useCompanyPeople } from '@/hooks/useCompanyPeople';
import { useCycleAudiencePreview } from '@/hooks/useCycleAudiencePreview';
import { toast } from 'sonner';

export interface CreateCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

type Step = 1 | 2 | 3;

const DIRECTION_META: Record<
  EvaluationDirection,
  { label: string; description: string }
> = {
  self: {
    label: 'Auto-avaliação',
    description: 'Cada participante se avalia.',
  },
  leader_to_member: {
    label: 'Líder avalia liderado',
    description: 'O líder direto avalia cada participante.',
  },
  member_to_leader: {
    label: 'Liderado avalia líder',
    description: 'Cada participante avalia o próprio líder.',
  },
  peer: {
    label: 'Pares (peer)',
    description: 'Colegas do mesmo time se avaliam entre si.',
  },
};

export function CreateCycleDialog({
  open,
  onOpenChange,
  companyId,
}: CreateCycleDialogProps) {
  const templates = useEvaluationTemplates();
  const orgUnits = useOrgUnits(companyId);
  const people = useCompanyPeople(companyId);
  const create = useCreateCycle();

  const [step, setStep] = useState<Step>(1);

  // Step 1: template + name + dates
  const [templateId, setTemplateId] = useState<string>('');
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  // Step 2: audience
  const [audienceKind, setAudienceKind] = useState<AudienceKind>('company');
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [peopleQuery, setPeopleQuery] = useState('');

  // Step 3: directions
  const [directions, setDirections] = useState<EvaluationDirection[]>([
    'self',
    'leader_to_member',
  ]);

  const filteredTemplates = (templates.data ?? []).filter(
    (t) => t.company_id === companyId,
  );
  const orgUnitList = orgUnits.data ?? [];
  const peopleList = useMemo(() => people.data ?? [], [people.data]);

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return peopleList;
    return peopleList.filter((p) => p.full_name.toLowerCase().includes(q));
  }, [peopleQuery, peopleList]);

  const previewInput = useMemo(() => {
    if (audienceKind !== 'company' && audienceIds.length === 0) return null;
    return {
      companyId,
      audienceKind,
      audienceIds,
      includeDescendants,
      directions,
    };
  }, [companyId, audienceKind, audienceIds, includeDescendants, directions]);

  const preview = useCycleAudiencePreview(step === 3 ? previewInput : null);

  const reset = () => {
    setStep(1);
    setTemplateId('');
    setName('');
    setStartsAt('');
    setEndsAt('');
    setAudienceKind('company');
    setAudienceIds([]);
    setIncludeDescendants(true);
    setPeopleQuery('');
    setDirections(['self', 'leader_to_member']);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const step1Valid =
    !!templateId &&
    name.trim().length > 0 &&
    !!startsAt &&
    !!endsAt &&
    new Date(endsAt) > new Date(startsAt);

  const step2Valid =
    audienceKind === 'company' || audienceIds.length > 0;

  const step3Valid = directions.length > 0;

  const toggleDirection = (d: EvaluationDirection) => {
    setDirections((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const toggleAudienceId = (id: string) => {
    setAudienceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSubmit = () => {
    if (!step1Valid || !step2Valid || !step3Valid) return;
    create.mutate(
      {
        company_id: companyId,
        template_id: templateId,
        name: name.trim(),
        starts_at: startsAt,
        ends_at: endsAt,
        audience_kind: audienceKind,
        audience_ids: audienceKind === 'company' ? [] : audienceIds,
        include_descendants: includeDescendants,
        directions,
      },
      {
        onSuccess: () => {
          toast.success('Ciclo aberto');
          handleClose(false);
        },
        onError: (e) =>
          toast.error('Não foi possível abrir ciclo', { description: e.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[640px]">
        <DialogTitle>Criar ciclo de avaliação</DialogTitle>
        <DialogDescription>
          {step === 1 && 'Etapa 1 de 3 — escolha o template e a janela do ciclo.'}
          {step === 2 && 'Etapa 2 de 3 — defina quem vai participar.'}
          {step === 3 && 'Etapa 3 de 3 — selecione as direções e revise.'}
        </DialogDescription>

        <div className="mt-2 mb-1">
          <StepIndicator step={step} />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-text-muted">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.length === 0 ? (
                    <div className="px-2 py-1.5 text-[12px] text-text-muted">
                      Nenhum template ainda. Crie um na aba Templates.
                    </div>
                  ) : (
                    filteredTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.is_default ? ' (padrão)' : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-medium text-text-muted">Nome do ciclo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q1 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-text-muted">Início</Label>
                <Input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[12px] font-medium text-text-muted">Fim</Label>
                <Input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
                {endsAt && startsAt && new Date(endsAt) <= new Date(startsAt) && (
                  <p className="text-[11px] text-status-red">
                    Fim precisa ser depois do início.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <RadioGroup
              value={audienceKind}
              onValueChange={(v) => {
                setAudienceKind(v as AudienceKind);
                setAudienceIds([]);
              }}
              className="grid grid-cols-1 gap-2"
            >
              <AudienceOption
                value="company"
                icon={Building2}
                label="Empresa toda"
                description="Todos os colaboradores ligados a um time da empresa."
                selected={audienceKind === 'company'}
              />
              <AudienceOption
                value="org_unit"
                icon={Users}
                label="Time ou setor"
                description="Selecione 1 ou mais times. Pode incluir subequipes."
                selected={audienceKind === 'org_unit'}
              />
              <AudienceOption
                value="manual"
                icon={UserSearch}
                label="Pessoas específicas"
                description="Escolha colaboradores um a um."
                selected={audienceKind === 'manual'}
              />
            </RadioGroup>

            {audienceKind === 'org_unit' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-medium text-text-muted">
                    Times selecionados ({audienceIds.length})
                  </Label>
                  <label className="inline-flex items-center gap-2 text-[12px] text-text-muted cursor-pointer">
                    <Checkbox
                      checked={includeDescendants}
                      onCheckedChange={(v) => setIncludeDescendants(v === true)}
                    />
                    Incluir subequipes
                  </label>
                </div>
                <div className="rounded-md border border-border max-h-[200px] overflow-y-auto">
                  {orgUnitList.length === 0 ? (
                    <div className="px-3 py-4 text-[12px] text-text-muted text-center">
                      Nenhum time cadastrado nesta empresa.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {orgUnitList.map((u) => (
                        <li key={u.id}>
                          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-subtle/50">
                            <Checkbox
                              checked={audienceIds.includes(u.id)}
                              onCheckedChange={() => toggleAudienceId(u.id)}
                            />
                            <span className="text-[13px] text-text">{u.name}</span>
                            {u.kind && (
                              <Chip color="neutral" size="sm" className="ml-auto">
                                {u.kind}
                              </Chip>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {audienceKind === 'manual' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-medium text-text-muted">
                    Pessoas selecionadas ({audienceIds.length})
                  </Label>
                  {audienceIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAudienceIds([])}
                      className="text-[11px] text-text-muted hover:text-text inline-flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Limpar
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                  <Input
                    placeholder="Buscar por nome…"
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="rounded-md border border-border max-h-[220px] overflow-y-auto">
                  {filteredPeople.length === 0 ? (
                    <div className="px-3 py-4 text-[12px] text-text-muted text-center">
                      {peopleList.length === 0
                        ? 'Nenhum colaborador cadastrado nesta empresa.'
                        : 'Nada encontrado.'}
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredPeople.map((p) => {
                        const checked = audienceIds.includes(p.id);
                        return (
                          <li key={p.id}>
                            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-subtle/50">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleAudienceId(p.id)}
                              />
                              <span className="text-[13px] text-text">{p.full_name}</span>
                              {checked && (
                                <Check className="ml-auto h-3 w-3 text-status-green" />
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[12px] font-medium text-text-muted">
                Direções de avaliação
              </Label>
              <ul className="grid grid-cols-1 gap-2">
                {(Object.keys(DIRECTION_META) as EvaluationDirection[]).map((d) => (
                  <li key={d}>
                    <label className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 cursor-pointer hover:bg-bg-subtle/40">
                      <Checkbox
                        checked={directions.includes(d)}
                        onCheckedChange={() => toggleDirection(d)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-[13px] font-medium text-text">
                          {DIRECTION_META[d].label}
                        </p>
                        <p className="text-[11.5px] text-text-muted">
                          {DIRECTION_META[d].description}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-border bg-bg-subtle/30 p-3">
              <p className="text-[12px] font-semibold text-text">Pré-visualização</p>
              {preview.isLoading ? (
                <p className="text-[12px] text-text-muted mt-1">Calculando…</p>
              ) : preview.data ? (
                <PreviewSummary data={preview.data} directions={directions} />
              ) : (
                <p className="text-[12px] text-text-muted mt-1">
                  Selecione audiência e direções para ver o resumo.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          {step > 1 ? (
            <Btn variant="ghost" type="button" onClick={() => setStep((s) => (s - 1) as Step)}>
              Voltar
            </Btn>
          ) : (
            <Btn variant="ghost" type="button" onClick={() => handleClose(false)}>
              Cancelar
            </Btn>
          )}
          {step < 3 ? (
            <Btn
              variant="accent"
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            >
              Continuar
            </Btn>
          ) : (
            <Btn
              variant="accent"
              type="button"
              onClick={onSubmit}
              disabled={
                !step1Valid || !step2Valid || !step3Valid || create.isPending
              }
            >
              {create.isPending ? 'Abrindo…' : 'Abrir ciclo'}
            </Btn>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className={
              i === step
                ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-[hsl(var(--accent-foreground))]'
                : i < step
                  ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-status-green text-[10px] font-semibold text-white'
                  : 'inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-text-muted'
            }
          >
            {i < step ? <Check className="h-3 w-3" /> : i}
          </span>
          {i < 3 && (
            <span
              className={
                i < step ? 'h-px w-8 bg-status-green' : 'h-px w-8 bg-border'
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface AudienceOptionProps {
  value: AudienceKind;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
}

function AudienceOption({
  value,
  label,
  description,
  icon: Icon,
  selected,
}: AudienceOptionProps) {
  return (
    <label
      className={
        selected
          ? 'flex items-start gap-3 rounded-md border-2 border-accent bg-accent-soft/30 px-3 py-2.5 cursor-pointer'
          : 'flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 cursor-pointer hover:bg-bg-subtle/40'
      }
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <Icon className="mt-0.5 h-4 w-4 text-text-muted" />
      <div>
        <p className="text-[13px] font-medium text-text">{label}</p>
        <p className="text-[11.5px] text-text-muted">{description}</p>
      </div>
    </label>
  );
}

function PreviewSummary({
  data,
  directions,
}: {
  data: { participants_count: number; by_direction: Record<EvaluationDirection, number>; missing_leader: number; missing_team: number };
  directions: EvaluationDirection[];
}) {
  const total = directions.reduce((acc, d) => acc + (data.by_direction[d] ?? 0), 0);
  return (
    <div className="mt-1 space-y-1.5">
      <p className="text-[12.5px] text-text">
        <span className="font-semibold tabular-nums">{data.participants_count}</span>{' '}
        {data.participants_count === 1 ? 'participante' : 'participantes'} ·{' '}
        <span className="font-semibold tabular-nums">{total}</span>{' '}
        {total === 1 ? 'avaliação' : 'avaliações'} no total
      </p>
      <ul className="text-[11.5px] text-text-muted space-y-0.5">
        {directions.map((d) => (
          <li key={d}>
            • {DIRECTION_META[d].label}:{' '}
            <span className="tabular-nums text-text">{data.by_direction[d] ?? 0}</span>
          </li>
        ))}
      </ul>
      {(data.missing_leader > 0 || data.missing_team > 0) && (
        <div className="mt-2 rounded border border-status-amber/30 bg-status-amber-soft px-2 py-1.5 text-[11px] text-status-amber">
          {data.missing_team > 0 && (
            <p>
              {data.missing_team} pessoa(s) sem time primário — não receberão avaliações
              de líder/pares.
            </p>
          )}
          {data.missing_leader > 0 && (
            <p>
              {data.missing_leader} pessoa(s) sem líder cadastrado — sem avaliações de
              líder/liderado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
