"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft, Edit, Link2, TrendingUp,
  DollarSign, Users, Percent, ShoppingBag, Activity,
  Target, Zap, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { HealthGauge } from "@/components/dashboard/health-gauge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricasCharts } from "@/components/dashboard/metricas-charts";
import { HistoricoPanel } from "@/components/dashboard/historico-panel";
import { GastoManualPanel } from "@/components/dashboard/gasto-manual-panel";
import { VincularCampanhasModal } from "@/components/dashboard/vincular-campanhas-modal";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import { calcularMetricas, calcularSaude } from "@/lib/metrics";
import { ptBR } from "date-fns/locale";

interface Produto {
  id: string;
  nome: string;
  codigoHotmart: string;
  preco: number;
  tipo: string;
  metaMensal: number;
  ordem: number;
}

interface CampanhaLink {
  id: string;
  campanhaId: string;
  campanhaNome: string;
  conjuntoId?: string;
  conjuntoNome?: string;
}

interface HistoricoItem {
  id: string;
  tipo: string;
  data: string;
  texto: string;
  isAtual: boolean;
}

interface GastoManual {
  id: string;
  mes: string;
  valor: number;
}

interface Funil {
  id: string;
  nome: string;
  canal: string;
  status: string;
  investMeta: number;
  criadoEm: string;
  produtos: Produto[];
  campanhaLinks: CampanhaLink[];
  historico: HistoricoItem[];
  gastoManual: GastoManual[];
}

const canalLabels: Record<string, string> = {
  trafico_pago: "Tráfego Pago",
  organico: "Orgânico",
  misto: "Misto",
  whatsapp: "WhatsApp",
  email: "Email",
};

const statusColors: Record<string, string> = {
  ativo: "success",
  em_teste: "warning",
  pausado: "danger",
};

const tipoColors: Record<string, string> = {
  entrada: "bg-[#5003ef]/20 text-[#7c3aed]",
  "order-bump": "bg-[#ff5000]/20 text-[#ff5000]",
  upsell: "bg-blue-500/20 text-blue-400",
  webinar: "bg-teal-500/20 text-teal-400",
  downsell: "bg-gray-500/20 text-gray-400",
};

const tipoLabels: Record<string, string> = {
  entrada: "Entrada",
  "order-bump": "OB",
  upsell: "Upsell",
  webinar: "Webinar",
  downsell: "Downsell",
};

// ---------- Historico Timeline ----------

type HistoricoFilterType = "todos" | "alteracao" | "teste" | "resultado";

const timelineDotColor: Record<string, string> = {
  resultado: "bg-green-500",
  teste: "bg-yellow-400",
  alteracao: "bg-purple-500",
};

const timelineBadgeColor: Record<string, string> = {
  resultado: "bg-green-500/15 text-green-400 border border-green-500/25",
  teste: "bg-yellow-400/15 text-yellow-300 border border-yellow-400/25",
  alteracao: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
};

const timelineBorderColor: Record<string, string> = {
  resultado: "border-green-500/30",
  teste: "border-yellow-400/30",
  alteracao: "border-purple-500/30",
};

const tipoLabel: Record<string, string> = {
  resultado: "Resultado",
  teste: "Teste",
  alteracao: "Alteração",
};

