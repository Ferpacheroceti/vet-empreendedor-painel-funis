const FB_API_VERSION = "v18.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

interface FbConjunto {
  id: string;
  nome: string;
  gasto: number;
  impressoes: number;
  cliques: number;
  cpm: number;
  cpc: number;
  ctr: number;
}

interface FbCampanha {
  id: string;
  nome: string;
  status: string;
  conjuntos: FbConjunto[];
}

interface FbMetricasAgregadas {
  gasto: number;
  impressoes: number;
  cliques: number;
  cpm: number;
  cpc: number;
  ctr: number;
  alcance: number;
}

async function fbFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const url = new URL(`${FB_BASE_URL}${path}`);
  url.searchParams.set("access_token", accessToken || "");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json();
    throw new Error((err as { error?: { message?: string } })?.error?.message || "Facebook API error");
  }
  return res.json();
}

export async function getCampanhas(): Promise<FbCampanha[]> {
  const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
  if (!adAccountId) throw new Error("FACEBOOK_AD_ACCOUNT_ID not configured");

  const data = await fbFetch(`/${adAccountId}/campaigns`, {
    fields: "id,name,status",
    effective_status: '["ACTIVE","PAUSED","ARCHIVED"]',
    limit: "100",
  }) as { data: Array<{ id: string; name: string; status: string }> };

  const campanhas: FbCampanha[] = [];

  for (const camp of data.data || []) {
    const adSetsData = await fbFetch(`/${camp.id}/adsets`, {
      fields: "id,name,insights{spend,impressions,clicks,cpm,cpc,ctr}",
      limit: "100",
    }) as { data: Array<{ id: string; name: string; insights?: { data: Array<{ spend?: string; impressions?: string; clicks?: string; cpm?: string; cpc?: string; ctr?: string }> } }> };

    const conjuntos: FbConjunto[] = (adSetsData.data || []).map((adset) => {
      const insights = adset.insights?.data?.[0] || {};
      return {
        id: adset.id,
        nome: adset.name,
        gasto: parseFloat(insights.spend || "0"),
        impressoes: parseInt(insights.impressions || "0"),
        cliques: parseInt(insights.clicks || "0"),
        cpm: parseFloat(insights.cpm || "0"),
        cpc: parseFloat(insights.cpc || "0"),
        ctr: parseFloat(insights.ctr || "0"),
      };
    });

    campanhas.push({
      id: camp.id,
      nome: camp.name,
      status: camp.status,
      conjuntos,
    });
  }

  return campanhas;
}

export async function getMetricas(params: {
  campanhaIds?: string[];
  conjuntoIds?: string[];
  dataInicio: string;
  dataFim: string;
}): Promise<FbMetricasAgregadas & { porCampanha: Array<{ id: string; nome: string; roas: number; gasto: number; receita: number }>; porConjunto: Array<{ id: string; nome: string; roas: number; gasto: number }> }> {
  const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
  if (!adAccountId) throw new Error("FACEBOOK_AD_ACCOUNT_ID not configured");

  const timeRange = JSON.stringify({ since: params.dataInicio, until: params.dataFim });
  const fields = "campaign_id,campaign_name,adset_id,adset_name,spend,impressions,clicks,cpm,cpc,ctr,reach";

  const data = await fbFetch(`/${adAccountId}/insights`, {
    fields,
    time_range: timeRange,
    level: "adset",
    limit: "500",
  }) as { data: Array<{ campaign_id?: string; campaign_name?: string; adset_id?: string; adset_name?: string; spend?: string; impressions?: string; clicks?: string; cpm?: string; cpc?: string; ctr?: string; reach?: string }> };

  let totalGasto = 0;
  let totalImpressoes = 0;
  let totalCliques = 0;
  let totalAlcance = 0;

  const porCampanhaMap = new Map<string, { nome: string; gasto: number }>();
  const porConjuntoMap = new Map<string, { nome: string; gasto: number }>();

  for (const row of data.data || []) {
    const campId = row.campaign_id || "";
    const conjId = row.adset_id || "";

    if (params.campanhaIds && params.campanhaIds.length > 0 && !params.campanhaIds.includes(campId)) continue;
    if (params.conjuntoIds && params.conjuntoIds.length > 0 && !params.conjuntoIds.includes(conjId)) continue;

    const gasto = parseFloat(row.spend || "0");
    totalGasto += gasto;
    totalImpressoes += parseInt(row.impressions || "0");
    totalCliques += parseInt(row.clicks || "0");
    totalAlcance += parseInt(row.reach || "0");

    if (campId) {
      const prev = porCampanhaMap.get(campId) || { nome: row.campaign_name || campId, gasto: 0 };
      porCampanhaMap.set(campId, { ...prev, gasto: prev.gasto + gasto });
    }

    if (conjId) {
      const prev = porConjuntoMap.get(conjId) || { nome: row.adset_name || conjId, gasto: 0 };
      porConjuntoMap.set(conjId, { ...prev, gasto: prev.gasto + gasto });
    }
  }

  const cpm = totalImpressoes > 0 ? (totalGasto / totalImpressoes) * 1000 : 0;
  const cpc = totalCliques > 0 ? totalGasto / totalCliques : 0;
  const ctr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;

  return {
    gasto: totalGasto,
    impressoes: totalImpressoes,
    cliques: totalCliques,
    cpm,
    cpc,
    ctr,
    alcance: totalAlcance,
    porCampanha: Array.from(porCampanhaMap.entries()).map(([id, v]) => ({
      id,
      nome: v.nome,
      gasto: v.gasto,
      receita: 0,
      roas: 0,
    })),
    porConjunto: Array.from(porConjuntoMap.entries()).map(([id, v]) => ({
      id,
      nome: v.nome,
      gasto: v.gasto,
      roas: 0,
    })),
  };
}
