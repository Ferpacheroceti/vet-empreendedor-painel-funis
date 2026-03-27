-- CreateTable
CREATE TABLE "Funil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "investMeta" REAL NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "funilId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoHotmart" TEXT NOT NULL,
    "preco" REAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "metaMensal" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "Produto_funilId_fkey" FOREIGN KEY ("funilId") REFERENCES "Funil" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampanhaFunilLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "funilId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "campanhaNome" TEXT NOT NULL,
    "conjuntoId" TEXT,
    "conjuntoNome" TEXT,
    CONSTRAINT "CampanhaFunilLink_funilId_fkey" FOREIGN KEY ("funilId") REFERENCES "Funil" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoricoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "funilId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "texto" TEXT NOT NULL,
    "isAtual" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "HistoricoItem_funilId_fkey" FOREIGN KEY ("funilId") REFERENCES "Funil" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GastoManual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "funilId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    CONSTRAINT "GastoManual_funilId_fkey" FOREIGN KEY ("funilId") REFERENCES "Funil" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
