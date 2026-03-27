"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Criativo {
  id: string;
  nome: string;
  gasto: number;
  roas: number;
  avaliacao: "bom" | "neutro" | "ruim";
  observacao: string;
}

interface Campanha {
  id: string;
  nome: string;
  gasto: number;
  roas: number;
  avaliacao: "bom" | "neutro" | "ruim";
  observacao: string;
}

interface Recomendacao {
  acao: string;
  impacto: "alto" | "medio" | "baixo";
  urgencia: "hoje" | "essa_semana" | "pode_esperar";
}

export interface AnaliseDiariaCardProps {
  analise: {
    id: string;
    data: string;
    investimento: number;
    faturamento: number;
    roas: number;
    resumo: string;
    oQueFunciona: string;
    oQueMelhorar: string;
    criativos: string; // JSON
    campanhas: string; // JSON
    recomendacoes: string; // JSON
    criadoEm: string;
  } | null;
  loading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function roasColor(roas: number): string {
  if (roas >= 4) return "text-green-400";
  if (roas >= 2.5) return "text-yellow-400";
  return "text-red-400";
}

function avaliacaoBadgeVariant(
  avaliacao: "bom" | "neutro" | "ruim"
): "success" | "outline" | "danger" {
  if (avaliacao === "bom") return "success";
  if (avaliacao === "ruim") return "danger";
  return "outline";
}

function avaliacaoLabel(avaliacao: "bom" | "neutro" | "ruim"): string {
  if (avaliacao === "bom") return "Bom";
  if (avaliacao === "ruim") return "Ruim";
  return "Neutro";
}

function impactoBadgeVariant(
  impacto: "alto" | "medio" | "baixo"
): "danger" | "warning" | "outline" {
  if (impacto === "alto") return "danger";
  if (impacto === "medio") return "warning";
  return "outline";
}

function impactoLabel(impacto: "alto" | "medio" | "baixo"): string {
  if (impacto === "alto") return "Alto impacto";
  if (impacto === "medio") return "Médio impacto";
  return "Baixo impacto";
}

function urgenciaLabel(urgencia: "hoje" | "essa_semana" | "pode_esperar"): string {
  if (urgencia === "hoje") return "Hoje";
  if (urgencia === "essa_semana") return "Esta semana";
  return "Pode esperar";
}

function urgenciaBadgeVariant(
  urgencia: "hoje" | "essa_semana" | "pode_esperar"
): "orange" | "purple" | "outline" {
  if (urgencia === "hoje") return "orange";
  if (urgencia === "essa_semana") return "purple";
  return "outline";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/5 ${className}`}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg bg-white/5 p-3 space-y-2">
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="h-6 w-24" />
          </div>
        ))}
      </div>
      {/* Resumo */}
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-4/5" />
        <SkeletonLine className="h-4 w-3/5" />
      </div>
      {/* Sections */}
      {[0, 1, 2].map((i) => (
        <SkeletonLine key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/7 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/40" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/40" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/7 pt-3">{children}</div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onGenerate: () => void;
  generating: boolean;
}

function EmptyState({ onGenerate, generating }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
      <div className="rounded-full bg-[#5003ef]/10 p-4">
        <Brain className="h-8 w-8 text-[#5003ef]" />
      </div>
      <div>
        <p className="text-white/60 text-sm">
          Nenhuma análise disponível para hoje.
        </p>
        <p className="text-white/40 text-xs mt-1">
          Gere a análise para ver insights automáticos dos seus funis.
        </p>
      </div>
      <Button
        onClick={onGenerate}
        disabled={generating}
        className="bg-[#5003ef] hover:bg-[#5003ef]/90 text-white gap-2"
      >
        {generating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Brain className="h-4 w-4" />
        )}
        {generating ? "Gerando análise…" : "Gerar análise de hoje"}
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnaliseDiariaCard({ analise, loading = false }: AnaliseDiariaCardProps) {
  const [generating, setGenerating] = useState(false);
  const [currentAnalise, setCurrentAnalise] = useState(analise);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/analise-diaria", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao gerar análise");
      } else {
        setCurrentAnalise(json.analise ?? json);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefresh() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/analise-diaria");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao buscar análises");
      } else {
        const latest = (json.analises as typeof analise[])?.[0] ?? null;
        setCurrentAnalise(latest);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  const criativos = currentAnalise
    ? safeParseJson<Criativo[]>(currentAnalise.criativos, [])
    : [];
  const campanhas = currentAnalise
    ? safeParseJson<Campanha[]>(currentAnalise.campanhas, [])
    : [];
  const recomendacoes = currentAnalise
    ? safeParseJson<Recomendacao[]>(currentAnalise.recomendacoes, [])
    : [];

  return (
    <div className="bg-[#12121a] border border-white/7 rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/7">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-[#5003ef]/15 p-1.5">
            <Brain className="h-4 w-4 text-[#5003ef]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Análise do Dia</h3>
            {currentAnalise && (
              <p className="text-xs text-white/40">
                {formatDate(currentAnalise.data)}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={generating || loading}
          className="gap-1.5 text-white/60 hover:text-white"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-4">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : !currentAnalise ? (
          <EmptyState onGenerate={handleGenerate} generating={generating} />
        ) : (
          <div className="space-y-4">
            {/* ── KPI Row ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/4 border border-white/7 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1">
                  Investimento
                </p>
                <p className="text-base font-bold text-white font-mono">
                  {formatCurrency(currentAnalise.investimento)}
                </p>
              </div>
              <div className="rounded-lg bg-white/4 border border-white/7 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1">
                  Faturamento
                </p>
                <p className="text-base font-bold text-white font-mono">
                  {formatCurrency(currentAnalise.faturamento)}
                </p>
              </div>
              <div className="rounded-lg bg-white/4 border border-white/7 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1">
                  ROAS
                </p>
                <p
                  className={`text-base font-bold font-mono ${roasColor(
                    currentAnalise.roas
                  )}`}
                >
                  {currentAnalise.roas.toFixed(2)}x
                </p>
              </div>
            </div>

            {/* ── Resumo ── */}
            {currentAnalise.resumo && (
              <blockquote className="border-l-2 border-[#5003ef] pl-4 py-1">
                <p className="text-sm text-white/70 leading-relaxed italic">
                  {currentAnalise.resumo}
                </p>
              </blockquote>
            )}

            {/* ── O que está funcionando ── */}
            {currentAnalise.oQueFunciona && (
              <CollapsibleSection
                title="O que está funcionando"
                icon={<CheckCircle className="h-4 w-4 text-green-400" />}
                defaultOpen={true}
              >
                <p className="text-sm text-white/65 leading-relaxed">
                  {currentAnalise.oQueFunciona}
                </p>
              </CollapsibleSection>
            )}

            {/* ── O que melhorar ── */}
            {currentAnalise.oQueMelhorar && (
              <CollapsibleSection
                title="O que melhorar"
                icon={<AlertTriangle className="h-4 w-4 text-yellow-400" />}
                defaultOpen={false}
              >
                <p className="text-sm text-white/65 leading-relaxed">
                  {currentAnalise.oQueMelhorar}
                </p>
              </CollapsibleSection>
            )}

            {/* ── Campanhas ── */}
            {campanhas.length > 0 && (
              <CollapsibleSection
                title={`Campanhas (${campanhas.length})`}
                icon={<TrendingUp className="h-4 w-4 text-[#5003ef]" />}
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {campanhas.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="flex items-start justify-between gap-3 rounded-lg bg-white/4 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white/80 truncate">
                          {c.nome || "—"}
                        </p>
                        {c.observacao && (
                          <p className="text-[11px] text-white/45 mt-0.5 leading-snug">
                            {c.observacao}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={avaliacaoBadgeVariant(c.avaliacao)}>
                          {avaliacaoLabel(c.avaliacao)}
                        </Badge>
                        <span className="text-[11px] text-white/40 font-mono">
                          {formatCurrency(c.gasto)} · {c.roas.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* ── Criativos ── */}
            {criativos.length > 0 && (
              <CollapsibleSection
                title={`Criativos / Conjuntos (${criativos.length})`}
                icon={<TrendingUp className="h-4 w-4 text-[#ff5000]" />}
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {criativos.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="flex items-start justify-between gap-3 rounded-lg bg-white/4 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white/80 truncate">
                          {c.nome || "—"}
                        </p>
                        {c.observacao && (
                          <p className="text-[11px] text-white/45 mt-0.5 leading-snug">
                            {c.observacao}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={avaliacaoBadgeVariant(c.avaliacao)}>
                          {avaliacaoLabel(c.avaliacao)}
                        </Badge>
                        <span className="text-[11px] text-white/40 font-mono">
                          {formatCurrency(c.gasto)} · {c.roas.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* ── Recomendações ── */}
            {recomendacoes.length > 0 && (
              <CollapsibleSection
                title={`Recomendações (${recomendacoes.length})`}
                icon={<Brain className="h-4 w-4 text-[#5003ef]" />}
                defaultOpen={true}
              >
                <ol className="space-y-3">
                  {recomendacoes.map((r, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-lg bg-white/4 px-3 py-2.5"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5003ef]/20 text-[10px] font-bold text-[#5003ef]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white/80 leading-snug">
                          {r.acao}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge variant={urgenciaBadgeVariant(r.urgencia)}>
                            {urgenciaLabel(r.urgencia)}
                          </Badge>
                          <Badge variant={impactoBadgeVariant(r.impacto)}>
                            {impactoLabel(r.impacto)}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
