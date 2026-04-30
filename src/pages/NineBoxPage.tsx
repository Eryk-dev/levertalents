import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useNineBoxCycles, useNineBoxDistribution } from "@/hooks/useNineBoxDistribution";
import { NineBoxMatrix } from "@/components/NineBoxMatrix";
import { LoadingState } from "@/components/primitives/LoadingState";
import { Btn, Card, Row, SectionHeader } from "@/components/primitives/LinearKit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const QUADRANTS = [
  { label: "Estrela", tone: "text-status-green", summary: "Alta entrega + alto potencial" },
  { label: "Alto performer", tone: "text-accent-text", summary: "Alta entrega, potencial médio" },
  { label: "Crescimento", tone: "text-accent-text", summary: "Potencial alto, entrega razoável" },
  { label: "Mantenedor", tone: "text-text-muted", summary: "Performance e potencial médios" },
  { label: "Enigma", tone: "text-status-amber", summary: "Alto potencial, baixa entrega" },
  { label: "Especialista", tone: "text-accent-text", summary: "Alta entrega, potencial técnico" },
  { label: "Efetivo", tone: "text-text-muted", summary: "Entrega média, potencial baixo" },
  { label: "Dilema", tone: "text-status-amber", summary: "Potencial médio, baixa entrega" },
  { label: "Em risco", tone: "text-status-red", summary: "Baixa entrega e baixo potencial" },
];

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) {
    toast.error("Nada para exportar.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function NineBoxPage() {
  const { data: cycles } = useNineBoxCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const effectiveCycleId = selectedCycleId ?? cycles?.[0]?.id ?? null;
  const { data: nineBox, isLoading } = useNineBoxDistribution("org", null, effectiveCycleId);

  const total = nineBox?.totalEvaluated ?? 0;

  const exportRows = useMemo(() => {
    if (!nineBox) return [];
    return nineBox.users.map((u) => ({
      nome: u.fullName,
      performance: u.performance.toFixed(2),
      potencial: u.potential.toFixed(2),
      quadrante: u.cell,
    }));
  }, [nineBox]);

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.08em] text-text-subtle font-semibold mb-0.5">
            Pessoas
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            9-Box · performance × potencial
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {total > 0
              ? `${total} ${total === 1 ? "pessoa avaliada" : "pessoas avaliadas"} com score de performance e liderança`
              : "Distribuição aparece quando há avaliações concluídas"}
          </div>
        </div>
        <Row gap={6}>
          {cycles && cycles.length > 0 && (
            <Select
              value={effectiveCycleId ?? ''}
              onValueChange={(v) => setSelectedCycleId(v || null)}
            >
              <SelectTrigger className="h-8 min-w-[220px]">
                <SelectValue placeholder="Selecionar ciclo 9box" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.status === 'closed' ? ' · encerrado' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Btn
            variant="ghost"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
            onClick={() => downloadCSV(exportRows, "9box-distribuicao.csv")}
            disabled={total === 0}
          >
            Exportar CSV
          </Btn>
        </Row>
      </div>

      <SectionHeader title="Matriz de distribuição" />
      <Card contentClassName="p-5">
        {isLoading ? (
          <LoadingState variant="spinner" message="Calculando distribuição…" />
        ) : (
          <NineBoxMatrix distribution={nineBox} />
        )}
      </Card>

      <SectionHeader title="Leitura dos quadrantes" />
      <Card contentClassName="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {QUADRANTS.map((q) => (
            <div key={q.label} className="p-3.5">
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${q.tone}`}>
                {q.label}
              </div>
              <div className="text-[12.5px] text-text-muted mt-1 leading-snug">{q.summary}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
