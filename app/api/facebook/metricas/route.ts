import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMetricas } from "@/lib/facebook-api";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campanhaIds = searchParams.getAll("campanhaIds[]");
  const conjuntoIds = searchParams.getAll("conjuntoIds[]");
  const dataInicio = searchParams.get("dataInicio") || "";
  const dataFim = searchParams.get("dataFim") || "";

  try {
    const metricas = await getMetricas({ campanhaIds, conjuntoIds, dataInicio, dataFim });
    return NextResponse.json(metricas);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar métricas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
