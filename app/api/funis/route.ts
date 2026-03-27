import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const funis = await prisma.funil.findMany({
    include: {
      produtos: { orderBy: { ordem: "asc" } },
      campanhaLinks: true,
      historico: { orderBy: { data: "desc" } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json({ funis });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { nome, canal, status, investMeta, produtos, campanhaLinks } = body;

  const funil = await prisma.funil.create({
    data: {
      nome,
      canal,
      status,
      investMeta: investMeta || 0,
      produtos: {
        create: (produtos || []).map((p: { nome: string; codigoHotmart: string; preco: number; tipo: string; metaMensal: number; ordem: number }) => ({
          nome: p.nome,
          codigoHotmart: p.codigoHotmart,
          preco: p.preco,
          tipo: p.tipo,
          metaMensal: p.metaMensal || 0,
          ordem: p.ordem,
        })),
      },
      campanhaLinks: {
        create: (campanhaLinks || []).map((c: { campanhaId: string; campanhaNome: string; conjuntoId?: string; conjuntoNome?: string }) => ({
          campanhaId: c.campanhaId,
          campanhaNome: c.campanhaNome,
          conjuntoId: c.conjuntoId || null,
          conjuntoNome: c.conjuntoNome || null,
        })),
      },
    },
    include: {
      produtos: { orderBy: { ordem: "asc" } },
      campanhaLinks: true,
    },
  });

  return NextResponse.json({ funil }, { status: 201 });
}
