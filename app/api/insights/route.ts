import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metricas = await req.json();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Você é um especialista em análise de funis de marketing digital para negócios educacionais online.
Analise as métricas fornecidas e retorne insights acionáveis em JSON estruturado.

Benchmarks de referência:
- ROAS bom: > 2.5x | ROAS excelente: > 4x
- Taxa de order bump boa: > 35% | excelente: > 50%
- CTR bom: > 1.5% | excelente: > 3%
- Taxa de conversão boa: > 1%
- CPM aceitável: < R$ 20
- Frequência ideal: 2-4x
- Conversão front→2º produto boa: > 30%

Retorne APENAS JSON válido neste formato:
{
  "pontosCriticos": ["string com problema urgente"],
  "oportunidades": ["string com oportunidade e como aproveitar"],
  "acoesPrioritarias": [
    {"acao": "descrição da ação", "impactoEstimado": "impacto esperado", "prazo": "curto/médio/longo prazo"}
  ],
  "resumoGeral": "resumo executivo em 2-3 frases"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analise estas métricas do funil:\n${JSON.stringify(metricas, null, 2)}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Resposta inesperada da IA");
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado na resposta");

    const insights = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ insights });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
