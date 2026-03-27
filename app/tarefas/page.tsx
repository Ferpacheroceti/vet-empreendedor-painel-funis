"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  format,
  isPast,
  differenceInHours,
  differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ────────────────────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────────────────────

interface FunilRef {
  id: string;
  nome: string;
  status?: string;
}

interface Tarefa {
  id: string;
  descricao: string;
  tipo: string;
  prazo: string; // ISO string
  linkArquivo: string | null;
  status: string;
  funilId: string | null;
  funil: FunilRef | null;
  prioridade: string;
  criadoEm: string;
  concluidoEm: string | null;
  impactoFunil: string | null;
}

interface NewTarefaForm {
  descricao: string;
  tipo: string;
  prazo: string;
  prioridade: string;
  funilId: string;
  linkArquivo: string;
}

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  criativo: "Criativo",
  vsl: "VSL",
  post: "Post",
  story: "Story",
  copy: "Copy",
  outro: "Outro",
};

const TIPO_COLORS: Record<string, string> = {
  criativo: "bg-[#5003ef]/20 text-[#7c3aed] border-[#5003ef]/20",
  vsl: "bg-[#ff5000]/20 text-[#ff5000] border-[#ff5000]/20",
  post: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  story: "bg-pink-500/20 text-pink-400 border-pink-500/20",
  copy: "bg-teal-500/20 text-teal-400 border-teal-500/20",
  outro: "bg-white/10 text-white/50 border-white/10",
};

const EMPTY_FORM: NewTarefaForm = {
  descricao: "",
  tipo: "criativo",
  prazo: "",
  prioridade: "normal",
  funilId: "",
  linkArquivo: "",
};

// ────────────────────────────────────────────────────────────
// CountdownTimer
// ────────────────────────────────────────────────────────────

