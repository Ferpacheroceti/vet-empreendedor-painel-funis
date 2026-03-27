"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isPast, differenceInDays, differenceInHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------- Types ----------

interface Tarefa {
  id: string;
  descricao: string;
  tipo: string;
  prazo: string;
  status: string;
  prioridade: string;
  impactoFunil: string | null;
  funil: { id: string; nome: string } | null;
}

interface FunilGroup {
  funilId: string | null;
  funilNome: string;
  tarefas: Tarefa[];
  atrasadas: number;
  urgentes: number;
}

// ---------- Helpers ----------

function getCountdown(prazoStr: string): { label: string; color: string } {
  const prazo = new Date(prazoStr);
  if (isPast(prazo)) {
    const horasAtras = Math.abs(differenceInHours(new Date(), prazo));
    if (horasAtras < 24) return { label: `Atrasada ${horasAtras}h`, color: "text-red-500" };
    const diasAtras = Math.abs(differenceInDays(new Date(), prazo));
    return { label: `Atrasada ${diasAtras}d`, color: "text-red-500" };
  }
  const dias = differenceInDays(prazo, new Date());
  const horas = differenceInHours(prazo, new Date()) % 24;
  if (dias === 0) return { label: `${horas}h restantes`, color: "text-red-400" };
  if (dias <= 2) return { label: `${dias}d ${horas}h`, color: "text-yellow-400" };
  return { label: `${dias}d`, color: "text-green-400" };
}

const prioridadeLabel: Record<string, string> = {
  urgente: "Urgente",
  normal: "Normal",
  pode_esperar: "Pode esperar",
};

const prioridadeColor: Record<string, string> = {
  urgente: "bg-red-500/15 text-red-400 border-red-500/20",
  normal: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  pode_esperar: "bg-white/5 text-white/40 border-white/10",
};

