"use client";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type Preset = "hoje" | "ontem" | "7dias" | "30dias" | "este_mes" | "mes_anterior" | "personalizado";

interface PeriodFilterProps {
  onPeriodChange?: (inicio: Date, fim: Date) => void;
}

function getPresetDates(preset: Preset): { inicio: Date; fim: Date } {
  const now = new Date();
  switch (preset) {
    case "hoje":
      return { inicio: startOfDay(now), fim: endOfDay(now) };
    case "ontem":
      const ontem = subDays(now, 1);
      return { inicio: startOfDay(ontem), fim: endOfDay(ontem) };
    case "7dias":
      return { inicio: startOfDay(subDays(now, 6)), fim: endOfDay(now) };
    case "30dias":
      return { inicio: startOfDay(subDays(now, 29)), fim: endOfDay(now) };
    case "este_mes":
      return { inicio: startOfMonth(now), fim: endOfDay(now) };
    case "mes_anterior":
      const mesAnterior = subMonths(now, 1);
      return { inicio: startOfMonth(mesAnterior), fim: endOfMonth(mesAnterior) };
    default:
      return { inicio: startOfDay(subDays(now, 29)), fim: endOfDay(now) };
  }
}

const presetLabels: Record<Preset, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  este_mes: "Este mês",
  mes_anterior: "Mês anterior",
  personalizado: "Personalizado",
};

export function PeriodFilter({ onPeriodChange }: PeriodFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<Preset>(() => {
    return (searchParams.get("preset") as Preset) || "30dias";
  });

  const [showCustom, setShowCustom] = useState(preset === "personalizado");
  const [customStart, setCustomStart] = useState(() => {
    const s = searchParams.get("inicio");
    return s ? s.substring(0, 16) : format(subDays(new Date(), 29), "yyyy-MM-dd'T'HH:mm");
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const e = searchParams.get("fim");
    return e ? e.substring(0, 16) : format(new Date(), "yyyy-MM-dd'T'HH:mm");
  });

  const applyPeriod = useCallback((selectedPreset: Preset, start?: string, end?: string) => {
    let inicio: Date, fim: Date;

    if (selectedPreset === "personalizado" && start && end) {
      inicio = new Date(start);
      fim = new Date(end);
    } else {
      const dates = getPresetDates(selectedPreset);
      inicio = dates.inicio;
      fim = dates.fim;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", selectedPreset);
    params.set("inicio", inicio.toISOString());
    params.set("fim", fim.toISOString());
    router.push(`?${params.toString()}`);

    onPeriodChange?.(inicio, fim);
  }, [router, searchParams, onPeriodChange]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    setShowCustom(p === "personalizado");
    if (p !== "personalizado") {
      applyPeriod(p);
    }
  };

  const handleApplyCustom = () => {
    applyPeriod("personalizado", customStart, customEnd);
  };

  const currentDates = preset !== "personalizado"
    ? getPresetDates(preset)
    : { inicio: new Date(customStart), fim: new Date(customEnd) };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-sm text-white/50">
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Período:</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {(Object.keys(presetLabels) as Preset[]).filter(p => p !== "personalizado").map((p) => (
          <Button
            key={p}
            variant={preset === p ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(p)}
            className="text-xs h-7 px-2"
          >
            {presetLabels[p]}
          </Button>
        ))}
        <Button
          variant={preset === "personalizado" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePreset("personalizado")}
          className="text-xs h-7 px-2"
        >
          Personalizado <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="datetime-local"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-7 text-xs w-44"
          />
          <span className="text-white/30">→</span>
          <Input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-7 text-xs w-44"
          />
          <Button size="sm" onClick={handleApplyCustom} className="h-7 text-xs">
            Aplicar
          </Button>
        </div>
      )}

      {preset !== "personalizado" && (
        <span className="text-xs text-white/30">
          {format(currentDates.inicio, "dd/MM/yyyy", { locale: ptBR })} — {format(currentDates.fim, "dd/MM/yyyy", { locale: ptBR })}
        </span>
      )}
    </div>
  );
}
