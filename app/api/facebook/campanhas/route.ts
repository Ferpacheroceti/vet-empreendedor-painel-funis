import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCampanhas } from "@/lib/facebook-api";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const campanhas = await getCampanhas();
    return NextResponse.json({ campanhas });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar campanhas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