// ---------- Skeleton ----------

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#12121a] border border-white/[0.07] rounded-xl p-5 animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-5 w-48 rounded bg-white/5" />
            <div className="h-5 w-24 rounded bg-white/5" />
          </div>
          {[1, 2].map((j) => (
            <div key={j} className="border border-white/[0.07] rounded-lg p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-white/5" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- Main ----------

export default function ImpactoPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tarefas")
      .then((r) => r.json())
      .then((data: { tarefas: Tarefa[] }) => {
        setTarefas((data.tarefas ?? []).filter((t) => t.status === "pendente"));
      })
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-4 py-6 md:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="h-8 w-56 rounded bg-white/5 animate-pulse mb-8" />
          <Skeleton />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  // Group pending tarefas by funil
  const groups: FunilGroup[] = [];
  const seen = new Map<string | null, FunilGroup>();

  for (const tarefa of tarefas) {
    const key = tarefa.funil?.id ?? null;
    if (!seen.has(key)) {
      const group: FunilGroup = {
        funilId: key,
        funilNome: tarefa.funil?.nome ?? "Sem funil",
        tarefas: [],
        atrasadas: 0,
        urgentes: 0,
      };
      seen.set(key, group);
      groups.push(group);
    }
    const g = seen.get(key)!;
    g.tarefas.push(tarefa);
    if (isPast(new Date(tarefa.prazo))) g.atrasadas++;
    if (tarefa.prioridade === "urgente") g.urgentes++;
  }

  // Sort: groups with most atrasadas + urgentes first
  groups.sort((a, b) => (b.atrasadas + b.urgentes) - (a.atrasadas + a.urgentes));

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-6 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm border-b border-white/[0.07] pb-4">
          <Link href="/" className="text-white/40 hover:text-white/70 transition-colors">
            Dashboard
          </Link>
          <Link href="/tarefas" className="text-white/40 hover:text-white/70 transition-colors">
            Tarefas
          </Link>
          <span className="text-white font-medium">Impacto</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#ff5000]" />
              <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
                Impacto das Tarefas
              </h1>
            </div>
            <p className="text-white/40 text-sm">
              Tarefas pendentes que estão bloqueando seus funis
            </p>
          </div>
          <Link href="/tarefas">
            <Button
              size="sm"
              variant="ghost"
              className="text-white/50 hover:text-white border border-white/[0.07] h-8 px-3 gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Ver tarefas
            </Button>
          </Link>
        </div>

        {/* Loading */}
        {loading && <Skeleton />}

        {/* Empty state */}
        {!loading && tarefas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#12121a] border border-white/[0.07] flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-white/60 text-base font-medium font-[family-name:var(--font-syne)]">
                Nenhuma tarefa bloqueando funis
              </p>
              <p className="text-white/30 text-sm">
                Todas as tarefas estão concluídas. Ótimo trabalho!
              </p>
            </div>
          </div>
        )}

        {/* Groups */}
        {!loading && groups.map((group) => (
          <div
            key={group.funilId ?? "sem-funil"}
            className="bg-[#12121a] border border-white/[0.07] rounded-xl overflow-hidden"
          >
            {/* Group header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-[#5003ef]" />
                {group.funilId ? (
                  <Link
                    href={`/funil/${group.funilId}`}
                    className="text-white font-semibold hover:text-[#5003ef] transition-colors font-[family-name:var(--font-syne)] flex items-center gap-1.5"
                  >
                    {group.funilNome}
                    <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                  </Link>
                ) : (
                  <span className="text-white/50 font-semibold font-[family-name:var(--font-syne)]">
                    {group.funilNome}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {group.atrasadas > 0 && (
                  <Badge className="bg-red-500/15 text-red-400 border border-red-500/20 text-xs">
                    {group.atrasadas} atrasada{group.atrasadas !== 1 ? "s" : ""}
                  </Badge>
                )}
                {group.urgentes > 0 && (
                  <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/20 text-xs">
                    {group.urgentes} urgente{group.urgentes !== 1 ? "s" : ""}
                  </Badge>
                )}
                <span className="text-white/30 text-xs">
                  {group.tarefas.length} tarefa{group.tarefas.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Tasks list */}
            <div className="divide-y divide-white/[0.05]">
              {group.tarefas
                .sort((a, b) => {
                  // Sort: atrasadas first, then by prioridade, then by prazo
                  const aAtrasada = isPast(new Date(a.prazo)) ? 0 : 1;
                  const bAtrasada = isPast(new Date(b.prazo)) ? 0 : 1;
                  if (aAtrasada !== bAtrasada) return aAtrasada - bAtrasada;
                  const prioOrder = { urgente: 0, normal: 1, pode_esperar: 2 };
                  const aPrio = prioOrder[a.prioridade as keyof typeof prioOrder] ?? 1;
                  const bPrio = prioOrder[b.prioridade as keyof typeof prioOrder] ?? 1;
                  if (aPrio !== bPrio) return aPrio - bPrio;
                  return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
                })
                .map((tarefa) => {
                  const countdown = getCountdown(tarefa.prazo);
                  return (
                    <div key={tarefa.id} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-white/80 text-sm leading-relaxed flex-1">
                          {tarefa.descricao}
                        </p>
                        <Badge
                          className={`shrink-0 text-xs border ${prioridadeColor[tarefa.prioridade] ?? prioridadeColor.normal}`}
                        >
                          {prioridadeLabel[tarefa.prioridade] ?? tarefa.prioridade}
                        </Badge>
                      </div>

                      {/* Prazo + countdown */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-white/30">
                          Prazo: {format(new Date(tarefa.prazo), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className={`flex items-center gap-1 font-mono font-medium ${countdown.color}`}>
                          <Clock className="h-3 w-3" />
                          {countdown.label}
                        </span>
                      </div>

                      {/* Impacto no funil */}
                      {tarefa.impactoFunil && (
                        <div className="mt-1 bg-[#ff5000]/5 border border-[#ff5000]/10 rounded-lg px-3 py-2">
                          <p className="text-white/50 text-xs italic leading-relaxed">
                            <span className="text-[#ff5000]/70 font-medium not-italic">Impacto: </span>
                            {tarefa.impactoFunil}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
