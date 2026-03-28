import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVendas } from "@/lib/hotmart";
import { getMetricas } from "@/lib/facebook-api";
import Anthropic from "@anthropic-ai/sdk";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

// ─── GET: last 30 days of analyses ───────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const analises = await prisma.analiseDiaria.findMany({
      orderBy: { data: "desc" },
      take: 30,
    });

    return NextResponse.json({ analises });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar análises";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: run daily analysis for yesterday ───────────────────────────────────

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const session = await getServerSession(authOptions);

  if (!session && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Yesterday's date range ────────────────────────────────────────────
    const yesterday = subDays(new Date(), 1);
    const dataInicio = startOfDay(yesterday);
    const dataFim = endOfDay(yesterday);
    const dateStr = format(yesterday, "yyyy-MM-dd");

    // Check if analysis for this day already exists
    const existing = await prisma.analiseDiaria.findFirst({
      where: {
        data: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        message: "Análise para este dia já existe",
        analise: existing,
      });
    }

    // ── 2. Fetch sales data from Google Sheets ───────────────────────────────
    let vendas: Awaited<ReturnType<typeof getVendas>> = [];
    try {
      vendas = await getVendas({ dataInicio, dataFim });
    } catch (err) {
      console.error("[analise-diaria] Erro ao buscar vendas:", err);
      // Continue without sales data rather than failing entirely
    }

    // ── 3. Fetch Facebook metrics for yesterday ──────────────────────────────
    let fbMetricas: Awaited<ReturnType<typeof getMetricas>> | null = null;
    try {
      fbMetricas = await getMetricas({
        dataInicio: dateStr,
        dataFim: dateStr,
      });
    } catch (err) {
      console.error("[analise-diaria] Erro ao buscar métricas Facebook:", err);
      // Continue without FB data rather than failing entirely
    }

    // ── 4. Aggregate sales data ──────────────────────────────────────────────
    const totalFaturamento = vendas.reduce((sum, v) => sum + v.preco, 0);
    const investimento = fbMetricas?.gasto ?? 0;
    const roas = investimento > 0 ? totalFaturamento / investimento : 0;

    // Group sales by campaign
    const vendasPorCampanha = vendas.reduce<Record<string, { receita: number; quantidade: number }>>(
      (acc, v) => {
        const key = v.campanhaNome || v.utmCampaign || "Orgânico";
        if (!acc[key]) acc[key] = { receita: 0, quantidade: 0 };
        acc[key].receita += v.preco;
        acc[key].quantidade += 1;
        return acc;
      },
      {}
    );

    // Group sales by utm_content (creative identifier)
    const vendasPorCriativo = vendas.reduce<Record<string, { receita: number; quantidade: number }>>(
      (acc, v) => {
        const key = v.utmContent || v.utmTerm || "Desconhecido";
        if (!acc[key]) acc[key] = { receita: 0, quantidade: 0 };
        acc[key].receita += v.preco;
        acc[key].quantidade += 1;
        return acc;
      },
      {}
    );

    // Enrich FB campaign data with revenue from sales
    const campanhasEnriquecidas = (fbMetricas?.porCampanha ?? []).map((c) => {
      const vendasMatch = vendasPorCampanha[c.nome] ?? { receita: 0, quantidade: 0 };
      const receitaCampanha = vendasMatch.receita > 0 ? vendasMatch.receita : c.receita;
      const roasCampanha = c.gasto > 0 ? receitaCampanha / c.gasto : 0;
      return { ...c, receita: receitaCampanha, roas: roasCampanha };
    });

    // ── 5. Build Anthropic prompt ────────────────────────────────────────────
    const systemPrompt = `Você é um especialista em análise de performance de funis de tráfego pago para infoprodutos.
Analise os dados do dia e retorne um JSON estruturado com:
{
  "resumo": "resumo executivo em 2-3 frases",
  "oQueFunciona": "o que está performando bem (texto)",
  "oQueMelhorar": "o que precisa de atenção (texto)",
  "criativos": [{"id":"","nome":"","gasto":0,"roas":0,"avaliacao":"bom|neutro|ruim","observacao":""}],
  "campanhas": [{"id":"","nome":"","gasto":0,"roas":0,"avaliacao":"bom|neutro|ruim","observacao":""}],
  "recomendacoes": [{"acao":"","impacto":"alto|medio|baixo","urgencia":"hoje|essa_semana|pode_esperar"}]
}
Responda APENAS com o JSON, sem markdown.`;

    const userContent = {
      data: dateStr,
      resumoFinanceiro: {
        investimento,
        faturamento: totalFaturamento,
        roas: parseFloat(roas.toFixed(2)),
        totalVendas: vendas.length,
      },
      facebookMetricas: fbMetricas
        ? {
            gasto: fbMetricas.gasto,
            impressoes: fbMetricas.impressoes,
            cliques: fbMetricas.cliques,
            cpm: parseFloat(fbMetricas.cpm.toFixed(2)),
            cpc: parseFloat(fbMetricas.cpc.toFixed(2)),
            ctr: parseFloat(fbMetricas.ctr.toFixed(2)),
            alcance: fbMetricas.alcance,
          }
        : null,
      campanhas: campanhasEnriquecidas.length > 0
        ? campanhasEnriquecidas
        : Object.entries(vendasPorCampanha).map(([nome, dados]) => ({
            id: "",
            nome,
            gasto: 0,
            receita: dados.receita,
            roas: 0,
            quantidade: dados.quantidade,
          })),
      conjuntos: (fbMetricas?.porConjunto ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        gasto: c.gasto,
        roas: c.roas,
      })),
      criativos: Object.entries(vendasPorCriativo).map(([nome, dados]) => ({
        identificador: nome,
        receita: dados.receita,
        quantidade: dados.quantidade,
      })),
      vendasDetalhadas: vendas.slice(0, 50).map((v) => ({
        produto: v.nomeProduto,
        valor: v.preco,
        origem: v.origemParsed,
        campanha: v.campanhaNome || v.utmCampaign,
        conteudo: v.utmContent,
      })),
    };

    // ── 6. Call Anthropic ────────────────────────────────────────────────────
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const aiResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analise os dados de performance do dia ${dateStr}:\n${JSON.stringify(userContent, null, 2)}`,
        },
      ],
    });

    const aiContent = aiResponse.content[0];
    if (aiContent.type !== "text") {
      throw new Error("Resposta inesperada da IA");
    }

    // Extract JSON — strip any accidental markdown fences
    const jsonMatch = aiContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON não encontrado na resposta da IA");
    }

    let parsed: {
      resumo: string;
      oQueFunciona: string;
      oQueMelhorar: string;
      criativos: unknown[];
      campanhas: unknown[];
      recomendacoes: unknown[];
    };

    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Falha ao parsear JSON da resposta da IA");
    }

    // ── 7. Save to database ──────────────────────────────────────────────────
    const analise = await prisma.analiseDiaria.create({
      data: {
        data: dataInicio,
        investimento,
        faturamento: totalFaturamento,
        roas: parseFloat(roas.toFixed(4)),
        resumo: parsed.resumo ?? "",
        criativos: JSON.stringify(parsed.criativos ?? []),
        campanhas: JSON.stringify(parsed.campanhas ?? []),
        oQueFunciona: parsed.oQueFunciona ?? "",
        oQueMelhorar: parsed.oQueMelhorar ?? "",
        recomendacoes: JSON.stringify(parsed.recomendacoes ?? []),
      },
    });

    return NextResponse.json({ analise }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar análise";
    console.error("[analise-diaria] Erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
