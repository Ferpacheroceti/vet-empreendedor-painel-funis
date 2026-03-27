import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { mes, valor } = body;

  const existing = await prisma.gastoManual.findFirst({
    where: { funilId: params.id, mes },
  });

  if (existing) {
    const updated = await prisma.gastoManual.update({
      where: { id: existing.id },
      data: { valor },
    });
    return NextResponse.json({ gastoManual: updated });
  }

  const gastoManual = await prisma.gastoManual.create({
    data: { funilId: params.id, mes, valor },
  });

  return NextResponse.json({ gastoManual }, { status: 201 });
}
