"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { subDays, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FunilCard } from "@/components/dashboard/funil-card";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { Plus, Activity, LayoutGrid, CheckSquare, TrendingUp } from "lucide-react";

// ---------- Top Nav ----------

function TopNav() {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/tarefas", label: "Tarefas", icon: <CheckSquare className="h-4 w-4" /> },
    { href: "/impacto", label: "Impacto", icon: <TrendingUp className="h-4 w-4" /> },
  ];
  return (
    <nav className="w-full bg-[#0d0d15] border-b border-white/[0.07]">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 flex flex-wrap items-center gap-1 h-12">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#5003ef]/20 text-[#a78bfa]"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- Types ----------

interface Produto {
  id: string;
  nome: string;
  tipo: string;
  codigoHotmart: string;
  preco: number;
  metaMensal: number;
  ordem: number;
}

interface Funil {
  id: string;
  nome: string;
  canal: string;
  status: string;
  investMeta: number;
  produtos: Produto[];
  historico: Array<{ id: string }>;
}

interface FunilMetrics {
  faturamento: number;
  roas: number;
  saudeScore: number;
}

// ---------- Skeleton ----------

function CardSkeleton() {
  return (
    <div className="bg-[#12121a] border border-white/[0.07] rounded-xl p-5 animate-pulse space-y-4 min-h-[240px]">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-white/5" />
          <div className="h-5 w-14 rounded-full bg-white/5" />
        </div>
        <div className="h-9 w-9 rounded-full bg-white/5" />
      </div>
      <div className="h-5 w-3/4 rounded bg-white/5" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="h-3 w-16 rounded bg-white/5" />
          <div className="h-5 w-24 rounded bg-white/5" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-10 rounded bg-white/5" />
          <div className="h-5 w-12 rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-24 rounded bg-white/5" />
        <div className="flex gap-1">
          <div className="h-5 w-16 rounded-full bg-white/5" />
          <div className="h-4 w-3 rounded bg-white/5" />
          <div className="h-5 w-16 rounded-full bg-white/5" />
          <div className="h-4 w-3 rounded bg-white/5" />
          <div className="h-5 w-16 rounded-full bg-white/5" />
        </div>
      </div>
      <div className="h-8 w-full rounded-lg bg-white/5" />
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------- Inner page (uses searchParams) ----------

function DashboardContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [funis, setFunis] = useState<Funil[]>([]);
  const [metrics, setMetrics] = useState<Record<string, FunilMetrics>>({});
  const [loadingFunis, setLoadingFunis] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Resolve period from search params
  function getPeriod(): { inicio: Date; fim: Date } {
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");
    if (inicio && fim) {
      return { inicio: new Date(inicio), fim: new Date(fim) };
    }
    return {
      inicio: startOfDay(subDays(new Date(), 29)),
      fim: endOfDay(new Date()),
    };
  }

  // Fetch funis list
  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingFunis(true);
    fetch("/api/funis")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar funis");
        return res.json();
      })
      .then((data) => {
        setFunis(data.funis ?? []);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingFunis(false));
  }, [status]);

  // Fetch metrics for each funil whenever funis or period changes
  useEffect(() => {
    if (!funis.length) return;

    const { inicio, fim } = getPeriod();
    setLoadingMetrics(true);

    const params = new URLSearchParams({
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    });

    Promise.allSettled(
      funis.map((funil) =>
        fetch(`/api/funis/${funil.id}/metrics?${params.toString()}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data): [string, FunilMetrics] => [
            funil.id,
            {
              faturamento: data?.faturamentoBruto ?? 0,
              roas: data?.roas ?? 0,
              saudeScore: data?.saudeScore ?? 0,
            },
          ])
          .catch((): [string, FunilMetrics] => [
            funil.id,
            { faturamento: 0, roas: 0, saudeScore: 0 },
          ])
      )
    ).then((results) => {
      const newMetrics: Record<string, FunilMetrics> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          const [id, m] = result.value;
          newMetrics[id] = m;
        }
      }
      setMetrics(newMetrics);
      setLoadingMetrics(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funis, searchParams.toString()]);

  // Loading state while session resolves
  if (status === "loading" || (status === "authenticated" && loadingFunis)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <TopNav />
        <div className="px-4 py-6 md:px-8">
          <div className="max-w-screen-2xl mx-auto space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-9 w-32 rounded-lg bg-white/5 animate-pulse" />
            </div>
            <div className="h-9 w-full max-w-2xl rounded-lg bg-white/5 animate-pulse" />
            <LoadingGrid />
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const ativosCount = funis.filter((f) => f.status === "ativo").length;
  const emTesteCount = funis.filter((f) => f.status === "em_teste").length;

  const funisEmTeste = funis.filter((f) => f.status === "em_teste");
  const funisAtivos = funis.filter((f) => f.status === "ativo");
  const funisPausados = funis.filter(
    (f) => f.status !== "ativo" && f.status !== "em_teste"
  );

  function FunilSection({
    title,
    sectionFunis,
    accentClass,
    headerClass,
    dimmed = false,
  }: {
    title: string;
    sectionFunis: Funil[];
    accentClass: string;
    headerClass: string;
    dimmed?: boolean;
  }) {
    if (sectionFunis.length === 0) return null;
    return (
      <div className={`space-y-3 border-l-2 pl-4 ${accentClass}`}>
        <div className={`text-xs font-semibold uppercase tracking-widest ${headerClass}`}>
          {title} <span className="opacity-60">({sectionFunis.length})</span>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${dimmed ? "opacity-60" : ""}`}>
          {sectionFunis.map((funil) => {
            const m = metrics[funil.id];
            return (
              <FunilCard
                key={funil.id}
                funil={funil}
                faturamento={m?.faturamento ?? 0}
                roas={m?.roas ?? 0}
                saudeScore={m?.saudeScore ?? 0}
              />
            );
          })}
          {loadingMetrics &&
            sectionFunis
              .filter((f) => !metrics[f.id])
              .map((f) => <CardSkeleton key={`sk-${f.id}`} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <TopNav />
      <div className="px-4 py-6 md:px-8">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          {/* ---- Header ---- */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[#5003ef]" />
                <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
                  Painel de Funis
                </h1>
              </div>
              <p className="text-white/40 text-sm">
                {funis.length} funil{funis.length !== 1 ? "s" : ""}
                {ativosCount > 0 && (
                  <span className="ml-2 text-green-400">
                    · {ativosCount} ativo{ativosCount !== 1 ? "s" : ""}
                  </span>
                )}
                {emTesteCount > 0 && (
                  <span className="ml-2 text-yellow-400">
                    · {emTesteCount} em teste
                  </span>
                )}
              </p>
            </div>

            <Link href="/funil/novo">
              <Button
                size="sm"
                className="bg-[#5003ef] hover:bg-[#6617f5] text-white border-0 gap-1.5 h-9 px-4 font-medium"
              >
                <Plus className="h-4 w-4" />
                Novo Funil
              </Button>
            </Link>
          </div>

          {/* ---- Period Filter ---- */}
          <div className="bg-[#12121a] border border-white/[0.07] rounded-xl px-4 py-3">
            <PeriodFilter />
          </div>

          {/* ---- Active test banners ---- */}
          {funisEmTeste.length > 0 && (
            <div className="space-y-2">
              {funisEmTeste.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3"
                >
                  <span className="text-lg leading-none">🧪</span>
                  <p className="text-yellow-300 text-sm">
                    <span className="font-semibold">Teste em andamento:</span>{" "}
                    {f.nome}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ---- Error state ---- */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ---- Funis sections ---- */}
          {!error && funis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#12121a] border border-white/[0.07] flex items-center justify-center">
                <Activity className="h-7 w-7 text-white/20" />
              </div>
              <div className="space-y-1">
                <p className="text-white/60 text-base font-medium font-[family-name:var(--font-syne)]">
                  Nenhum funil criado ainda
                </p>
                <p className="text-white/30 text-sm">
                  Crie seu primeiro funil para começar a monitorar seus
                  resultados.
                </p>
              </div>
              <Link href="/funil/novo">
                <Button
                  size="sm"
                  className="bg-[#5003ef] hover:bg-[#6617f5] text-white border-0 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Criar primeiro funil
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              <FunilSection
                title="Em Teste"
                sectionFunis={funisEmTeste}
                accentClass="border-yellow-500/50"
                headerClass="text-yellow-400"
              />
              <FunilSection
                title="Ativos"
                sectionFunis={funisAtivos}
                accentClass="border-green-500/50"
                headerClass="text-green-400"
              />
              <FunilSection
                title="Pausados / Inativos"
                sectionFunis={funisPausados}
                accentClass="border-white/10"
                headerClass="text-white/30"
                dimmed
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Root export (wraps in Suspense for useSearchParams) ----------

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f]">
          <div className="w-full bg-[#0d0d15] border-b border-white/[0.07] h-12" />
          <div className="px-4 py-6 md:px-8">
            <div className="max-w-screen-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse" />
                <div className="h-9 w-32 rounded-lg bg-white/5 animate-pulse" />
              </div>
              <div className="h-9 w-full max-w-2xl rounded-lg bg-white/5 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#12121a] border border-white/[0.07] rounded-xl p-5 animate-pulse min-h-[240px]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
