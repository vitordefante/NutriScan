/**
 * Itens novos e mudanças que os produtores mandam pelo app: nada aparece no mapa sem esta
 * conferência. Ver docs/produtores.md, seção "Conta de produtor".
 *
 *   npm run produtores:itens                             lista o que está em análise
 *   npm run produtores:itens -- aprovar <id>             publica
 *   npm run produtores:itens -- recusar <id> "motivo"    o produtor vê o motivo no app
 *
 * As fotos em análise são salvas em api/data/revisao/ (fora do Git) para você abrir.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from '../db/client.js';
import { criarRepositorioContaProdutorPg } from '../modules/conta-produtor/conta-produtor.repository.js';

const [acao, id, ...resto] = process.argv.slice(2);
const motivo = resto.join(' ').trim();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida (confira o api/.env).');
  process.exit(1);
}
if (acao && (!['aprovar', 'recusar'].includes(acao) || !id || (acao === 'recusar' && !motivo))) {
  console.error('Uso: npm run produtores:itens [-- aprovar <id> | -- recusar <id> "motivo"]');
  process.exit(1);
}

const pastaRevisao = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'data',
  'revisao',
);
const reais = (centavos: number | null, unidade: string | null) =>
  centavos === null
    ? 'sem preço'
    : `${(centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / ${unidade}`;

const banco = createDb(url, { onConnectionError: (err) => console.error(err) });
const repo = criarRepositorioContaProdutorPg(banco.db);
try {
  if (acao === 'aprovar') {
    const ok = await repo.aprovar(id!, new Date());
    console.log(ok ? 'Aprovado: já aparece no mapa.' : 'Não encontrado (ou já analisado).');
    process.exitCode = ok ? 0 : 1;
  } else if (acao === 'recusar') {
    const ok = await repo.recusar(id!, motivo);
    console.log(
      ok ? 'Recusado. O produtor vê o motivo no app.' : 'Não encontrado (ou já analisado).',
    );
    process.exitCode = ok ? 0 : 1;
  } else {
    const propostas = await repo.propostasEmAnalise();
    if (propostas.length === 0) console.log('Nada em análise.');
    for (const p of propostas) {
      console.log(`\n${p.id}  (${p.enviadaEm.toLocaleString('pt-BR')})`);
      console.log(`  ${p.produtorNome} — ${p.item ? 'MUDANÇA de item' : 'ITEM NOVO'}`);
      if (p.item) {
        console.log(`  Antes:  ${p.item.nome}${p.item.descricao ? ` — ${p.item.descricao}` : ''}`);
        console.log(`  Depois: ${p.nome}${p.descricao ? ` — ${p.descricao}` : ''}`);
        if (p.foto?.id !== p.item.foto?.id) console.log(`  Foto: ${p.foto ? 'nova' : 'removida'}`);
      } else {
        console.log(`  ${p.nome}${p.descricao ? ` — ${p.descricao}` : ''}`);
        console.log(`  Preço: ${reais(p.precoCentavos, p.unidade)}`);
      }
      if (p.foto && p.foto.id !== p.item?.foto?.id) {
        const bytes = await repo.fotoBytes(p.foto.id);
        if (bytes) {
          await mkdir(pastaRevisao, { recursive: true });
          const arquivo = resolve(pastaRevisao, `${p.id}.jpg`);
          await writeFile(arquivo, bytes);
          console.log(`  Foto: ${arquivo}`);
        }
      }
    }
  }
} finally {
  await banco.close();
}
