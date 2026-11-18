/**
 * Importa os produtores visitados de `api/data/produtores.local.json` (fora do Git) para o banco.
 * Substitui a lista inteira: quem saiu do arquivo sai do mapa. Ver docs/produtores.md.
 *
 *   npm run produtores:importar [-- caminho/do/arquivo.json]
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { createDb } from '../db/client.js';
import { criarRepositorioProdutoresPg } from '../modules/produtores/produtores.repository.js';
import { arquivoLocalSchema, paraPublicar } from '../modules/produtores/produtores.schema.js';

const pastaApi = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arquivo = resolve(pastaApi, process.argv[2] ?? 'data/produtores.local.json');

let conteudo: unknown;
try {
  conteudo = JSON.parse(await readFile(arquivo, 'utf8'));
} catch (err) {
  console.error(`Não consegui ler ${arquivo}:\n  ${(err as Error).message}`);
  console.error('Para começar, copie api/data/produtores.exemplo.json para esse caminho.');
  process.exit(1);
}

const lido = arquivoLocalSchema.safeParse(conteudo);
if (!lido.success) {
  console.error(`O arquivo tem erros (nada foi importado):\n${z.prettifyError(lido.error)}`);
  process.exit(1);
}

const lista = lido.data.produtores.map(paraPublicar);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida (confira o api/.env).');
  process.exit(1);
}
const banco = createDb(url, { onConnectionError: (err) => console.error(err) });
try {
  await criarRepositorioProdutoresPg(banco.db).substituir(lista);
  const locais = lista.reduce((n, p) => n + p.locais.length, 0);
  console.log(`Importados ${lista.length} produtores (${locais} locais no mapa).`);
  for (const p of lista) console.log(`  · ${p.nome} — ${p.categorias.join(', ')}`);
} finally {
  await banco.close();
}
