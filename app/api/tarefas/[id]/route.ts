import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { descricao, tipo, prazo, linkArquivo, funilId, prioridade, status } = body;

  const existing = await prisma.tarefa.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (descricao !== undefined) data.descricao = descricao;
  if (tipo !== undefined) data.tipo = tipo;
  if (prazo !== undefined) data.prazo = new Date(prazo);
  if (linkArquivo !== undefined) data.linkArquivo = linkArquivo || null;
  if (funilId !== undefined) data.funilId = funilId || null;
  if (prioridade !== undefined) data.prioridade = prioridade;
  if (status !== undefined) {
    data.status = status;
    if (status === "feito" && !existing.concluidoEm) {
      data.concluidoEm = new Date();
    } else if (status === "pendente") {
      data.concluidoEm = null;
    }
  }

  const tarefa = await prisma.tarefa.update({
    where: { id: params.id },
    data,
    include: {
      funil: {
        select: { id: true, nome: true },
      },
    },
  });

  return NextResponse.json({ tarefa });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.tarefa.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  await prisma.tarefa.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
