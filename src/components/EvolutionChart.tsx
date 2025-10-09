import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { month: 'Jan', score: 4.1 },
  { month: 'Fev', score: 4.2 },
  { month: 'Mar', score: 4.0 },
  { month: 'Abr', score: 4.3 },
  { month: 'Mai', score: 4.4 },
  { month: 'Jun', score: 4.5 },
];

export function EvolutionChart() {
  return (
    <div className="card-elevated">
      <h3 className="text-lg font-semibold mb-4">Evolução Score Clima 360°</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            domain={[1, 5]}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="hsl(var(--accent))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--accent))', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
