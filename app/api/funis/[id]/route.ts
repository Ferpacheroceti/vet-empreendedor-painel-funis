import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const funil = await prisma.funil.findUnique({
    where: { id: params.id },
    include: {
      produtos: { orderBy: { ordem: "asc" } },
      campanhaLinks: true,
      historico: { orderBy: { data: "desc" } },
      gastoManual: true,
    },
  });

  if (!funil) return NextResponse.json({ error: "Funil não encontrado" }, { status: 404 });
  return NextResponse.json({ funil });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { nome, canal, status, investMeta, produtos, campanhaLinks } = body;

  // Delete existing produtos e campanhaLinks
  await prisma.produto.deleteMany({ where: { funilId: params.id } });
  await prisma.campanhaFunilLink.deleteMany({ where: { funilId: params.id } });

  const funil = await prisma.funil.update({
    where: { id: params.id },
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

  return NextResponse.json({ funil });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.funil.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
