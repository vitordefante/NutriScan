/**
 * Pedidos do formulário "Quero aparecer no mapa". Ver docs/produtores.md.
 *
 *   npm run produtores:pedidos                    lista os pendentes
 *   npm run produtores:pedidos -- aprovar <id>    marca como aprovado (depois de importar)
 *   npm run produtores:pedidos -- recusar <id>    apaga o pedido
 */
import { createDb } from '../db/client.js';
import { criarRepositorioProdutoresPg } from '../modules/produtores/produtores.repository.js';

const [acao, id] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida (confira o api/.env).');
  process.exit(1);
}
if (acao && (!['aprovar', 'recusar'].includes(acao) || !id)) {
  console.error('Uso: npm run produtores:pedidos [-- aprovar <id> | -- recusar <id>]');
  process.exit(1);
}

const banco = createDb(url, { onConnectionError: (err) => console.error(err) });
const repo = criarRepositorioProdutoresPg(banco.db);
try {
  if (acao === 'aprovar' || acao === 'recusar') {
    const ok = await (acao === 'aprovar' ? repo.aprovarPedido(id!) : repo.recusarPedido(id!));
    console.log(
      ok
        ? `Pedido ${acao === 'aprovar' ? 'aprovado' : 'recusado e apagado'}.`
        : 'Pedido não encontrado.',
    );
    process.exitCode = ok ? 0 : 1;
  } else {
    const pendentes = await repo.pedidosPendentes();
    if (pendentes.length === 0) console.log('Nenhum pedido pendente.');
    for (const { id, dados: d, criadoEm } of pendentes) {
      console.log(`\n${id}  (${criadoEm.toLocaleString('pt-BR')})`);
      console.log(`  ${d.nome} — ${d.categorias.join(', ')}`);
      console.log(`  Vende: ${d.produtos}`);
      console.log(`  Onde: ${d.local}`);
      console.log(`  WhatsApp: ${d.whatsapp}${d.instagram ? `  Instagram: @${d.instagram}` : ''}`);
      if (d.mensagem) console.log(`  Mensagem: ${d.mensagem}`);
    }
  }
} finally {
  await banco.close();
}
