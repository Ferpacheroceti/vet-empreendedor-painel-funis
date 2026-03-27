"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, TrendingUp } from "lucide-react";

interface FunilCardProps {
  funil: {
    id: string;
    nome: string;
    canal: string;
    status: string;
    produtos: Array<{
      nome: string;
      tipo: string;
      codigoHotmart: string;
      ordem: number;
    }>;
  };
  faturamento: number;
  roas: number;
  saudeScore: number;
}

const canalLabels: Record<string, string> = {
  trafico_pago: "Tráfego Pago",
  organico: "Orgânico",
  misto: "Misto",
  whatsapp: "WhatsApp",
  email: "Email",
};

const tipoColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  entrada: {
    bg: "bg-[#5003ef]/15",
    text: "text-[#a78bfa]",
    border: "border-[#5003ef]/30",
  },
  "order-bump": {
    bg: "bg-[#ff5000]/15",
    text: "text-[#fb923c]",
    border: "border-[#ff5000]/30",
  },
  upsell: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  webinar: {
    bg: "bg-teal-500/15",
    text: "text-teal-400",
    border: "border-teal-500/30",
  },
  downsell: {
    bg: "bg-white/5",
    text: "text-white/50",
    border: "border-white/10",
  },
};

function getSaudeColor(score: number): {
  bg: string;
  text: string;
  ring: string;
} {
  if (score >= 70)
    return {
      bg: "bg-green-500/20",
      text: "text-green-400",
      ring: "ring-green-500/40",
    };
  if (score >= 40)
    return {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      ring: "ring-yellow-500/40",
    };
  return {
    bg: "bg-red-500/20",
    text: "text-red-400",
    ring: "ring-red-500/40",
  };
}

function getStatusBadgeVariant(
  status: string
): "success" | "warning" | "danger" | "outline" {
  switch (status) {
    case "ativo":
      return "success";
    case "em_teste":
      return "warning";
    case "pausado":
      return "danger";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "ativo":
      return "Ativo";
    case "em_teste":
      return "Em Teste";
    case "pausado":
      return "Pausado";
    default:
      return status;
  }
}

export function FunilCard({
  funil,
  faturamento,
  roas,
  saudeScore,
}: FunilCardProps) {
  const produtosOrdenados = [...funil.produtos].sort(
    (a, b) => a.ordem - b.ordem
  );
  const saudeColors = getSaudeColor(saudeScore);

  return (
    <Card className="bg-[#12121a] border border-white/[0.07] hover:border-white/[0.14] transition-all duration-200 hover:shadow-lg hover:shadow-black/40 group flex flex-col">
      <CardHeader className="pb-3 space-y-0">
        {/* Top row: saude score + status + canal */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="purple" className="text-xs">
              {canalLabels[funil.canal] ?? funil.canal}
            </Badge>
            <Badge
              variant={getStatusBadgeVariant(funil.status)}
              className="text-xs"
            >
              {getStatusLabel(funil.status)}
            </Badge>
          </div>
          {/* Health score badge */}
          <div
            className={`
              flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
              text-sm font-bold ring-2
              ${saudeColors.bg} ${saudeColors.text} ${saudeColors.ring}
              font-[family-name:var(--font-dm-mono)]
            `}
            title={`Saúde: ${saudeScore}/100`}
          >
            {saudeScore}
          </div>
        </div>

        {/* Funnel name */}
        <h3 className="text-white font-bold text-base leading-tight font-[family-name:var(--font-syne)] group-hover:text-white/90 transition-colors">
          {funil.nome}
        </h3>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1 gap-4">
        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">
              Faturamento
            </p>
            <p className="text-white text-lg font-medium font-[family-name:var(--font-dm-mono)] leading-none">
              {formatCurrency(faturamento)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              ROAS
            </p>
            <p
              className={`text-lg font-medium font-[family-name:var(--font-dm-mono)] leading-none ${
                roas >= 2.5
                  ? "text-green-400"
                  : roas >= 1.5
                  ? "text-yellow-400"
                  : roas > 0
                  ? "text-red-400"
                  : "text-white/40"
              }`}
            >
              {roas > 0 ? `${roas.toFixed(2)}x` : "—"}
            </p>
          </div>
        </div>

        {/* Product sequence */}
        {produtosOrdenados.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">
              Sequência de Produtos
            </p>
            <div className="flex items-center flex-wrap gap-1">
              {produtosOrdenados.map((produto, idx) => {
                const colors =
                  tipoColors[produto.tipo] ?? tipoColors["downsell"];
                return (
                  <div key={produto.codigoHotmart} className="flex items-center gap-1">
                    <span
                      className={`
                        inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
                        border ${colors.bg} ${colors.text} ${colors.border}
                        max-w-[100px] truncate
                      `}
                      title={`${produto.nome} (${produto.tipo})`}
                    >
                      {produto.nome.length > 12
                        ? produto.nome.substring(0, 11) + "…"
                        : produto.nome}
                    </span>
                    {idx < produtosOrdenados.length - 1 && (
                      <ArrowRight className="h-2.5 w-2.5 text-white/20 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* CTA */}
        <Link href={`/funil/${funil.id}`} className="block">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 border-white/10 text-white/60 hover:text-white hover:border-[#5003ef]/60 hover:bg-[#5003ef]/10 transition-all"
          >
            Ver detalhe
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
