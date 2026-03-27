"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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

interface ConjuntoAnuncio {
  id: string;
  nome: string;
}

interface Campanha {
  id: string;
  nome: string;
  conjuntos?: ConjuntoAnuncio[];
}

interface FunilFormData {
  id?: string;
  nome: string;
  canal: string;
  status: string;
  investMeta: number;
  produtos: Produto[];
  campanhaLinks: CampanhaLink[];
}

export interface FunilFormProps {
  initialData?: FunilFormData;
  onSubmit: (data: unknown) => Promise<void>;
  isLoading: boolean;
}

// ─── Empty row factory ────────────────────────────────────────────────────────

function emptyProduto(ordem: number): Produto {
  return {
    nome: "",
    codigoHotmart: "",
    preco: 0,
    tipo: "entrada",
    metaMensal: 0,
    ordem,
  };
}

// ─── Produto Row ──────────────────────────────────────────────────────────────

interface ProdutoRowProps {
  produto: Produto;
  index: number;
  onChange: (index: number, field: keyof Produto, value: string | number) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function ProdutoRow({ produto, index, onChange, onRemove, canRemove }: ProdutoRowProps) {
  const [fetching, setFetching] = useState(false);

  const handleHotmartBlur = useCallback(async () => {
    const codigo = produto.codigoHotmart.trim();
    if (!codigo) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/sheets/vendas?codigoProduto=${encodeURIComponent(codigo)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.nome) {
          onChange(index, "nome", data.nome as string);
        }
      }
    } catch {
      // silent — user can fill manually
    } finally {
      setFetching(false);
    }
  }, [produto.codigoHotmart, index, onChange]);

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end">
      {/* Nome */}
      <div className="flex flex-col gap-1.5">
        {index === 0 && (
          <Label className="text-xs text-white/50 font-dm-sans">Nome do produto</Label>
        )}
        <div className="relative">
          <Input
            value={produto.nome}
            onChange={(e) => onChange(index, "nome", e.target.value)}
            placeholder="Nome do produto"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-[#5003ef]"
          />
          {fetching && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#5003ef] animate-pulse">
              buscando…
            </span>
          )}
        </div>
      </div>

      {/* Código Hotmart */}
      <div className="flex flex-col gap-1.5">
        {index === 0 && (
          <Label className="text-xs text-white/50 font-dm-sans">Código Hotmart</Label>
        )}
        <Input
          value={produto.codigoHotmart}
          onChange={(e) => onChange(index, "codigoHotmart", e.target.value)}
          onBlur={handleHotmartBlur}
          placeholder="XXXX"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-[#5003ef]"
        />
      </div>

      {/* Preço */}
      <div className="flex flex-col gap-1.5">
        {index === 0 && (
          <Label className="text-xs text-white/50 font-dm-sans">Preço (R$)</Label>
        )}
        <Input
          type="number"
          min={0}
          step={0.01}
          value={produto.preco === 0 ? "" : produto.preco}
          onChange={(e) => onChange(index, "preco", parseFloat(e.target.value) || 0)}
          placeholder="0,00"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-[#5003ef] font-dm-mono"
        />
      </div>

      {/* Tipo */}
      <div className="flex flex-col gap-1.5">
        {index === 0 && (
          <Label className="text-xs text-white/50 font-dm-sans">Tipo</Label>
        )}
        <Select
          value={produto.tipo}
          onValueChange={(val) => onChange(index, "tipo", val)}
        >
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="order-bump">Order Bump</SelectItem>
            <SelectItem value="upsell">Upsell</SelectItem>
            <SelectItem value="webinar">Webinar</SelectItem>
            <SelectItem value="downsell">Downsell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Meta vendas */}
      <div className="flex flex-col gap-1.5">
        {index === 0 && (
          <Label className="text-xs text-white/50 font-dm-sans">Meta vendas/mês</Label>
        )}
        <Input
          type="number"
          min={0}
          value={produto.metaMensal === 0 ? "" : produto.metaMensal}
          onChange={(e) => onChange(index, "metaMensal", parseInt(e.target.value) || 0)}
          placeholder="0"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-[#5003ef] font-dm-mono"
        />
      </div>

      {/* Remove */}
      <div className={cn("flex items-end", index === 0 ? "pb-0" : "")}>
        {index === 0 && <div className="text-xs text-transparent select-none mb-1.5">X</div>}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRemove}
          onClick={() => onRemove(index)}
          className="text-white/40 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-20"
          aria-label="Remover produto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Campaign section ──────────────────────────────────────────────────────────

interface CampanhaSectionProps {
  selectedLinks: CampanhaLink[];
  onLinksChange: (links: CampanhaLink[]) => void;
}

function CampanhaSection({ selectedLinks, onLinksChange }: CampanhaSectionProps) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(false);
  const [errorCampanhas, setErrorCampanhas] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoadingCampanhas(true);
    fetch("/api/facebook/campanhas")
      .then((res) => {
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        return res.json();
      })
      .then((data: Campanha[]) => {
        setCampanhas(data);
        setErrorCampanhas(null);
      })
      .catch((err: Error) => {
        setErrorCampanhas(err.message ?? "Falha ao carregar campanhas");
      })
      .finally(() => setLoadingCampanhas(false));
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Check if campaign-level link is selected (campaign without conjuntoId) */
  const isCampanhaChecked = (campanhaId: string) =>
    selectedLinks.some((l) => l.campanhaId === campanhaId && !l.conjuntoId);

  /** Check if conjuntoId-level link is selected */
  const isConjuntoChecked = (campanhaId: string, conjuntoId: string) =>
    selectedLinks.some((l) => l.campanhaId === campanhaId && l.conjuntoId === conjuntoId);

  const toggleCampanha = (campanha: Campanha) => {
    const alreadySelected = isCampanhaChecked(campanha.id);
    if (alreadySelected) {
      // remove all links for this campaign
      onLinksChange(selectedLinks.filter((l) => l.campanhaId !== campanha.id));
    } else {
      // remove existing conjunto-level links for this campaign and add campaign-level
      const filtered = selectedLinks.filter((l) => l.campanhaId !== campanha.id);
      onLinksChange([
        ...filtered,
        { campanhaId: campanha.id, campanhaNome: campanha.nome },
      ]);
    }
  };

  const toggleConjunto = (campanha: Campanha, conjunto: ConjuntoAnuncio) => {
    const alreadySelected = isConjuntoChecked(campanha.id, conjunto.id);
    if (alreadySelected) {
      onLinksChange(
        selectedLinks.filter(
          (l) => !(l.campanhaId === campanha.id && l.conjuntoId === conjunto.id)
        )
      );
    } else {
      onLinksChange([
        ...selectedLinks,
        {
          campanhaId: campanha.id,
          campanhaNome: campanha.nome,
          conjuntoId: conjunto.id,
          conjuntoNome: conjunto.nome,
        },
      ]);
    }
  };

  if (loadingCampanhas) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/50 py-4">
        <span className="h-4 w-4 rounded-full border-2 border-[#5003ef] border-t-transparent animate-spin" />
        Carregando campanhas…
      </div>
    );
  }

  if (errorCampanhas) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
        {errorCampanhas}
      </div>
    );
  }

  if (campanhas.length === 0) {
    return (
      <p className="text-sm text-white/40 py-4">Nenhuma campanha disponível.</p>
    );
  }

  return (
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
                id={`campanha-${campanha.id}`}
                checked={isCampanhaChecked(campanha.id)}
                onCheckedChange={() => toggleCampanha(campanha)}
              />
              <label
                htmlFor={`campanha-${campanha.id}`}
                className="flex-1 text-sm text-white/80 cursor-pointer select-none"
              >
                {campanha.nome}
              </label>
              {hasConjuntos && (
                <button
                  type="button"
                  onClick={() => toggleExpand(campanha.id)}
                  className="text-white/40 hover:text-white/80 transition-colors"
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
              <div className="border-t border-white/7 bg-[#12121a] flex flex-col gap-0">
                {campanha.conjuntos!.map((conjunto) => (
                  <div
                    key={conjunto.id}
                    className="flex items-center gap-3 px-6 py-2.5 border-b border-white/5 last:border-b-0"
                  >
                    <Checkbox
                      id={`conjunto-${conjunto.id}`}
                      checked={isConjuntoChecked(campanha.id, conjunto.id)}
                      onCheckedChange={() => toggleConjunto(campanha, conjunto)}
                    />
                    <label
                      htmlFor={`conjunto-${conjunto.id}`}
                      className="text-sm text-white/60 cursor-pointer select-none"
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
  );
}

// ─── Main FunilForm ────────────────────────────────────────────────────────────

export function FunilForm({ initialData, onSubmit, isLoading }: FunilFormProps) {
  const [nome, setNome] = useState(initialData?.nome ?? "");
  const [canal, setCanal] = useState(initialData?.canal ?? "trafico_pago");
  const [status, setStatus] = useState(initialData?.status ?? "ativo");
  const [investMeta, setInvestMeta] = useState(initialData?.investMeta ?? 0);
  const [produtos, setProdutos] = useState<Produto[]>(
    initialData?.produtos && initialData.produtos.length > 0
      ? initialData.produtos
      : [emptyProduto(0), emptyProduto(1)]
  );
  const [campanhaLinks, setCampanhaLinks] = useState<CampanhaLink[]>(
    initialData?.campanhaLinks ?? []
  );
  const [formError, setFormError] = useState<string | null>(null);

  const handleProdutoChange = useCallback(
    (index: number, field: keyof Produto, value: string | number) => {
      setProdutos((prev) =>
        prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  const handleAddProduto = () => {
    setProdutos((prev) => [...prev, emptyProduto(prev.length)]);
  };

  const handleRemoveProduto = (index: number) => {
    setProdutos((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nome.trim()) {
      setFormError("O nome do funil é obrigatório.");
      return;
    }

    const payload: FunilFormData = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      nome: nome.trim(),
      canal,
      status,
      investMeta,
      produtos: produtos.map((p, i) => ({ ...p, ordem: i })),
      campanhaLinks,
    };

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar funil.";
      setFormError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* ── Section 1: Informações Gerais ──────────────────────────────────── */}
      <Card className="bg-[#12121a] border-white/7">
        <CardHeader className="pb-4">
          <CardTitle className="font-syne text-white text-base">
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Nome do funil */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="funil-nome" className="text-sm text-white/70 font-dm-sans">
              Nome do funil
            </Label>
            <Input
              id="funil-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Funil Consulta Premium"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-[#5003ef]"
            />
          </div>

          {/* Canal */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="funil-canal" className="text-sm text-white/70 font-dm-sans">
              Canal
            </Label>
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger id="funil-canal" className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trafico_pago">Tráfego Pago</SelectItem>
                <SelectItem value="organico">Orgânico</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="funil-status" className="text-sm text-white/70 font-dm-sans">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="funil-status" className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="em_teste">Em teste</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Investimento meta mensal */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="funil-invest" className="text-sm text-white/70 font-dm-sans">
              Investimento meta mensal (R$)
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40 font-dm-mono">
                R$
              </span>
              <Input
                id="funil-invest"
                type="number"
                min={0}
                step={0.01}
                value={investMeta === 0 ? "" : investMeta}
                onChange={(e) => setInvestMeta(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-[#5003ef] pl-10 font-dm-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Produtos ────────────────────────────────────────────── */}
      <Card className="bg-[#12121a] border-white/7">
        <CardHeader className="pb-4">
          <CardTitle className="font-syne text-white text-base">
            Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <div className="flex flex-col gap-3 min-w-[700px]">
              {produtos.map((produto, index) => (
                <ProdutoRow
                  key={index}
                  produto={produto}
                  index={index}
                  onChange={handleProdutoChange}
                  onRemove={handleRemoveProduto}
                  canRemove={produtos.length > 1}
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddProduto}
            className="w-fit mt-1 border-white/10 text-white/70 hover:text-white hover:border-[#5003ef]/50 hover:bg-[#5003ef]/10 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Adicionar produto
          </Button>
        </CardContent>
      </Card>

      {/* ── Section 3: Campanhas Facebook ─────────────────────────────────── */}
      <Card className="bg-[#12121a] border-white/7">
        <CardHeader className="pb-4">
          <CardTitle className="font-syne text-white text-base">
            Vincular campanhas do Facebook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampanhaSection
            selectedLinks={campanhaLinks}
            onLinksChange={setCampanhaLinks}
          />
          {campanhaLinks.length > 0 && (
            <p className="mt-3 text-xs text-white/40 font-dm-sans">
              {campanhaLinks.length} vínculo(s) selecionado(s)
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Error feedback ─────────────────────────────────────────────────── */}
      {formError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {formError}
        </div>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isLoading}
          className={cn(
            "bg-[#5003ef] hover:bg-[#5003ef]/90 text-white font-dm-sans font-medium px-8",
            isLoading && "opacity-60 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Salvando…
            </span>
          ) : (
            "Salvar funil"
          )}
        </Button>
      </div>
    </form>
  );
}