function HistoricoTimeline({ historico }: { historico: HistoricoItem[] }) {
  const [filter, setFilter] = useState<HistoricoFilterType>("todos");

  const sorted = [...historico].sort((a, b) => {
    return new Date(b.data).getTime() - new Date(a.data).getTime();
  });

  const filtered = sorted.filter((item) => {
    if (filter === "todos") return true;
    if (filter === "alteracao") return item.tipo === "alteracao";
    if (filter === "teste") return item.tipo === "teste";
    if (filter === "resultado") return item.tipo === "resultado";
    return true;
  });

  const filterButtons: { key: HistoricoFilterType; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "alteracao", label: "Alterações" },
    { key: "teste", label: "Testes" },
    { key: "resultado", label: "Resultados" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === btn.key
                ? "bg-[#5003ef]/25 text-[#a78bfa] border border-[#5003ef]/40"
                : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:bg-white/8"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center text-white/30 text-sm py-8">
          Nenhum registro no histórico
        </div>
      ) : (
        <div className="relative max-h-[400px] overflow-y-auto pr-1">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-white/10" />
          <div className="space-y-5 pl-7">
            {filtered.map((item) => {
              const dot = timelineDotColor[item.tipo] ?? "bg-white/30";
              const badge = timelineBadgeColor[item.tipo] ?? "bg-white/10 text-white/50";
              const borderAcc = timelineBorderColor[item.tipo] ?? "border-white/10";
              let formattedDate = item.data;
              try {
                formattedDate = format(parseISO(item.data), "dd/MM/yyyy", { locale: ptBR });
              } catch {
                // keep original if parse fails
              }

              return (
                <div key={item.id} className="relative">
                  {/* Dot */}
                  <div
                    className={`absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f] ${dot}`}
                  />
                  {/* Card */}
                  <div className={`bg-[#0a0a0f] border rounded-xl px-4 py-3 space-y-1.5 ${borderAcc}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white/35 text-xs font-mono">{formattedDate}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge}`}>
                        {tipoLabel[item.tipo] ?? item.tipo}
                      </span>
                      {item.isAtual && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          ATUAL
                        </span>
                      )}
                    </div>
                    <p className="text-white/75 text-sm leading-snug">{item.texto}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunilDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const funilId = params.id as string;

  const [funil, setFunil] = useState<Funil | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<ReturnType<typeof calcularMetricas> | null>(null);
  const [saudeData, setSaudeData] = useState<ReturnType<typeof calcularSaude> | null>(null);
  const [insights, setInsights] = useState<{
    pontosCriticos: string[];
    oportunidades: string[];
    acoesPrioritarias: Array<{ acao: string; impactoEstimado: string; prazo: string }>;
    resumoGeral: string;
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const getPeriodDates = useCallback(() => {
    const inicioStr = searchParams.get("inicio");
    const fimStr = searchParams.get("fim");
    const inicio = inicioStr ? parseISO(inicioStr) : startOfDay(subDays(new Date(), 29));
    const fim = fimStr ? parseISO(fimStr) : endOfDay(new Date());
    return { inicio, fim };
  }, [searchParams]);

  const fetchFunil = useCallback(async () => {
    const res = await fetch(`/api/funis/${funilId}`);
    if (!res.ok) return;
    const { funil } = await res.json();
    setFunil(funil);
    return funil as Funil;
  }, [funilId]);

  const fetchMetricas = useCallback(async (funilData: Funil) => {
    if (!funilData.produtos.length) return;
    const { inicio, fim } = getPeriodDates();
    const codigos = funilData.produtos.map((p) => p.codigoHotmart).join(",");

    const [vendasRes, fbRes] = await Promise.allSettled([
      fetch(`/api/sheets/vendas?dataInicio=${inicio.toISOString()}&dataFim=${fim.toISOString()}&codigoProduto=${codigos}`),
      fetch(`/api/facebook/metricas?dataInicio=${format(inicio, "yyyy-MM-dd")}&dataFim=${format(fim, "yyyy-MM-dd")}${funilData.campanhaLinks.map(l => `&campanhaIds[]=${l.campanhaId}`).join("")}`),
    ]);

    const vendas = vendasRes.status === "fulfilled" && vendasRes.value.ok
      ? (await vendasRes.value.json()).vendas || []
      : [];

    const currentMes = format(new Date(), "yyyy-MM");
    const gastoManualDoMes = funilData.gastoManual.find(g => g.mes === currentMes);

    let fbData = {
      gasto: gastoManualDoMes?.valor || 0,
      impressoes: 0,
      alcance: 0,
      cliques: 0,
      cpm: 0,
      cpc: 0,
      ctr: 0,
      porCampanha: [],
      porConjunto: [],
    };

    if (fbRes.status === "fulfilled" && fbRes.value.ok) {
      const fbJson = await fbRes.value.json();
      if (!fbJson.error) {
        fbData = {
          gasto: fbJson.gasto > 0 ? fbJson.gasto : (gastoManualDoMes?.valor || 0),
          impressoes: fbJson.impressoes || 0,
          alcance: fbJson.alcance || 0,
          cliques: fbJson.cliques || 0,
          cpm: fbJson.cpm || 0,
          cpc: fbJson.cpc || 0,
          ctr: fbJson.ctr || 0,
          porCampanha: fbJson.porCampanha || [],
          porConjunto: fbJson.porConjunto || [],
        };
      }
    }

    const metricasCalc = calcularMetricas(vendas, funilData.produtos, fbData);
    const metaMensal = funilData.produtos[0]?.metaMensal || 0;
    const saudeCalc = calcularSaude(metricasCalc, funilData.historico, metaMensal);

    setMetricas(metricasCalc);
    setSaudeData(saudeCalc);
    return metricasCalc;
  }, [getPeriodDates]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetchFunil().then((funilData) => {
      if (funilData) return fetchMetricas(funilData);
    }).finally(() => setLoading(false));
  }, [status, fetchFunil, fetchMetricas]);

  // Re-fetch metrics when period changes
  useEffect(() => {
    if (funil && !loading) {
      fetchMetricas(funil);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInsights() {
    if (!metricas) return;
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metricas),
      });
      if (res.ok) {
        const { insights } = await res.json();
        setInsights(insights);
      }
    } finally {
      setLoadingInsights(false);
    }
  }

  async function handleAddHistorico(tipo: string, texto: string, isAtual: boolean) {
    await fetch(`/api/funis/${funilId}/historico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, texto, isAtual }),
    });
    const updated = await fetchFunil();
    if (updated) setFunil(updated);
  }

  async function handleDeleteHistorico(itemId: string) {
    await fetch(`/api/funis/${funilId}/historico?itemId=${itemId}`, { method: "DELETE" });
    const updated = await fetchFunil();
    if (updated) setFunil(updated);
  }

  async function handleSaveGastoManual(mes: string, valor: number) {
    await fetch(`/api/funis/${funilId}/gasto-manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes, valor }),
    });
    const updated = await fetchFunil();
    if (updated) setFunil(updated);
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!funil) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50">Funil não encontrado</div>
      </div>
    );
  }

  const produtosOrdenados = [...funil.produtos].sort((a, b) => a.ordem - b.ordem);
  const testeAtual = funil.historico.find((h) => h.isAtual && h.tipo === "teste");

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/7 bg-[#0a0a0f]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="font-syne text-xl font-bold text-white">{funil.nome}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="purple">{canalLabels[funil.canal] || funil.canal}</Badge>
                  <Badge variant={statusColors[funil.status] as "success" | "warning" | "danger"}>
                    {funil.status === "ativo" ? "Ativo" : funil.status === "em_teste" ? "Em Teste" : "Pausado"}
                  </Badge>
                  {funil.campanhaLinks.length > 0 && (
                    <Badge variant="outline">{funil.campanhaLinks.length} campanhas</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowVincularModal(true)}>
                <Link2 className="h-4 w-4 mr-2" />
                Vincular campanhas FB
              </Button>
              <Link href={`/funil/${funilId}/editar`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filtro de período */}
        <div className="bg-[#12121a] border border-white/7 rounded-xl p-4">
          <PeriodFilter />
        </div>

        {/* Teste atual badge */}
        {testeAtual && (
          <div className="flex items-center gap-3 bg-[#ff5000]/10 border border-[#ff5000]/20 rounded-xl p-4">
            <div className="w-2 h-2 rounded-full bg-[#ff5000] animate-pulse-slow" />
            <div>
              <span className="text-[#ff5000] text-sm font-semibold">Teste em andamento: </span>
              <span className="text-white/70 text-sm">{testeAtual.texto}</span>
            </div>
          </div>
        )}

        {/* Saúde + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Gauge de saúde */}
          <div className="bg-[#12121a] border border-white/7 rounded-xl p-6 flex flex-col items-center gap-4">
            <h3 className="font-syne font-semibold text-white text-sm">Saúde do Funil</h3>
            <HealthGauge score={saudeData?.score || 0} />
            {saudeData && (
              <div className="w-full space-y-2 text-xs">
                <div className="flex justify-between text-white/50">
                  <span>ROAS</span>
                  <span className="text-white">{saudeData.detalhes.roas}/40</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Conversão</span>
                  <span className="text-white">{saudeData.detalhes.conversao}/30</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Histórico</span>
                  <span className="text-white">{saudeData.detalhes.historico}/15</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Meta</span>
                  <span className="text-white">{saudeData.detalhes.meta}/15</span>
                </div>
              </div>
            )}
          </div>

          {/* KPI cards */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              title="Faturamento"
              value={formatCurrency(metricas?.faturamentoBruto || 0)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              title="Gasto FB"
              value={formatCurrency(metricas?.gastoFacebook || 0)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              title="ROAS"
              value={`${(metricas?.roas || 0).toFixed(2)}x`}
              icon={<Activity className="h-4 w-4" />}
              valueClassName={
                (metricas?.roas || 0) >= 2.5 ? "text-green-400" :
                (metricas?.roas || 0) >= 1.5 ? "text-yellow-400" :
                "text-red-400"
              }
            />
            <KpiCard
              title="CPL"
              value={formatCurrency(metricas?.cpl || 0)}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              title="Compradores"
              value={formatNumber(metricas?.compradores || 0)}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              title="Ticket Médio"
              value={formatCurrency(metricas?.ticketMedio || 0)}
              icon={<ShoppingBag className="h-4 w-4" />}
            />
            <KpiCard
              title="Order Bump %"
              value={formatPercent(metricas?.taxaOrderBump || 0)}
              icon={<Percent className="h-4 w-4" />}
              valueClassName={
                (metricas?.taxaOrderBump || 0) >= 35 ? "text-green-400" :
                (metricas?.taxaOrderBump || 0) > 0 ? "text-yellow-400" :
                "text-white"
              }
            />
            <KpiCard
              title="Saúde"
              value={`${saudeData?.score || 0}%`}
              icon={<Target className="h-4 w-4" />}
              valueClassName={
                (saudeData?.score || 0) >= 70 ? "text-green-400" :
                (saudeData?.score || 0) >= 40 ? "text-yellow-400" :
                "text-red-400"
              }
            />
          </div>
        </div>

        {/* Desenho visual do funil */}
        <div className="bg-[#12121a] border border-white/7 rounded-xl p-6">
          <h2 className="font-syne text-lg font-semibold text-white mb-6">Estrutura do Funil</h2>
          <div className="flex flex-wrap items-start gap-2">
            {produtosOrdenados.map((produto, idx) => {
              const prodMetrica = metricas?.porProduto.find((p) => p.codigoHotmart === produto.codigoHotmart);
              const isExpanded = expandedProduct === produto.id;

              return (
                <div key={produto.id} className="flex items-start gap-2">
                  {idx > 0 && (
                    <div className="flex items-center mt-6 text-white/20">
                      <span className="text-lg">→</span>
                    </div>
                  )}
                  <div
                    className={`bg-[#0a0a0f] border border-white/10 rounded-xl p-4 w-44 cursor-pointer transition-all ${isExpanded ? "border-[#5003ef]/50" : "hover:border-white/20"}`}
                    onClick={() => setExpandedProduct(isExpanded ? null : produto.id)}
                  >
                    <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold mb-2 ${tipoColors[produto.tipo] || "bg-gray-500/20 text-gray-400"}`}>
                      {tipoLabels[produto.tipo] || produto.tipo}
                    </div>
                    <div className="text-white text-sm font-medium leading-tight mb-1">{produto.nome}</div>
                    <div className="text-white/40 text-xs font-mono mb-2">{produto.codigoHotmart}</div>
                    <div className="text-white font-dm-mono text-sm font-bold">
                      {formatCurrency(produto.preco)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/7">
                      <div className="text-white/80 text-lg font-dm-mono font-bold">
                        {prodMetrica?.vendas || 0}
                      </div>
                      <div className="text-white/30 text-xs">vendas</div>
                      {idx > 0 && (
                        <div className="text-xs mt-1">
                          <span className={
                            (prodMetrica?.convRelativa || 0) >= 30 ? "text-green-400" :
                            (prodMetrica?.convRelativa || 0) > 0 ? "text-yellow-400" :
                            "text-white/30"
                          }>
                            {formatPercent(prodMetrica?.convRelativa || 0)}
                          </span>
                          <span className="text-white/30"> conv.</span>
                        </div>
                      )}
                      {prodMetrica && (
                        <Progress
                          value={Math.min(100, ((prodMetrica.vendas / (produtosOrdenados[0] ? (metricas?.porProduto[0]?.vendas || 1) : 1)) * 100))}
                          className="mt-2 h-1"
                        />
                      )}
                    </div>

                    {isExpanded && prodMetrica && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        <div className="text-xs text-white/50">Faturamento</div>
                        <div className="text-white text-sm font-dm-mono">{formatCurrency(prodMetrica.faturamento)}</div>
                        {Object.keys(prodMetrica.breakdownPagamento).length > 0 && (
                          <>
                            <div className="text-xs text-white/50 mt-2">Por pagamento</div>
                            {Object.entries(prodMetrica.breakdownPagamento).map(([tipo, qtd]) => (
                              <div key={tipo} className="flex justify-between text-xs">
                                <span className="text-white/60 capitalize">{tipo}</span>
                                <span className="text-white">{qtd}</span>
                              </div>
                            ))}
                          </>
                        )}
                        {Object.keys(prodMetrica.breakdownOrigem).length > 0 && (
                          <>
                            <div className="text-xs text-white/50 mt-2">Por origem</div>
                            {Object.entries(prodMetrica.breakdownOrigem).map(([orig, qtd]) => (
                              <div key={orig} className="flex justify-between text-xs">
                                <span className="text-white/60 capitalize">{orig}</span>
                                <span className="text-white">{qtd}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Métricas detalhadas */}
        <div className="bg-[#12121a] border border-white/7 rounded-xl p-6">
          <h2 className="font-syne text-lg font-semibold text-white mb-6">Métricas Detalhadas</h2>
          <Tabs defaultValue="trafego">
            <TabsList className="mb-6">
              <TabsTrigger value="trafego">Tráfego</TabsTrigger>
              <TabsTrigger value="conversao">Conversão</TabsTrigger>
              <TabsTrigger value="funil">Funil</TabsTrigger>
              <TabsTrigger value="tendencias">Tendências</TabsTrigger>
            </TabsList>

            <TabsContent value="trafego">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard title="Gasto Total" value={formatCurrency(metricas?.gastoFacebook || 0)} />
                <KpiCard title="Impressões" value={formatNumber(metricas?.impressoes || 0)} />
                <KpiCard title="Alcance" value={formatNumber(metricas?.alcance || 0)} />
                <KpiCard title="CPM" value={formatCurrency(metricas?.cpm || 0)} />
                <KpiCard title="CPC" value={formatCurrency(metricas?.cpc || 0)} />
                <KpiCard title="CTR" value={`${(metricas?.ctr || 0).toFixed(2)}%`} />
                <KpiCard title="Frequência" value={(metricas?.frequencia || 0).toFixed(2)} />
                <KpiCard title="Cliques" value={formatNumber(metricas?.cliques || 0)} />
              </div>
            </TabsContent>

            <TabsContent value="conversao">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard title="Compradores" value={formatNumber(metricas?.compradores || 0)} />
                <KpiCard title="Transações" value={formatNumber(metricas?.transacoes || 0)} />
                <KpiCard title="CPL" value={formatCurrency(metricas?.cpl || 0)} />
                <KpiCard title="Taxa Conv." value={`${(metricas?.taxaConversao || 0).toFixed(2)}%`} />
                <KpiCard title="Ticket Médio" value={formatCurrency(metricas?.ticketMedio || 0)} />
                <KpiCard title="LTV Médio" value={formatCurrency(metricas?.ltv || 0)} />
                {metricas?.porProduto.map((p) => (
                  <KpiCard key={p.codigoHotmart} title={p.nome.substring(0, 20)} value={formatCurrency(p.faturamento)} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="funil">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard title="Order Bump %" value={formatPercent(metricas?.taxaOrderBump || 0)} />
                <KpiCard title="Upsell %" value={formatPercent(metricas?.taxaUpsell || 0)} />
                <KpiCard title="LTV Médio" value={formatCurrency(metricas?.ltv || 0)} />
                <KpiCard title="ROAS" value={`${(metricas?.roas || 0).toFixed(2)}x`} />
              </div>

              {/* Faturamento por origem */}
              {metricas?.faturamentoPorOrigem && Object.keys(metricas.faturamentoPorOrigem).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm text-white/50 mb-3">Faturamento por Origem</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(metricas.faturamentoPorOrigem).map(([orig, val]) => (
                      <div key={orig} className="bg-[#0a0a0f] rounded-lg p-3">
                        <div className="text-xs text-white/40 capitalize mb-1">{orig}</div>
                        <div className="text-white font-dm-mono font-bold">{formatCurrency(val)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabelas por campanha */}
              {(metricas?.porCampanha || []).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm text-white/50 mb-3">ROAS por Campanha</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/30 text-xs border-b border-white/7">
                          <th className="text-left pb-2">Campanha</th>
                          <th className="text-right pb-2">Gasto</th>
                          <th className="text-right pb-2">ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(metricas?.porCampanha || []).map((c) => (
                          <tr key={c.id} className="border-b border-white/5">
                            <td className="py-2 text-white/70">{c.nome}</td>
                            <td className="py-2 text-right font-dm-mono text-white">{formatCurrency(c.gasto)}</td>
                            <td className="py-2 text-right font-dm-mono text-white">{c.roas.toFixed(2)}x</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tendencias">
              {metricas && <MetricasCharts metricas={metricas} produtos={funil.produtos} />}
            </TabsContent>
          </Tabs>
        </div>

        {/* Insights IA */}
        <div className="bg-[#12121a] border border-white/7 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#5003ef]" />
              Insights Automáticos
            </h2>
            <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loadingInsights}>
              {loadingInsights ? "Analisando..." : "Gerar Insights"}
            </Button>
          </div>

          {insights ? (
            <div className="space-y-4">
              <div className="text-white/70 text-sm bg-[#5003ef]/10 border border-[#5003ef]/20 rounded-lg p-4">
                {insights.resumoGeral}
              </div>

              {insights.pontosCriticos.length > 0 && (
                <div>
                  <h3 className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Pontos Críticos
                  </h3>
                  <div className="space-y-2">
                    {insights.pontosCriticos.map((p, i) => (
                      <div key={i} className="text-sm text-white/70 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.oportunidades.length > 0 && (
                <div>
                  <h3 className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">Oportunidades</h3>
                  <div className="space-y-2">
                    {insights.oportunidades.map((o, i) => (
                      <div key={i} className="text-sm text-white/70 bg-green-500/5 border border-green-500/10 rounded-lg px-3 py-2">
                        {o}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.acoesPrioritarias.length > 0 && (
                <div>
                  <h3 className="text-xs text-[#ff5000] font-semibold uppercase tracking-wider mb-2">Ações Prioritárias</h3>
                  <div className="space-y-2">
                    {insights.acoesPrioritarias.map((a, i) => (
                      <div key={i} className="bg-[#ff5000]/5 border border-[#ff5000]/10 rounded-lg p-3">
                        <div className="text-sm text-white">{a.acao}</div>
                        <div className="text-xs text-white/50 mt-1">Impacto: {a.impactoEstimado} · Prazo: {a.prazo}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-white/30 py-8 text-sm">
              Clique em &quot;Gerar Insights&quot; para análise com IA
            </div>
          )}
        </div>

        {/* Timeline de histórico */}
        {funil.historico.length > 0 && (
          <div className="bg-[#12121a] border border-white/7 rounded-xl p-6">
            <h2 className="font-syne text-lg font-semibold text-white mb-5">
              Linha do Tempo
            </h2>
            <HistoricoTimeline historico={funil.historico} />
          </div>
        )}

        {/* Painéis inferiores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GastoManualPanel
            funilId={funilId}
            gastoManual={funil.gastoManual}
            onSave={handleSaveGastoManual}
          />
          <HistoricoPanel
            funilId={funilId}
            historico={funil.historico}
            onAdd={handleAddHistorico}
            onDelete={handleDeleteHistorico}
          />
        </div>
      </div>

      {/* Modal vincular campanhas */}
      <VincularCampanhasModal
        open={showVincularModal}
        onOpenChange={setShowVincularModal}
        funilId={funilId}
        existingLinks={funil.campanhaLinks}
        onSave={async () => {
          const updated = await fetchFunil();
          if (updated) setFunil(updated);
        }}
      />
    </div>
  );
}
