import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVendas } from "@/lib/google-sheets";
import { calcularMetricas, calcularSaude } from "@/lib/metrics";
import { parseISO, format } from "date-fns";

type ProdutoRow = {
  id: string;
  funilId: string;
  nome: string;
  codigoHotmart: string;
  preco: number;
  tipo: string;
  metaMensal: number;
  ordem: number;
};

type GastoManualRow = {
  id: string;
  funilId: string;
  mes: string;
  valor: number;
};

type HistoricoRow = {
  id: string;
  funilId: string;
  tipo: string;
  data: Date;
  texto: string;
  isAtual: boolean;
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const inicioStr = searchParams.get("inicio");
  const fimStr = searchParams.get("fim");

  const funil = await prisma.funil.findUnique({
    where: { id: params.id },
    include: {
      produtos: { orderBy: { ordem: "asc" } },
      campanhaLinks: true,
      historico: true,
      gastoManual: true,
    },
  });

  if (!funil) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const produtos = funil.produtos as ProdutoRow[];
  const gastoManual = funil.gastoManual as GastoManualRow[];
  const historico = funil.historico as HistoricoRow[];

  if (!produtos.length) {
    return NextResponse.json({ faturamentoBruto: 0, roas: 0, saudeScore: 0 });
  }

  try {
    const inicio = inicioStr ? parseISO(inicioStr) : undefined;
    const fim = fimStr ? parseISO(fimStr) : undefined;
    const codigosProduto = produtos.map((p) => p.codigoHotmart);

    const vendas = await getVendas({ dataInicio: inicio, dataFim: fim, codigosProduto });

    const currentMes = format(new Date(), "yyyy-MM");
    const gastoManualDoMes = gastoManual.find((g) => g.mes === currentMes);

    const fbData = {
      gasto: gastoManualDoMes?.valor || 0,
      impressoes: 0,
      alcance: 0,
      cliques: 0,
      cpm: 0,
      cpc: 0,
      ctr: 0,
    };

    const metricas = calcularMetricas(vendas, produtos, fbData);
    const saude = calcularSaude(metricas, historico, produtos[0]?.metaMensal || 0);

    return NextResponse.json({ ...metricas, saudeScore: saude.score });
  } catch {
    return NextResponse.json({ faturamentoBruto: 0, roas: 0, saudeScore: 0 });
  }
}
