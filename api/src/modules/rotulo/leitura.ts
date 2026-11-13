import type { LabelSubmission, ProductKind } from '@nutriscan/shared';

import type { Nutrientes } from '../analise/dados-alimento.js';
import { extrairListaIngredientes } from './lista-ingredientes.js';
import { lerTabelaNutricional } from './tabela-nutricional.js';

/** O que foi lido nas fotos de um rótulo — é isso que fica guardado na base própria. */
export type RotuloLido = {
  tipo: ProductKind;
  nome?: string;
  ingredientes?: string;
  /** Por 100 g ou 100 ml (ver `unidade`). */
  nutrientes?: Nutrientes;
  unidade?: 'g' | 'ml';
};

export type FotoRotulo = 'ingredientes' | 'tabela';

export type ResultadoLeitura =
  | { ok: true; lido: RotuloLido }
  /** Fotos enviadas em que não deu para ler o que se esperava (a pessoa tira outra). */
  | { ok: false; ilegiveis: FotoRotulo[] };

/**
 * Lê o texto das fotos. Tudo ou nada: se uma das fotos enviadas não pôde ser lida, nada é
 * guardado — a pessoa refaz aquela foto em vez de ficar com um cadastro pela metade sem saber.
 * Cosméticos não têm tabela nutricional: a foto da tabela é ignorada.
 */
export function lerEnvio(envio: LabelSubmission): ResultadoLeitura {
  const ilegiveis: FotoRotulo[] = [];

  const ingredientes = envio.ingredientes && extrairListaIngredientes(envio.ingredientes);
  if (envio.ingredientes && !ingredientes) ilegiveis.push('ingredientes');

  const querTabela = envio.tipo === 'alimento' && envio.tabela;
  const tabela = querTabela ? lerTabelaNutricional(envio.tabela!) : null;
  if (querTabela && !tabela) ilegiveis.push('tabela');

  if (ilegiveis.length > 0) return { ok: false, ilegiveis };
  if (!ingredientes && !tabela) return { ok: false, ilegiveis: ['ingredientes'] };

  const nome = envio.nome?.trim();
  return {
    ok: true,
    lido: {
      tipo: envio.tipo,
      ...(nome && { nome }),
      ...(ingredientes && { ingredientes }),
      ...(tabela && { nutrientes: tabela.nutrientes, unidade: tabela.unidade }),
    },
  };
}

/**
 * Um novo envio completa o anterior: cada foto nova substitui a leitura daquela parte (a tabela
 * inteira, a lista inteira); o que não foi enviado agora é mantido.
 */
export function combinarLeituras(anterior: RotuloLido | null, nova: RotuloLido): RotuloLido {
  if (!anterior || anterior.tipo !== nova.tipo) return nova;
  return { ...anterior, ...nova };
}
