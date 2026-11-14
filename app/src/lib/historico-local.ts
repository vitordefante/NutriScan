import type { HistoryItem, ProductResult, ScoreBand } from '@nutriscan/shared';
import * as SQLite from 'expo-sqlite';
import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Histórico de scans no aparelho (SQLite): funciona sem conta. Com conta, os itens ainda não
 * enviados (`sincronizado = 0`) vão para a API e o histórico da conta volta para cá.
 */

const LIMITE = 200;

type Linha = {
  barcode: string;
  tipo: string;
  nome: string;
  marca: string | null;
  imagem_url: string | null;
  nota: number | null;
  faixa: string | null;
  escaneado_em: string;
};

let banco: Promise<SQLite.SQLiteDatabase> | null = null;

function abrir(): Promise<SQLite.SQLiteDatabase> {
  banco ??= SQLite.openDatabaseAsync('nutriscan.db').then(async (db) => {
    await migrar(db);
    return db;
  });
  return banco;
}

/** Migrações pelo PRAGMA user_version (padrão da documentação do expo-sqlite). */
async function migrar(db: SQLite.SQLiteDatabase) {
  const VERSAO = 1;
  const r = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versao = r?.user_version ?? 0;
  if (versao >= VERSAO) return;
  if (versao === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS historico (
        barcode TEXT PRIMARY KEY NOT NULL,
        tipo TEXT NOT NULL,
        nome TEXT NOT NULL,
        marca TEXT,
        imagem_url TEXT,
        nota INTEGER,
        faixa TEXT,
        escaneado_em TEXT NOT NULL,
        sincronizado INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS historico_data ON historico (escaneado_em);
    `);
  }
  await db.execAsync(`PRAGMA user_version = ${VERSAO}`);
}

// Avisa as telas quando o histórico muda (contador de versão para useSyncExternalStore).
let versao = 0;
const ouvintes = new Set<() => void>();
function avisar() {
  versao++;
  for (const f of ouvintes) f();
}
function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

const FAIXAS: readonly ScoreBand[] = ['excelente', 'bom', 'regular', 'ruim', 'pessimo'];

function paraItem(l: Linha): HistoryItem {
  return {
    barcode: l.barcode,
    tipo: l.tipo === 'cosmetico' ? 'cosmetico' : 'alimento',
    nome: l.nome,
    ...(l.marca && { marca: l.marca }),
    ...(l.imagem_url && { imagemUrl: l.imagem_url }),
    nota: l.nota,
    faixa: FAIXAS.find((f) => f === l.faixa) ?? null,
    escaneadoEm: l.escaneado_em,
  };
}

/** O resumo de um resultado que o histórico guarda. */
export function itemDoResultado({ produto, analise }: ProductResult, quando: Date): HistoryItem {
  const comNota = analise.status !== 'dados_insuficientes';
  return {
    barcode: produto.barcode,
    tipo: produto.tipo,
    nome: produto.nome,
    ...(produto.marca && { marca: produto.marca }),
    // A API só aceita imagem https (as do Open Food Facts são).
    ...(produto.imagemUrl?.startsWith('https://') && { imagemUrl: produto.imagemUrl }),
    nota: comNota ? analise.nota : null,
    faixa: comNota ? analise.faixa : null,
    escaneadoEm: quando.toISOString(),
  };
}

const UPSERT = `INSERT INTO historico (barcode, tipo, nome, marca, imagem_url, nota, faixa, escaneado_em, sincronizado)
  VALUES ($barcode, $tipo, $nome, $marca, $imagem, $nota, $faixa, $quando, $sincronizado)
  ON CONFLICT (barcode) DO UPDATE SET tipo = excluded.tipo, nome = excluded.nome,
    marca = excluded.marca, imagem_url = excluded.imagem_url, nota = excluded.nota,
    faixa = excluded.faixa, escaneado_em = excluded.escaneado_em, sincronizado = excluded.sincronizado
  WHERE excluded.escaneado_em >= historico.escaneado_em`;

const parametros = (i: HistoryItem, sincronizado: 0 | 1) => ({
  $barcode: i.barcode,
  $tipo: i.tipo,
  $nome: i.nome,
  $marca: i.marca ?? null,
  $imagem: i.imagemUrl ?? null,
  $nota: i.nota,
  $faixa: i.faixa,
  $quando: i.escaneadoEm,
  $sincronizado: sincronizado,
});

/** Guarda um scan (o mais recente de cada produto vale), ainda não enviado à conta. */
export async function guardarScan(item: HistoryItem): Promise<void> {
  const db = await abrir();
  await db.runAsync(UPSERT, parametros(item, 0));
  avisar();
}

export async function listarHistorico(): Promise<HistoryItem[]> {
  const db = await abrir();
  const linhas = await db.getAllAsync<Linha>(
    'SELECT * FROM historico ORDER BY escaneado_em DESC LIMIT ?',
    LIMITE,
  );
  return linhas.map(paraItem);
}

/** Scans ainda não enviados à conta. */
export async function pendentes(): Promise<HistoryItem[]> {
  const db = await abrir();
  const linhas = await db.getAllAsync<Linha>(
    'SELECT * FROM historico WHERE sincronizado = 0 ORDER BY escaneado_em DESC LIMIT ?',
    LIMITE,
  );
  return linhas.map(paraItem);
}

/**
 * Depois da sincronização: os enviados ficam marcados (se não houve scan mais novo no meio) e
 * o histórico da conta (inclui o de outros aparelhos) entra aqui.
 */
export async function aplicarSincronizacao(
  enviados: readonly HistoryItem[],
  daConta: readonly HistoryItem[],
): Promise<void> {
  const db = await abrir();
  await db.withTransactionAsync(async () => {
    for (const i of enviados) {
      await db.runAsync(
        'UPDATE historico SET sincronizado = 1 WHERE barcode = ? AND escaneado_em = ?',
        i.barcode,
        i.escaneadoEm,
      );
    }
    for (const i of daConta) await db.runAsync(UPSERT, parametros(i, 1));
  });
  avisar();
}

export async function limparHistoricoLocal(): Promise<void> {
  const db = await abrir();
  await db.runAsync('DELETE FROM historico');
  avisar();
}

/** Lista do histórico para a tela; recarrega sozinha quando ele muda. */
export function useHistoricoLocal(): HistoryItem[] | null {
  const v = useSyncExternalStore(assinar, () => versao);
  const [lista, setLista] = useState<{ versao: number; itens: HistoryItem[] } | null>(null);
  useEffect(() => {
    let ativo = true;
    listarHistorico()
      .then((itens) => ativo && setLista({ versao: v, itens }))
      .catch(() => ativo && setLista({ versao: v, itens: [] }));
    return () => {
      ativo = false;
    };
  }, [v]);
  return lista?.itens ?? null;
}
