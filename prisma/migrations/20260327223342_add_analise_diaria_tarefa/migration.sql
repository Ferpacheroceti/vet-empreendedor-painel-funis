-- CreateTable
CREATE TABLE "AnaliseDiaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "investimento" REAL NOT NULL,
    "faturamento" REAL NOT NULL,
    "roas" REAL NOT NULL,
    "resumo" TEXT NOT NULL,
    "criativos" TEXT NOT NULL,
    "campanhas" TEXT NOT NULL,
    "oQueFunciona" TEXT NOT NULL,
    "oQueMelhorar" TEXT NOT NULL,
    "recomendacoes" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prazo" DATETIME NOT NULL,
    "linkArquivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "funilId" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'normal',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" DATETIME,
    "impactoFunil" TEXT,
    CONSTRAINT "Tarefa_funilId_fkey" FOREIGN KEY ("funilId") REFERENCES "Funil" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
