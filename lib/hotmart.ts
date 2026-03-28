// Hotmart API integration
// Docs: https://developers.hotmart.com/docs/en/

export interface VendaRow {
  dataVenda: Date;
  nomeProduto: string;
  origem: string;
  preco: number;
  nomeComprador: string;
  documento: string;
  email: string;
  ddi: string;
  telefone: string;
  pais: string;
  codigoProduto: string;
  codigoOferta: string;
  tipoPagamento: string;
  utmSource: string;
  utmCampaign: string;
  utmMedium: string;
  utmContent: string;
  utmTerm: string;
  origemParsed: "instagram" | "facebook" | "organico";
  campanhaNome: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const basicToken = process.env.HOTMART_BASIC_TOKEN;
  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;

  if (!basicToken || !clientId || !clientSecret) {
    throw new Error("Hotmart credentials not configured");
  }

  const res = await fetch(
    `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
    {
      method: "POST",
      headers: {
        Authorization: basicToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hotmart auth failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface HotmartSaleItem {
  purchase: {
    transaction: string;
    order_date: number; // epoch ms
    approved_date: number;
    status: string;
    payment: {
      type: string;
      installments_number: number;
      value: { value: number; currency_code: string };
    };
    offer: { code: string };
    tracking: {
      source: string;
      source_sck: string;
      external_code: string;
    };
    utm: {
      utm_source?: string;
      utm_campaign?: string;
      utm_medium?: string;
      utm_content?: string;
      utm_term?: string;
    };
  };
  product: {
    id: number;
    name: string;
    ucode: string;
  };
  buyer: {
    name: string;
    email: string;
    document: string;
    phone?: string;
    address?: { country: string };
  };
  producer: { name: string };
  commissions?: Array<{ value: { value: number } }>;
}

interface HotmartSalesResponse {
  items: HotmartSaleItem[];
  page_info: {
    results_per_page: number;
    total_results: number;
    next_page_token?: string;
  };
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseOrigem(utm: HotmartSaleItem["purchase"]["utm"]): {
  tipo: "instagram" | "facebook" | "organico";
  campanha: string;
} {
  const source = (utm.utm_source || "").toLowerCase();
  const campaign = utm.utm_campaign || "";
  if (source.includes("instagram") || source === "ig") {
    return { tipo: "instagram", campanha: campaign };
  }
  if (source.includes("facebook") || source === "fb") {
    return { tipo: "facebook", campanha: campaign };
  }
  return { tipo: "organico", campanha: campaign };
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getVendas(params: {
  dataInicio?: Date;
  dataFim?: Date;
  codigosProduto?: string[];
}): Promise<VendaRow[]> {
  const token = await getAccessToken();

  const startMs = params.dataInicio ? params.dataInicio.getTime() : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const endMs = params.dataFim ? params.dataFim.getTime() : Date.now();

  const vendas: VendaRow[] = [];
  let pageToken: string | undefined = undefined;

  // Fetch all pages
  do {
    const url = new URL("https://developers.hotmart.com/payments/api/v1/sales/history");
    url.searchParams.set("start_date", String(startMs));
    url.searchParams.set("end_date", String(endMs));
    url.searchParams.set("max_results", "500");
    url.searchParams.set("transaction_status", "APPROVED");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hotmart API error: ${res.status} ${text}`);
    }

    const data = await res.json() as HotmartSalesResponse;
    const items = data.items || [];

    for (const item of items) {
      const codigoProduto = String(item.product.id);

      // Filter by product codes if specified
      if (params.codigosProduto && params.codigosProduto.length > 0) {
        if (!params.codigosProduto.includes(codigoProduto)) continue;
      }

      const { tipo: origemParsed, campanha: campanhaNome } = parseOrigem(item.purchase.utm ?? {});

      const preco = item.purchase.payment?.value?.value ?? 0;
      const phone = item.buyer.phone ?? "";
      const country = item.buyer.address?.country ?? "";

      vendas.push({
        dataVenda: new Date(item.purchase.order_date),
        nomeProduto: item.product.name,
        origem: item.purchase.tracking?.source ?? "",
        preco,
        nomeComprador: item.buyer.name,
        documento: item.buyer.document ?? "",
        email: item.buyer.email,
        ddi: "",
        telefone: phone,
        pais: country,
        codigoProduto,
        codigoOferta: item.purchase.offer?.code ?? "",
        tipoPagamento: item.purchase.payment?.type ?? "",
        utmSource: item.purchase.utm?.utm_source ?? "",
        utmCampaign: item.purchase.utm?.utm_campaign ?? "",
        utmMedium: item.purchase.utm?.utm_medium ?? "",
        utmContent: item.purchase.utm?.utm_content ?? "",
        utmTerm: item.purchase.utm?.utm_term ?? "",
        origemParsed,
        campanhaNome,
      });
    }

    pageToken = data.page_info?.next_page_token;
  } while (pageToken);

  return vendas;
}
