/**
 * Importa os produtores visitados de `api/data/produtores.local.json` (fora do Git) para o banco,
 * com as fotos de `api/data/fotos/` (também fora do Git) já reduzidas e sem metadados.
 * Substitui a lista inteira: quem saiu do arquivo sai do mapa. Ver docs/produtores.md.
 *
 *   npm run produtores:importar [-- caminho/do/arquivo.json]
 */
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { createDb } from '../db/client.js';
import { prepararFoto } from '../modules/produtores/fotos.js';
import { criarRepositorioProdutoresPg } from '../modules/produtores/produtores.repository.js';
import {
  arquivoLocalSchema,
  arquivosDeFoto,
  type FotoPublicada,
  itensDoArquivo,
  paraPublicar,
} from '../modules/produtores/produtores.schema.js';

const pastaApi = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arquivo = resolve(pastaApi, process.argv[2] ?? 'data/produtores.local.json');
const pastaFotos = resolve(pastaApi, 'data', 'fotos');

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

// Prepara todas as fotos (galeria e catálogo) antes de tocar no banco: com qualquer problema,
// nada é importado.
const binarios = new Map<string, Buffer>();
const preparadas = new Map<string, FotoPublicada>();
const problemas: string[] = [];

for (const p of lido.data.produtores) {
  for (const nome of arquivosDeFoto(p)) {
    if (preparadas.has(nome)) continue;
    const caminho = resolve(pastaFotos, nome);
    try {
      await access(caminho);
    } catch {
      problemas.push(`${p.id}: foto não encontrada: api/data/fotos/${nome}`);
      continue;
    }
    try {
      const { id, bytes, largura, altura } = await prepararFoto(caminho);
      binarios.set(id, bytes);
      preparadas.set(nome, { id, largura, altura });
    } catch (err) {
      problemas.push(
        `${p.id}: não consegui abrir api/data/fotos/${nome} (${(err as Error).message}).` +
          ' Se for HEIC do iPhone, converta: sips -s format jpeg foto.heic --out foto.jpg',
      );
    }
  }
}
if (problemas.length > 0) {
  console.error(`Problemas com as fotos (nada foi importado):\n  ${problemas.join('\n  ')}`);
  process.exit(1);
}
const lista = lido.data.produtores.map((p) => paraPublicar(p, preparadas));
const catalogos = new Map(
  lido.data.produtores.flatMap((p) => {
    const itens = itensDoArquivo(p, preparadas);
    return itens ? [[p.id, itens] as const] : [];
  }),
);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida (confira o api/.env).');
  process.exit(1);
}
const banco = createDb(url, { onConnectionError: (err) => console.error(err) });
try {
  const { ignorados } = await criarRepositorioProdutoresPg(banco.db).substituir(
    lista,
    binarios,
    catalogos,
  );
  const locais = lista.reduce((n, p) => n + p.locais.length, 0);
  const kb = Math.round([...binarios.values()].reduce((n, b) => n + b.length, 0) / 1024);
  console.log(
    `Importados ${lista.length} produtores (${locais} locais no mapa, ${binarios.size} fotos, ${kb} KB).`,
  );
  for (const p of lista) {
    const extras = [
      p.fotos?.length && `${p.fotos.length} foto(s)`,
      catalogos.has(p.id) &&
        !ignorados.includes(p.id) &&
        `${catalogos.get(p.id)!.length} item(ns) no catálogo`,
    ].filter(Boolean);
    console.log(`  · ${p.nome} — ${[p.categorias.join(', '), ...extras].join(' — ')}`);
  }
  for (const id of ignorados) {
    console.warn(
      `Aviso: ${id} tem conta no app e cuida do catálogo por lá — o "catalogo" do arquivo foi ignorado.`,
    );
  }
} finally {
  await banco.close();
}
