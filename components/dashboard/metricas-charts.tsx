"use client";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { MetricasFunil } from "@/lib/metrics";

interface MetricasChartsProps {
  metricas: MetricasFunil;
  produtos: Array<{ codigoHotmart: string; nome: string; tipo: string }>;
}

const COLORS = ["#5003ef", "#ff5000", "#22c55e", "#eab308", "#3b82f6", "#14b8a6"];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#12121a] border border-white/10 rounded-lg p-3 text-sm">
        <p className="text-white/50 mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" && p.name.includes("R$")
              ? `R$ ${p.value.toFixed(2)}`
              : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function MetricasCharts({ metricas, produtos }: MetricasChartsProps) {
  const tendencias = metricas.tendencias;

  // Prepare pie data for product revenue
  const pieData = metricas.porProduto
    .filter((p) => p.faturamento > 0)
    .map((p) => ({ name: p.nome.substring(0, 20), value: p.faturamento }));

  // Line chart data
  const lineData = tendencias.map((t) => ({
    data: t.data,
    "Faturamento": Number(t.faturamento.toFixed(2)),
    "ROAS": Number((t.roas || 0).toFixed(2)),
  }));

  // Bar chart for sales per product
  const vendasData = tendencias.map((t) => {
    const row: Record<string, number | string> = { data: t.data };
    for (const prod of produtos) {
      row[prod.nome.substring(0, 15)] = t.vendasPorProduto[prod.codigoHotmart] || 0;
    }
    return row;
  });

  return (
    <div className="space-y-8">
      {/* Faturamento diário */}
      {lineData.length > 0 && (
        <div>
          <h3 className="text-sm text-white/50 mb-4">Faturamento Diário</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="data" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Faturamento" stroke="#5003ef" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Vendas por produto */}
      {vendasData.length > 0 && produtos.length > 0 && (
        <div>
          <h3 className="text-sm text-white/50 mb-4">Vendas por Produto por Dia</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={vendasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="data" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
              {produtos.map((prod, i) => (
                <Bar
                  key={prod.codigoHotmart}
                  dataKey={prod.nome.substring(0, 15)}
                  fill={COLORS[i % COLORS.length]}
                  opacity={0.85}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribuição de receita por produto (pie) */}
      {pieData.length > 0 && (
        <div>
          <h3 className="text-sm text-white/50 mb-4">Distribuição de Receita por Produto</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => typeof value === 'number' ? `R$ ${value.toFixed(2)}` : value} contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
