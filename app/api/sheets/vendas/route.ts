import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendas } from "@/lib/hotmart";
import { parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dataInicioStr = searchParams.get("dataInicio");
  const dataFimStr = searchParams.get("dataFim");
  const codigoProdutoStr = searchParams.get("codigoProduto");

  try {
    const vendas = await getVendas({
      dataInicio: dataInicioStr ? parseISO(dataInicioStr) : undefined,
      dataFim: dataFimStr ? parseISO(dataFimStr) : undefined,
      codigosProduto: codigoProdutoStr
        ? codigoProdutoStr.split(",").map((c) => c.trim())
        : undefined,
    });

    return NextResponse.json({ vendas });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar vendas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
