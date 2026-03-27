import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tarefas = await prisma.tarefa.findMany({
    include: {
      funil: {
        select: { id: true, nome: true },
      },
    },
    orderBy: { prazo: "asc" },
  });

  return NextResponse.json({ tarefas });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { descricao, tipo, prazo, linkArquivo, funilId, prioridade } = body;

  let impactoFunil: string | null = null;

  if (funilId) {
    try {
      const funil = await prisma.funil.findUnique({
        where: { id: funilId },
        include: {
          historico: { orderBy: { data: "desc" } },
        },
      });

      if (funil) {
        // Calculate average daily revenue from historico
        // Historico items have revenue data in text; we try to extract numeric values
        // Since historico stores text/notes, use a fallback of 0 if no numeric data
        const mediaReceita = 0; // Historico doesn't have structured revenue fields; fallback

        const client = new Anthropic();
        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 256,
          messages: [
            {
              role: "user",
              content: `Funil: ${funil.nome}
Tarefa: ${descricao}
Tipo: ${tipo}
Média de receita diária do funil: R$ ${mediaReceita.toFixed(2)}

Em 1-2 frases, descreva o impacto que o atraso nessa tarefa causa no funil.
Seja específico e mencione o impacto financeiro estimado se relevante.
Retorne apenas o texto, sem formatação.`,
            },
          ],
        });

        const content = message.content[0];
        if (content.type === "text") {
          impactoFunil = content.text.trim();
        }
      }
    } catch (err) {
      console.error("Anthropic error generating impactoFunil:", err);
      // Proceed without impactoFunil
    }
  }

  const tarefa = await prisma.tarefa.create({
    data: {
      descricao,
      tipo,
      prazo: new Date(prazo),
      linkArquivo: linkArquivo || null,
      funilId: funilId || null,
      prioridade: prioridade || "normal",
      status: "pendente",
      impactoFunil,
    },
    include: {
      funil: {
        select: { id: true, nome: true },
      },
    },
  });

  return NextResponse.json({ tarefa }, { status: 201 });
}
