import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { campanhaLinks } = body;

  await prisma.campanhaFunilLink.deleteMany({ where: { funilId: params.id } });

  if (campanhaLinks && campanhaLinks.length > 0) {
    await prisma.campanhaFunilLink.createMany({
      data: campanhaLinks.map((c: { campanhaId: string; campanhaNome: string; conjuntoId?: string; conjuntoNome?: string }) => ({
        funilId: params.id,
        campanhaId: c.campanhaId,
        campanhaNome: c.campanhaNome,
        conjuntoId: c.conjuntoId || null,
        conjuntoNome: c.conjuntoNome || null,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
