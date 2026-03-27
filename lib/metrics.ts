import { VendaRow } from "./google-sheets";

export interface ProdutoMetrica {
  codigoHotmart: string;
  nome: string;
  tipo: string;
  preco: number;
  vendas: number;
  faturamento: number;
  convRelativa: number; // % em relação ao produto front (idx 0)
  breakdownPagamento: Record<string, number>;
  breakdownOrigem: Record<string, number>;
}

export interface MetricasFunil {
  // KPIs principais
  faturamentoBruto: number;
  gastoFacebook: number;
  roas: number;
  cpl: number;
  compradores: number;
  ticketMedio: number;
  taxaOrderBump: number;
  taxaUpsell: number;

  // Métricas de tráfego
  impressoes: number;
  alcance: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequencia: number;
  cliques: number;

  // Métricas de conversão
  transacoes: number;
  taxaConversao: number;
  ltv: number;

  // Por produto
  porProduto: ProdutoMetrica[];

  // Faturamento por origem
  faturamentoPorOrigem: Record<string, number>;

  // Tendências diárias
  tendencias: Array<{
    data: string;
    faturamento: number;
    roas: number;
    gastoFb: number;
    vendasPorProduto: Record<string, number>;
  }>;

  // Por campanha e conjunto (será enriquecido com dados do FB)
  porCampanha: Array<{ id: string; nome: string; gasto: number; receita: number; roas: number }>;
  porConjunto: Array<{ id: string; nome: string; gasto: number; roas: number }>;
}

export interface SaudeScore {
  score: number;
  detalhes: {
    roas: number;
    conversao: number;
    historico: number;
    meta: number;
  };
}

