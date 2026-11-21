/**
 * Contas de produtor: convite para o produtor cuidar do próprio catálogo pelo app. Ver
 * docs/produtores.md, seção "Conta de produtor".
 *
 *   npm run produtores:contas                          lista as contas ligadas
 *   npm run produtores:contas -- convite <produtor>    gera um código (vale 7 dias)
 *   npm run produtores:contas -- desligar <produtor>   desfaz a ligação (o catálogo fica)
 */
import { createDb } from '../db/client.js';
import { criarRepositorioContaProdutorPg } from '../modules/conta-produtor/conta-produtor.repository.js';
import {
  gerarCodigo,
  hashDoCodigo,
  VALIDADE_CONVITE_DIAS,
} from '../modules/conta-produtor/convite.js';

const [acao, produtorId] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL não definida (confira o api/.env).');
  process.exit(1);
}
if (acao && (!['convite', 'desligar'].includes(acao) || !produtorId)) {
  console.error('Uso: npm run produtores:contas [-- convite <produtor> | -- desligar <produtor>]');
  process.exit(1);
}

const banco = createDb(url, { onConnectionError: (err) => console.error(err) });
const repo = criarRepositorioContaProdutorPg(banco.db);
try {
  if (acao === 'convite') {
    const codigo = gerarCodigo();
    const expira = new Date(Date.now() + VALIDADE_CONVITE_DIAS * 24 * 60 * 60 * 1000);
    if (!(await repo.criarConvite(produtorId!, hashDoCodigo(codigo), expira))) {
      console.error(`Produtor "${produtorId}" não está no mapa (confira o id e importe antes).`);
      process.exitCode = 1;
    } else {
      console.log(
        `Código: ${codigo}  (vale até ${expira.toLocaleDateString('pt-BR')}; um novo código anula o anterior)\n`,
      );
      console.log('Mensagem para mandar pelo WhatsApp:\n');
      console.log(
        `Oi! Agora você pode cuidar do seu catálogo no NutriScan pelo celular: no app, abra ` +
          `Perfil, entre ou crie uma conta e toque em "Sou produtor". Digite o código ${codigo}. ` +
          `Ele vale por ${VALIDADE_CONVITE_DIAS} dias e só pode ser usado uma vez. Mudanças de ` +
          `preço aparecem na hora; itens novos aparecem depois que eu conferir.`,
      );
    }
  } else if (acao === 'desligar') {
    const ok = await repo.desvincular(produtorId!);
    console.log(
      ok ? 'Conta desligada. O catálogo continua no mapa.' : 'Esse produtor não tem conta ligada.',
    );
    process.exitCode = ok ? 0 : 1;
  } else {
    const contas = await repo.contas();
    if (contas.length === 0) console.log('Nenhuma conta de produtor ainda.');
    for (const c of contas) {
      console.log(
        `${c.produtorId} — ${c.nome} — ${c.email} (desde ${c.desde.toLocaleDateString('pt-BR')})`,
      );
    }
  }
} finally {
  await banco.close();
}
