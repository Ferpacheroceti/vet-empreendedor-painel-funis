"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FunilForm } from "@/components/dashboard/funil-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Produto {
  id?: string;
  nome: string;
  codigoHotmart: string;
  preco: number;
  tipo: string;
  metaMensal: number;
  ordem: number;
}

interface CampanhaLink {
  campanhaId: string;
  campanhaNome: string;
  conjuntoId?: string;
  conjuntoNome?: string;
}

interface FunilData {
  id: string;
  nome: string;
  canal: string;
  status: string;
  investMeta: number;
  produtos: Produto[];
  campanhaLinks: CampanhaLink[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditarFunilPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [funilData, setFunilData] = useState<FunilData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Fetch existing funil ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) {
      setFetchError("ID do funil inválido.");
      setFetchLoading(false);
      return;
    }

    setFetchLoading(true);
    setFetchError(null);

    fetch(`/api/funis/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Erro ${res.status} ao buscar funil`);
        return res.json();
      })
      .then((data: FunilData) => {
        setFunilData(data);
      })
      .catch((err: Error) => {
        setFetchError(err.message ?? "Não foi possível carregar os dados do funil.");
      })
      .finally(() => setFetchLoading(false));
  }, [id]);

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = async (data: unknown) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/funis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message ?? `Erro ${res.status} ao atualizar funil`
        );
      }

      router.push(`/funil/${id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao atualizar funil.";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-white/7 bg-[#0a0a0f]/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white/50 hover:text-white hover:bg-white/5 shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1
              className="text-xl font-semibold text-white leading-none"
              style={{ fontFamily: "var(--font-syne), sans-serif" }}
            >
              {fetchLoading
                ? "Carregando funil…"
                : funilData
                ? `Editar: ${funilData.nome}`
                : "Editar Funil"}
            </h1>
            <p className="text-sm text-white/50 mt-0.5">
              Vet Empreendedor — Painel de Funis
            </p>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Fetch loading skeleton */}
        {fetchLoading && (
          <div className="flex flex-col gap-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/7 bg-[#12121a] h-40"
              />
            ))}
          </div>
        )}

        {/* Fetch error */}
        {!fetchLoading && fetchError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-6 text-sm text-red-400 flex flex-col items-center gap-3">
            <p>{fetchError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/funil")}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              Voltar para a lista
            </Button>
          </div>
        )}

        {/* Submit error banner */}
        {submitError && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {submitError}
          </div>
        )}

        {/* Form */}
        {!fetchLoading && funilData && (
          <FunilForm
            initialData={funilData}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        )}
      </main>
    </div>
  );
}
