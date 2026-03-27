"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface HistoricoItem {
  id: string;
  tipo: string;
  data: string;
  texto: string;
  isAtual: boolean;
}

interface HistoricoPanelProps {
  funilId: string;
  historico: HistoricoItem[];
  onAdd: (tipo: string, texto: string, isAtual: boolean) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

const tipoColors: Record<string, string> = {
  alteracao: "outline",
  teste: "orange",
  resultado: "success",
};

const tipoLabels: Record<string, string> = {
  alteracao: "Alteração",
  teste: "Teste",
  resultado: "Resultado",
};

export function HistoricoPanel({ historico, onAdd, onDelete }: HistoricoPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState("alteracao");
  const [texto, setTexto] = useState("");
  const [isAtual, setIsAtual] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!texto.trim()) return;
    setSaving(true);
    await onAdd(tipo, texto, isAtual);
    setTexto("");
    setIsAtual(false);
    setShowForm(false);
    setSaving(false);
  }

  const testeAtual = historico.find((h) => h.isAtual && h.tipo === "teste");

  return (
    <div className="bg-[#12121a] border border-white/7 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-syne text-base font-semibold text-white">Histórico</h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Registrar
        </Button>
      </div>

      {testeAtual && (
        <div className="flex items-center gap-2 bg-[#ff5000]/10 border border-[#ff5000]/20 rounded-lg px-3 py-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#ff5000] animate-pulse-slow flex-shrink-0" />
          <span className="text-xs text-[#ff5000] font-medium">Teste ativo:</span>
          <span className="text-xs text-white/70 truncate">{testeAtual.texto}</span>
        </div>
      )}

      {showForm && (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alteracao">Alteração</SelectItem>
                  <SelectItem value="teste">Teste</SelectItem>
                  <SelectItem value="resultado">Resultado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tipo === "teste" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAtual"
                  checked={isAtual}
                  onChange={(e) => setIsAtual(e.target.checked)}
                  className="rounded border-white/20"
                />
                <label htmlFor="isAtual" className="text-sm text-white/60">Teste atual</label>
              </div>
            )}
          </div>
          <Textarea
            placeholder="Descreva a alteração, teste ou resultado..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="text-sm"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
        {historico.length === 0 ? (
          <div className="text-center text-white/30 text-sm py-6">Nenhum registro ainda</div>
        ) : (
          historico.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex gap-3 p-3 rounded-lg border",
                item.isAtual
                  ? "bg-[#ff5000]/5 border-[#ff5000]/20"
                  : "bg-[#0a0a0f] border-white/5"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={tipoColors[item.tipo] as "outline" | "orange" | "success"} className="text-xs h-4">
                    {tipoLabels[item.tipo]}
                  </Badge>
                  {item.isAtual && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff5000] animate-pulse-slow" />
                  )}
                  <span className="text-xs text-white/30">
                    {format(parseISO(item.data), "dd/MM/yy")}
                  </span>
                </div>
                <p className="text-sm text-white/70 line-clamp-2">{item.texto}</p>
              </div>
              <button
                onClick={() => onDelete(item.id)}
                className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