export function calcularMetricas(
  vendas: VendaRow[],
  produtos: Array<{ codigoHotmart: string; nome: string; tipo: string; preco: number; metaMensal: number; ordem: number }>,
  fbData: {
    gasto: number;
    impressoes: number;
    alcance: number;
    cliques: number;
    cpm: number;
    cpc: number;
    ctr: number;
    porCampanha?: Array<{ id: string; nome: string; gasto: number; receita: number; roas: number }>;
    porConjunto?: Array<{ id: string; nome: string; gasto: number; roas: number }>;
  }
): MetricasFunil {
  const produtosOrdenados = [...produtos].sort((a, b) => a.ordem - b.ordem);

  // Calcular métricas por produto
  const porProduto: ProdutoMetrica[] = produtosOrdenados.map((produto) => {
    const vendasProduto = vendas.filter((v) => v.codigoProduto === produto.codigoHotmart);

    const breakdownPagamento: Record<string, number> = {};
    const breakdownOrigem: Record<string, number> = {};

    for (const v of vendasProduto) {
      const pag = v.tipoPagamento || "outros";
      breakdownPagamento[pag] = (breakdownPagamento[pag] || 0) + 1;

      const orig = v.origemParsed;
      breakdownOrigem[orig] = (breakdownOrigem[orig] || 0) + 1;
    }

    return {
      codigoHotmart: produto.codigoHotmart,
      nome: produto.nome,
      tipo: produto.tipo,
      preco: produto.preco,
      vendas: vendasProduto.length,
      faturamento: vendasProduto.reduce((acc, v) => acc + v.preco, 0),
      convRelativa: 0, // calculado abaixo
      breakdownPagamento,
      breakdownOrigem,
    };
  });

  // Calcular conversão relativa ao produto front (primeiro)
  const vendasFront = porProduto[0]?.vendas || 0;
  for (const p of porProduto) {
    p.convRelativa = vendasFront > 0 ? (p.vendas / vendasFront) * 100 : 0;
  }

  // Compradores únicos por CPF/email
  const compradorSet = new Set<string>();
  for (const v of vendas) {
    const id = v.documento || v.email;
    if (id) compradorSet.add(id);
  }
  const compradores = compradorSet.size || vendas.length;

  // Faturamento bruto
  const faturamentoBruto = vendas.reduce((acc, v) => acc + v.preco, 0);

  // ROAS
  const gastoFacebook = fbData.gasto || 0;
  const roas = gastoFacebook > 0 ? faturamentoBruto / gastoFacebook : 0;

  // CPL
  const cpl = compradores > 0 ? gastoFacebook / compradores : 0;

  // Ticket médio
  const ticketMedio = compradores > 0 ? faturamentoBruto / compradores : 0;

  // Order bump (tipo = "order-bump")
  const produtoFront = produtosOrdenados.find((p) => p.tipo === "entrada");
  const produtosOrderBump = produtosOrdenados.filter((p) => p.tipo === "order-bump");
  const produtosUpsell = produtosOrdenados.filter((p) => p.tipo === "upsell");

  const vendasFrontCount = produtoFront
    ? vendas.filter((v) => v.codigoProduto === produtoFront.codigoHotmart).length
    : vendasFront;

  const vendasOrderBump = produtosOrderBump.reduce((acc, p) => {
    return acc + vendas.filter((v) => v.codigoProduto === p.codigoHotmart).length;
  }, 0);

  const vendasUpsell = produtosUpsell.reduce((acc, p) => {
    return acc + vendas.filter((v) => v.codigoProduto === p.codigoHotmart).length;
  }, 0);

  const taxaOrderBump = vendasFrontCount > 0 ? (vendasOrderBump / vendasFrontCount) * 100 : 0;
  const taxaUpsell = vendasFrontCount > 0 ? (vendasUpsell / vendasFrontCount) * 100 : 0;

  // LTV
  const ltv = compradores > 0 ? faturamentoBruto / compradores : 0;

  // Taxa de conversão = compradores / cliques
  const taxaConversao = fbData.cliques > 0 ? (compradores / fbData.cliques) * 100 : 0;

  // Frequência
  const frequencia = fbData.alcance > 0 ? fbData.impressoes / fbData.alcance : 0;

  // Faturamento por origem
  const faturamentoPorOrigem: Record<string, number> = {};
  for (const v of vendas) {
    const orig = v.origemParsed;
    faturamentoPorOrigem[orig] = (faturamentoPorOrigem[orig] || 0) + v.preco;
  }

  // Tendências diárias
  const tendenciasMap = new Map<string, { faturamento: number; gastoFb: number; vendasPorProduto: Record<string, number> }>();

  for (const v of vendas) {
    const data = v.dataVenda.toISOString().split("T")[0];
    const prev = tendenciasMap.get(data) || { faturamento: 0, gastoFb: 0, vendasPorProduto: {} };
    prev.faturamento += v.preco;
    prev.vendasPorProduto[v.codigoProduto] = (prev.vendasPorProduto[v.codigoProduto] || 0) + 1;
    tendenciasMap.set(data, prev);
  }

  const tendencias = Array.from(tendenciasMap.entries())
    .map(([data, v]) => ({
      data,
      faturamento: v.faturamento,
      gastoFb: 0, // FB diário não disponível por padrão
      roas: 0,
      vendasPorProduto: v.vendasPorProduto,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    faturamentoBruto,
    gastoFacebook,
    roas,
    cpl,
    compradores,
    ticketMedio,
    taxaOrderBump,
    taxaUpsell,
    impressoes: fbData.impressoes,
    alcance: fbData.alcance,
    cpm: fbData.cpm,
    cpc: fbData.cpc,
    ctr: fbData.ctr,
    frequencia,
    cliques: fbData.cliques,
    transacoes: vendas.length,
    taxaConversao,
    ltv,
    porProduto,
    faturamentoPorOrigem,
    tendencias,
    porCampanha: fbData.porCampanha || [],
    porConjunto: fbData.porConjunto || [],
  };
}

export function calcularSaude(
  metricas: MetricasFunil,
  historico: Array<{ id: string }>,
  metaVendasFront: number
): SaudeScore {
  let score = 0;
  let roasScore = 0;
  let conversaoScore = 0;
  let historicoScore = 0;
  let metaScore = 0;

  // ROAS (máx 40pts)
  if (metricas.roas >= 3) roasScore = 40;
  else if (metricas.roas >= 2) roasScore = 30;
  else if (metricas.roas >= 1.5) roasScore = 20;
  else if (metricas.roas >= 1) roasScore = 10;

  // Conversão front → 2º produto (máx 30pts)
  const conv2Produto = metricas.porProduto[1]?.convRelativa || 0;
  if (conv2Produto >= 50) conversaoScore = 30;
  else if (conv2Produto >= 30) conversaoScore = 22;
  else if (conv2Produto >= 15) conversaoScore = 14;
  else if (conv2Produto > 0) conversaoScore = 7;

  // Histórico (máx 15pts)
  if (historico.length >= 3) historicoScore = 15;
  else if (historico.length >= 2) historicoScore = 10;
  else if (historico.length >= 1) historicoScore = 5;

  // Vendas vs meta (máx 15pts)
  const vendasFront = metricas.porProduto[0]?.vendas || 0;
  if (metaVendasFront > 0) {
    const pct = vendasFront / metaVendasFront;
    if (pct >= 1) metaScore = 15;
    else if (pct >= 0.5) metaScore = 10;
    else if (vendasFront > 0) metaScore = 5;
  } else if (vendasFront > 0) {
    metaScore = 5;
  }

  score = roasScore + conversaoScore + historicoScore + metaScore;

  return {
    score: Math.min(100, score),
    detalhes: {
      roas: roasScore,
      conversao: conversaoScore,
      historico: historicoScore,
      meta: metaScore,
    },
  };
}
