import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tipo, texto, isAtual } = body;

  // Se marcar como atual, desmarcar os outros
  if (isAtual) {
    await prisma.historicoItem.updateMany({
      where: { funilId: params.id },
      data: { isAtual: false },
    });
  }

  const item = await prisma.historicoItem.create({
    data: {
      funilId: params.id,
      tipo,
      texto,
      data: new Date(),
      isAtual: isAtual || false,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  await prisma.historicoItem.delete({ where: { id: itemId, funilId: params.id } });
  return NextResponse.json({ ok: true });
}
