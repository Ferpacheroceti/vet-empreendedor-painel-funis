"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FunilForm } from "@/components/dashboard/funil-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NovoFunilPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (data: unknown) => {
    setIsLoading(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/funis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message ?? `Erro ${res.status} ao criar funil`
        );
      }

      const created = await res.json();
      const id: string =
        (created as { id?: string }).id ?? (created as { funil?: { id?: string } }).funil?.id ?? "";

      if (id) {
        router.push(`/funil/${id}`);
      } else {
        // Fallback: go to funis list if id is unknown
        router.push("/funil");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao criar funil.";
      setSubmitError(message);
      setIsLoading(false);
    }
  };

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
              Novo Funil
            </h1>
            <p className="text-sm text-white/50 mt-0.5">
              Vet Empreendedor — Painel de Funis
            </p>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {submitError && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {submitError}
          </div>
        )}

        <FunilForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