function CountdownTimer({ prazo }: { prazo: string }) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const prazoDate = new Date(prazo);
  const past = isPast(prazoDate);

  if (past) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-[family-name:var(--font-dm-mono)] text-red-400">
        <Clock className="h-3 w-3" />
        Atrasada
      </span>
    );
  }

  const days = differenceInDays(prazoDate, now);
  const hours = differenceInHours(prazoDate, now) % 24;

  let colorClass = "text-green-400";
  if (days < 1) colorClass = "text-red-400";
  else if (days <= 3) colorClass = "text-yellow-400";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-[family-name:var(--font-dm-mono)] ${colorClass}`}
    >
      <Clock className="h-3 w-3" />
      {days}d {hours}h
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Priority badge
// ────────────────────────────────────────────────────────────

function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  if (prioridade === "urgente") {
    return (
      <Badge variant="danger" className="text-xs shrink-0">
        Urgente
      </Badge>
    );
  }
  if (prioridade === "pode_esperar") {
    return (
      <Badge
        variant="outline"
        className="text-xs shrink-0 border-green-500/30 text-green-500/60"
      >
        Pode esperar
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="text-xs shrink-0">
      Normal
    </Badge>
  );
}

// ────────────────────────────────────────────────────────────
// Loading skeleton
// ────────────────────────────────────────────────────────────

function TaskSkeleton() {
  return (
    <div className="bg-[#12121a] border border-white/[0.07] rounded-xl p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-14 rounded-full bg-white/5" />
        <div className="h-4 w-10 rounded-full bg-white/5" />
      </div>
      <div className="h-4 w-3/4 rounded bg-white/5" />
      <div className="h-3 w-24 rounded bg-white/5" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Task card
// ────────────────────────────────────────────────────────────

interface TarefaCardProps {
  tarefa: Tarefa;
  onMarkDone: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function TarefaCard({ tarefa, onMarkDone, onDelete }: TarefaCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState(false);
  const isDone = tarefa.status === "feito";

  const handleMarkDone = useCallback(async () => {
    setMarking(true);
    try {
      await onMarkDone(tarefa.id);
    } finally {
      setMarking(false);
    }
  }, [onMarkDone, tarefa.id]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await onDelete(tarefa.id);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, tarefa.id]);

  const tipoClass =
    TIPO_COLORS[tarefa.tipo] ?? "bg-white/10 text-white/50 border-white/10";

  return (
    <div
      className={`bg-[#12121a] border border-white/[0.07] rounded-xl p-4 transition-opacity ${isDone ? "opacity-50" : ""}`}
    >
      {/* Top row: badges + actions */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <PrioridadeBadge prioridade={tarefa.prioridade} />
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tipoClass}`}
          >
            {TIPO_LABELS[tarefa.tipo] ?? tarefa.tipo}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isDone && (
            <button
              onClick={handleMarkDone}
              disabled={marking}
              aria-label="Marcar como concluída"
              className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center text-white/40 hover:text-green-400 hover:border-green-500/40 transition-colors disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Excluir tarefa"
            className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center text-white/30 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p
        className={`text-sm leading-snug mb-3 font-[family-name:var(--font-dm-sans)] ${isDone ? "line-through text-white/40" : "text-white/90"}`}
      >
        {tarefa.descricao}
      </p>

      {/* Funil link */}
      {tarefa.funil && (
        <a
          href={`/funil/${tarefa.funil.id}`}
          className="inline-flex items-center gap-1 text-xs text-[#5003ef] hover:text-[#7c3aed] transition-colors mb-2"
        >
          <Activity className="h-3 w-3" />
          {tarefa.funil.nome}
        </a>
      )}

      {/* Prazo + countdown */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="text-xs text-white/40 font-[family-name:var(--font-dm-mono)]">
          {format(new Date(tarefa.prazo), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        {!isDone && <CountdownTimer prazo={tarefa.prazo} />}
      </div>

      {/* impactoFunil */}
      {tarefa.impactoFunil && (
        <p className="text-xs italic text-white/40 leading-relaxed mt-1">
          {tarefa.impactoFunil}
        </p>
      )}

      {/* linkArquivo */}
      {tarefa.linkArquivo && (
        <a
          href={tarefa.linkArquivo}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#ff5000] hover:text-[#ff5000]/80 transition-colors mt-2"
        >
          <ExternalLink className="h-3 w-3" />
          Ver arquivo
        </a>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Section wrapper
// ────────────────────────────────────────────────────────────

function SectionGroup({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2
          className={`text-sm font-semibold font-[family-name:var(--font-syne)] ${accent ?? "text-white/70"}`}
        >
          {title}
        </h2>
        <span className="text-xs font-[family-name:var(--font-dm-mono)] text-white/30">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────

export default function TarefasPage() {
  const { status } = useSession();
  const router = useRouter();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [funis, setFunis] = useState<FunilRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline form
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<NewTarefaForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Concluídas section
  const [concluidasOpen, setConcluidasOpen] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // ── Fetch ──
  const fetchTarefas = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const res = await fetch("/api/tarefas");
      if (!res.ok) throw new Error("Erro ao carregar tarefas");
      const data = (await res.json()) as { tarefas: Tarefa[] };
      setTarefas(data.tarefas);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFunis = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/funis");
      if (!res.ok) return;
      const data = (await res.json()) as { funis: FunilRef[] };
      setFunis(data.funis ?? []);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void fetchTarefas();
      void fetchFunis();
    }
  }, [status, fetchTarefas, fetchFunis]);

  // ── Submit new tarefa ──
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      setSubmitting(true);
      setFormError(null);
      try {
        const body = {
          descricao: form.descricao,
          tipo: form.tipo,
          prazo: new Date(form.prazo).toISOString(),
          prioridade: form.prioridade,
          funilId: form.funilId || undefined,
          linkArquivo: form.linkArquivo || undefined,
        };
        const res = await fetch("/api/tarefas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao criar tarefa");
        const data = (await res.json()) as { tarefa: Tarefa };
        setTarefas((prev) => [data.tarefa, ...prev]);
        setForm(EMPTY_FORM);
        setFormOpen(false);
      } catch (e) {
        setFormError((e as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [form]
  );

  // ── Mark done ──
  const handleMarkDone = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/tarefas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "feito" }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { tarefa: Tarefa };
    setTarefas((prev) => prev.map((t) => (t.id === id ? data.tarefa : t)));
  }, []);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/tarefas/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setTarefas((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Group tasks ──
  const pendentes = tarefas.filter((t) => t.status !== "feito");
  const concluidas = tarefas.filter((t) => t.status === "feito");

  const urgentes = pendentes.filter((t) => t.prioridade === "urgente");
  const normais = pendentes.filter((t) => t.prioridade === "normal");
  const podeEsperar = pendentes.filter((t) => t.prioridade === "pode_esperar");

  const pendentesCount = pendentes.length;

  // ── Loading state ──
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-4 py-6 md:px-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse" />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#5003ef]" />
              <h1
                className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]"
              >
                Tarefas
              </h1>
            </div>
            <p className="text-sm text-white/40 font-[family-name:var(--font-dm-sans)]">
              {pendentesCount === 0
                ? "Nenhuma tarefa pendente"
                : `${pendentesCount} tarefa${pendentesCount !== 1 ? "s" : ""} pendente${pendentesCount !== 1 ? "s" : ""}`}
            </p>
          </div>

          <Button
            onClick={() => setFormOpen((v) => !v)}
            className="bg-[#5003ef] hover:bg-[#6617f5] text-white border-0 gap-1.5 h-9 px-4 font-medium shrink-0"
            size="sm"
          >
            {formOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {formOpen ? "Fechar" : "Adicionar"}
          </Button>
        </div>

        {/* ── Inline add form ── */}
        {formOpen && (
          <div className="bg-[#12121a] border border-white/[0.07] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white/80 font-[family-name:var(--font-syne)]">
              Nova Tarefa
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Descrição */}
              <div className="space-y-1.5">
                <label
                  htmlFor="descricao"
                  className="text-xs text-white/50 font-[family-name:var(--font-dm-sans)]"
                >
                  Descrição *
                </label>
                <textarea
                  id="descricao"
                  rows={3}
                  required
                  placeholder="Descreva a tarefa..."
                  value={form.descricao}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setForm((f) => ({ ...f, descricao: e.target.value }))
                  }
                  className="w-full rounded-lg bg-[#0a0a0f] border border-white/[0.07] text-white text-sm px-3 py-2.5 resize-none placeholder:text-white/20 focus:outline-none focus:border-[#5003ef]/50 transition-colors font-[family-name:var(--font-dm-sans)]"
                />
              </div>

              {/* Tipo + Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="tipo"
                    className="text-xs text-white/50 font-[family-name:var(--font-dm-sans)]"
                  >
                    Tipo *
                  </label>
                  <select
                    id="tipo"
                    required
                    value={form.tipo}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm((f) => ({ ...f, tipo: e.target.value }))
                    }
                    className="w-full rounded-lg bg-[#0a0a0f] border border-white/[0.07] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#5003ef]/50 transition-colors font-[family-name:var(--font-dm-sans)]"
                  >
                    <option value="criativo">Criativo</option>
                    <option value="vsl">VSL</option>
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                    <option value="copy">Copy</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="prioridade"
                    className="text-xs text-white/50 font-[family-name:var(--font-dm-sans)]"
                  >
                    Prioridade *
                  </label>
                  <select
                    id="prioridade"
                    required
                    value={form.prioridade}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm((f) => ({ ...f, prioridade: e.target.value }))
                    }
                    className="w-full rounded-lg bg-[#0a0a0f] border border-white/[0.07] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#5003ef]/50 transition-colors font-[family-name:var(--font-dm-sans)]"
                  >
                    <option value="urgente">Urgente</option>
                    <option value="normal">Normal</option>
                    <option value="pode_esperar">Pode esperar</option>
                  </select>
                </div>
              </div>

              {/* Prazo */}
              <div className="space-y-1.5">
                <label
                  htmlFor="prazo"
                  className="text-xs text-white/50 font-[family-name:var(--font-dm-sans)]"
                >
                  Prazo *
                </label>
                <input
                  id="prazo"
                  type="date"
                  required
                  value={form.prazo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((f) => ({ ...f, prazo: e.target.value }))
                  }
                  className="w-full rounded-lg bg-[#0a0a0f] border border-white/[0.07] text-white text-sm px-3 py-2.5 [color-scheme:dark] focus:outline-none focus:border-[#5003ef]/50 transition-colors font-[family-name:var(--font-dm-mono)]"
                />
              </div>

              {/* Funil */}
              <div className="space-y-1.5">
                <label
                  htmlFor="funilId"
                  className="text-xs text-white/50 font-[family-name:var(--font-dm-sans)]"
                >
                  Funil (opcional)
                </label>
                <select
                  id="funilId"
                  value={form.funilId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setForm((f) => ({ ...f, funilId: e.target.value }))
                  }
                  className="w-full rounded-lg bg-[#0a0a0f] border border-white/[0.07] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#5003ef]/50 transition-colors font-[family-name:var(--font-dm-sans)]"
                >
                  <option value="">Nenhum</option>
                  {funis.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link arquivo */}
              <div className="space-y-1.5">
                <label
                  htmlFor="linkArquivo"
                  className="text-xs text-white/50 font-[family-name:var(--font-dm-sans)]"
                >
                  Link do arquivo (opcional)
                </label>
                <input
                  id="linkArquivo"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={form.linkArquivo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((f) => ({ ...f, linkArquivo: e.target.value }))
                  }
                  className="w-full rounded-lg bg-[#0a0a0f] border border-white/[0.07] text-white text-sm px-3 py-2.5 placeholder:text-white/20 focus:outline-none focus:border-[#5003ef]/50 transition-colors font-[family-name:var(--font-dm-sans)]"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setForm(EMPTY_FORM);
                    setFormError(null);
                  }}
                  className="h-9 px-4 rounded-lg border border-white/[0.07] text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors font-[family-name:var(--font-dm-sans)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-4 rounded-lg bg-[#5003ef] hover:bg-[#6617f5] text-white text-sm font-medium disabled:opacity-50 transition-colors font-[family-name:var(--font-dm-sans)]"
                >
                  {submitting ? "Criando..." : "Criar tarefa"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Empty state ── */}
        {!error && tarefas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#12121a] border border-white/[0.07] flex items-center justify-center">
              <Activity className="h-6 w-6 text-white/20" />
            </div>
            <div className="space-y-1">
              <p className="text-white/60 text-base font-semibold font-[family-name:var(--font-syne)]">
                Nenhuma tarefa ainda
              </p>
              <p className="text-white/30 text-sm font-[family-name:var(--font-dm-sans)]">
                Clique em Adicionar para criar sua primeira tarefa.
              </p>
            </div>
          </div>
        )}

        {/* ── Urgentes ── */}
        {urgentes.length > 0 && (
          <SectionGroup title="Urgente" count={urgentes.length} accent="text-red-400">
            {urgentes.map((t) => (
              <TarefaCard
                key={t.id}
                tarefa={t}
                onMarkDone={handleMarkDone}
                onDelete={handleDelete}
              />
            ))}
          </SectionGroup>
        )}

        {/* ── Normais ── */}
        {normais.length > 0 && (
          <SectionGroup title="Normal" count={normais.length} accent="text-yellow-400">
            {normais.map((t) => (
              <TarefaCard
                key={t.id}
                tarefa={t}
                onMarkDone={handleMarkDone}
                onDelete={handleDelete}
              />
            ))}
          </SectionGroup>
        )}

        {/* ── Pode Esperar ── */}
        {podeEsperar.length > 0 && (
          <SectionGroup
            title="Pode Esperar"
            count={podeEsperar.length}
            accent="text-white/40"
          >
            {podeEsperar.map((t) => (
              <TarefaCard
                key={t.id}
                tarefa={t}
                onMarkDone={handleMarkDone}
                onDelete={handleDelete}
              />
            ))}
          </SectionGroup>
        )}

        {/* ── Concluídas (collapsed by default) ── */}
        {concluidas.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setConcluidasOpen((v) => !v)}
              className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm font-medium font-[family-name:var(--font-syne)]"
            >
              {concluidasOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Concluídas
              <span className="text-xs font-[family-name:var(--font-dm-mono)] text-white/30">
                {concluidas.length}
              </span>
            </button>

            {concluidasOpen && (
              <div className="space-y-2">
                {concluidas.map((t) => (
                  <TarefaCard
                    key={t.id}
                    tarefa={t}
                    onMarkDone={handleMarkDone}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
