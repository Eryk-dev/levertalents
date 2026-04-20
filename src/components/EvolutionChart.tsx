import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/primitives/EmptyState";
import { LineChart as LineChartIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SectionCard } from "@/components/primitives/SectionCard";

type Point = { date: string; progress: number };

interface EvolutionChartProps {
  title?: string;
  description?: string;
  data: Point[];
  isLoading?: boolean;
}

export function EvolutionChart({
  title = "Evolução do desenvolvimento",
  description = "Progresso médio dos seus PDIs ao longo do tempo",
  data,
  isLoading = false,
}: EvolutionChartProps) {
  const chartData = data.map((p) => ({
    date: p.date,
    progress: p.progress,
    label: format(new Date(p.date), "dd MMM", { locale: ptBR }),
  }));

  const hasData = chartData.length >= 2;

  return (
    <SectionCard title={title} description={description} icon={LineChartIcon}>
      {isLoading ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={LineChartIcon}
          title="Sem histórico ainda"
          message="A linha de evolução aparece quando há pelo menos duas atualizações de progresso nos PDIs."
          variant="decorated"
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--accent-text))" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "calc(var(--radius) - 4px)",
                boxShadow: "var(--shadow-sm)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}%`, "Progresso"]}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as any;
                return p?.date ? format(new Date(p.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : "";
              }}
            />
            <Line
              type="monotone"
              dataKey="progress"
              stroke="url(#progressGradient)"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--accent))", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "hsl(var(--accent))", strokeWidth: 2, stroke: "hsl(var(--surface))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}
