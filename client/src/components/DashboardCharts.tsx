// client/src/components/DashboardCharts.tsx
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Cell, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface TrendData {
  month: string;
  incidents: number;
  resolved: number;
}

interface StatusDistributionChartProps {
  data: ChartData[];
}

interface TrendChartProps {
  data: TrendData[];
}

interface CenterBarChartProps {
  data: Array<{
    name: string;
    incidentsCount?: number;
    total?: number;
  }>;
}

// Colores consistentes para el tema
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981', 
  warning: '#f59e0b',
  danger: '#ef4444',
  secondary: '#6b7280',
  purple: '#8b5cf6'
};

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || Object.values(COLORS)[index % Object.values(COLORS).length]
  }));

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <PieChart 
          data={chartData} 
          cx="50%" 
          cy="50%" 
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={80} 
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </PieChart>
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="month" 
          stroke="#64748b"
          fontSize={12}
        />
        <YAxis 
          stroke="#64748b"
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="incidents" 
          stroke={COLORS.purple} 
          strokeWidth={3}
          name="Reportadas"
          dot={{ fill: COLORS.purple, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: COLORS.purple, strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="resolved" 
          stroke={COLORS.success} 
          strokeWidth={3}
          name="Resueltas"
          dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: COLORS.success, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CenterBarChart({ data }: CenterBarChartProps) {
  const chartData = data.map(center => ({
    name: center.name.length > 15 ? center.name.substring(0, 15) + '...' : center.name,
    fullName: center.name,
    incidents: center.incidentsCount || center.total || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart 
        data={chartData} 
        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={100}
          stroke="#64748b"
          fontSize={11}
        />
        <YAxis 
          stroke="#64748b"
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          labelFormatter={(value, payload) => {
            const data = payload?.[0]?.payload;
            return data?.fullName || value;
          }}
        />
        <Bar 
          dataKey="incidents" 
          fill={COLORS.primary}
          name="Incidencias"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}