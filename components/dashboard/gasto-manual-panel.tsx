"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GastoManual {
  id: string;
  mes: string;
  valor: number;
}

interface GastoManualPanelProps {
  funilId: string;
  gastoManual: GastoManual[];
  onSave: (mes: string, valor: number) => Promise<void>;
}

export function GastoManualPanel({ gastoManual, onSave }: GastoManualPanelProps) {
  const currentMes = format(new Date(), "yyyy-MM");
  const [mes, setMes] = useState(currentMes);
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  const existingForMes = gastoManual.find((g) => g.mes === mes);

  async function handleSave() {
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v)) return;
    setSaving(true);
    await onSave(mes, v);
    setSaving(false);
    setValor("");
  }

  return (
    <div className="bg-[#12121a] border border-white/7 rounded-xl p-6">
      <h2 className="font-syne text-base font-semibold text-white mb-4">
        Gasto Manual por Período
      </h2>
      <p className="text-xs text-white/40 mb-4">
        Use quando a API do Facebook não estiver disponível. O dado da API tem prioridade.
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1">Mês</Label>
            <Input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Valor (R$)</Label>
            <Input
              type="text"
              placeholder={existingForMes ? String(existingForMes.valor) : "0,00"}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || !valor}>
          {saving ? "Salvando..." : existingForMes ? "Atualizar" : "Salvar"}
        </Button>
      </div>

      {gastoManual.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/7">
          <div className="text-xs text-white/40 mb-2">Registros</div>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
            {gastoManual
              .sort((a, b) => b.mes.localeCompare(a.mes))
              .map((g) => (
                <div key={g.id} className="flex justify-between items-center text-sm">
                  <span className="text-white/60">
                    {format(new Date(g.mes + "-01"), "MMMM/yyyy", { locale: ptBR })}
                  </span>
                  <span className="font-dm-mono text-white">{formatCurrency(g.valor)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
