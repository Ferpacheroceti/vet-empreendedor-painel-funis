"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampanhaLink {
  campanhaId: string;
  campanhaNome: string;
  conjuntoId?: string;
  conjuntoNome?: string;
}

interface ConjuntoAnuncio {
  id: string;
  nome: string;
}

interface Campanha {
  id: string;
  nome: string;
  conjuntos?: ConjuntoAnuncio[];
}

export interface VincularCampanhasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: string;
  existingLinks: CampanhaLink[];
  onSave: (links: CampanhaLink[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VincularCampanhasModal({
  open,
  onOpenChange,
  funilId,
  existingLinks,
  onSave,
}: VincularCampanhasModalProps) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<CampanhaLink[]>(existingLinks);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sync prop changes
  useEffect(() => {
    setSelectedLinks(existingLinks);
  }, [existingLinks]);

  // Fetch campaigns when modal opens
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);

    fetch("/api/facebook/campanhas")
      .then((res) => {
        if (!res.ok) throw new Error(`Erro ${res.status} ao buscar campanhas`);
        return res.json();
      })
      .then((data: Campanha[]) => {
        setCampanhas(data);
      })
      .catch((err: Error) => {
        setError(err.message ?? "Falha ao carregar campanhas");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isCampanhaChecked = (campanhaId: string) =>
    selectedLinks.some((l) => l.campanhaId === campanhaId && !l.conjuntoId);

  const isConjuntoChecked = (campanhaId: string, conjuntoId: string) =>
    selectedLinks.some((l) => l.campanhaId === campanhaId && l.conjuntoId === conjuntoId);

  const toggleCampanha = (campanha: Campanha) => {
    const already = isCampanhaChecked(campanha.id);
    if (already) {
      setSelectedLinks((prev) => prev.filter((l) => l.campanhaId !== campanha.id));
    } else {
      setSelectedLinks((prev) => [
        ...prev.filter((l) => l.campanhaId !== campanha.id),
        { campanhaId: campanha.id, campanhaNome: campanha.nome },
      ]);
    }
  };

  const toggleConjunto = (campanha: Campanha, conjunto: ConjuntoAnuncio) => {
    const already = isConjuntoChecked(campanha.id, conjunto.id);
    if (already) {
      setSelectedLinks((prev) =>
        prev.filter(
          (l) => !(l.campanhaId === campanha.id && l.conjuntoId === conjunto.id)
        )
      );
    } else {
      setSelectedLinks((prev) => [
        ...prev,
        {
          campanhaId: campanha.id,
          campanhaNome: campanha.nome,
          conjuntoId: conjunto.id,
          conjuntoNome: conjunto.nome,
        },
      ]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/funis/${funilId}/campanhas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campanhaLinks: selectedLinks }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `Erro ${res.status}`);
      }

      onSave(selectedLinks);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar vínculos.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!saving) onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#12121a] border-white/10 max-w-xl w-full max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/7 shrink-0">
          <DialogTitle className="font-syne text-white text-lg">
            Vincular Campanhas do Facebook
          </DialogTitle>
          <p className="text-sm text-white/50 mt-1 font-dm-sans">
            Selecione campanhas e/ou conjuntos de anúncios para vincular a este funil.
          </p>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-white/50 py-6 justify-center">
              <span className="h-4 w-4 rounded-full border-2 border-[#5003ef] border-t-transparent animate-spin" />
              Carregando campanhas…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && campanhas.length === 0 && (
            <p className="text-sm text-white/40 py-6 text-center">
              Nenhuma campanha disponível.
            </p>
          )}

          {!loading && campanhas.length > 0 && (
            <div className="flex flex-col gap-2">
              {campanhas.map((campanha) => {
                const expanded = expandedIds.has(campanha.id);
                const hasConjuntos = (campanha.conjuntos?.length ?? 0) > 0;

                return (
                  <div
                    key={campanha.id}
                    className="rounded-lg border border-white/7 bg-[#0a0a0f] overflow-hidden"
                  >
                    {/* Campaign row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Checkbox
                        id={`modal-camp-${campanha.id}`}
                        checked={isCampanhaChecked(campanha.id)}
                        onCheckedChange={() => toggleCampanha(campanha)}
                      />
                      <label
                        htmlFor={`modal-camp-${campanha.id}`}
                        className="flex-1 text-sm text-white/80 cursor-pointer select-none leading-snug"
                      >
                        {campanha.nome}
                      </label>
                      {hasConjuntos && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(campanha.id)}
                          className="text-white/40 hover:text-white/80 transition-colors shrink-0"
                          aria-label={expanded ? "Recolher conjuntos" : "Expandir conjuntos"}
                        >
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Ad sets */}
                    {expanded && hasConjuntos && (
                      <div className="border-t border-white/7 bg-[#12121a]">
                        {campanha.conjuntos!.map((conjunto) => (
                          <div
                            key={conjunto.id}
                            className="flex items-center gap-3 px-6 py-2.5 border-b border-white/5 last:border-b-0"
                          >
                            <Checkbox
                              id={`modal-conj-${conjunto.id}`}
                              checked={isConjuntoChecked(campanha.id, conjunto.id)}
                              onCheckedChange={() => toggleConjunto(campanha, conjunto)}
                            />
                            <label
                              htmlFor={`modal-conj-${conjunto.id}`}
                              className="text-sm text-white/60 cursor-pointer select-none leading-snug"
                            >
                              {conjunto.nome}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-white/7 shrink-0 flex flex-row items-center justify-between gap-3">
          <span className="text-xs text-white/40 font-dm-sans">
            {selectedLinks.length} vínculo(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              className={cn(
                "bg-[#5003ef] hover:bg-[#5003ef]/90 text-white font-dm-sans",
                (saving || loading) && "opacity-60 cursor-not-allowed"
              )}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Salvando…
                </span>
              ) : (
                "Salvar vínculos"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
