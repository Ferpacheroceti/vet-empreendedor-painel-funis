import { google } from "googleapis";
import { parse, isWithinInterval } from "date-fns";

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

function parsePreco(preco: string): number {
  if (!preco) return 0;
  return parseFloat(preco.replace("R$", "").replace(/\s/g, "").replace(",", ".")) || 0;
}

function parseData(data: string): Date | null {
  try {
    return parse(data.trim(), "dd/MM/yyyy HH:mm:ss", new Date());
  } catch {
    return null;
  }
}

function parseOrigem(origem: string): { tipo: "instagram" | "facebook" | "organico"; campanha: string } {
  if (!origem) return { tipo: "organico", campanha: "" };
  try {
    const decoded = decodeURIComponent(origem);
    if (decoded.startsWith("ig|")) {
      const parts = decoded.split("|");
      return { tipo: "instagram", campanha: parts[1] || "" };
    } else if (decoded.startsWith("fb|")) {
      const parts = decoded.split("|");
      return { tipo: "facebook", campanha: parts[1] || "" };
    }
  } catch {}
  if (origem.toLowerCase().includes("ig|")) return { tipo: "instagram", campanha: "" };
  if (origem.toLowerCase().includes("fb|")) return { tipo: "facebook", campanha: "" };
  return { tipo: "organico", campanha: "" };
}

function isSectionHeader(row: string[]): boolean {
  const nomeProduto = row[1] || "";
  return /^\d{4}$/.test(nomeProduto.trim()) || /^\d{4}\s*-/.test(nomeProduto.trim());
}

export async function getVendas(params: {
  dataInicio?: Date;
  dataFim?: Date;
  codigosProduto?: string[];
}): Promise<VendaRow[]> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || "Report";

  if (!serviceAccountJson || !spreadsheetId) {
    throw new Error("Google Sheets credentials not configured");
  }

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:R`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  // Skip header row (row 0)
  const dataRows = rows.slice(1);
  const vendas: VendaRow[] = [];

  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    if (isSectionHeader(row)) continue;

    const dataVenda = parseData(row[0] || "");
    if (!dataVenda) continue;

    if (params.dataInicio && params.dataFim) {
      if (!isWithinInterval(dataVenda, { start: params.dataInicio, end: params.dataFim })) {
        continue;
      }
    }

    const codigoProduto = row[10] || "";
    if (params.codigosProduto && params.codigosProduto.length > 0) {
      if (!params.codigosProduto.includes(codigoProduto)) continue;
    }

    const origemRaw = row[2] || "";
    const { tipo: origemParsed, campanha: campanhaNome } = parseOrigem(origemRaw);

    vendas.push({
      dataVenda,
      nomeProduto: row[1] || "",
      origem: origemRaw,
      preco: parsePreco(row[3] || ""),
      nomeComprador: row[4] || "",
      documento: row[5] || "",
      email: row[6] || "",
      ddi: row[7] || "",
      telefone: row[8] || "",
      pais: row[9] || "",
      codigoProduto,
      codigoOferta: row[11] || "",
      tipoPagamento: row[12] || "",
      utmSource: row[13] || "",
      utmCampaign: row[14] || "",
      utmMedium: row[15] || "",
      utmContent: row[16] || "",
      utmTerm: row[17] || "",
      origemParsed,
      campanhaNome,
    });
  }

  return vendas;
}
