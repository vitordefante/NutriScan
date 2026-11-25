import type {
  ItemProposal,
  PriceUnit,
  Producer,
  ProducerItem,
  ProducerPhoto,
  ProducerPrice,
} from '@nutriscan/shared';
import { z } from 'zod';

/** Na ordem em que aparecem no app. */
export const UNIDADES = [
  'unidade',
  'kg',
  'litro',
  'duzia',
  'bandeja',
  'pacote',
  'pote',
  'garrafa',
  'maco',
  'caixa',
] as const satisfies readonly PriceUnit[];

/** Quantos itens um catálogo comporta (publicados + novos em análise). */
export const MAXIMO_ITENS = 30;

/** Até R$ 99.999,99: o suficiente para qualquer item de feira, e barra erros de digitação. */
export const MAXIMO_CENTAVOS = 9_999_999;

export const precoSchema = z.object({
  centavos: z.number().int().min(1).max(MAXIMO_CENTAVOS),
  unidade: z.enum(UNIDADES),
}) satisfies z.ZodType<ProducerPrice, unknown>;

export const nomeItem = z.string().trim().min(1).max(60);
export const descricaoItem = z.string().trim().min(1).max(120);

/** Foto guardada num item ou numa proposta. */
export type FotoGuardada = Omit<ProducerPhoto, 'legenda'>;

/** Item do catálogo como está no banco. */
export type LinhaItem = {
  id: string;
  produtorId: string;
  nome: string;
  descricao: string | null;
  precoCentavos: number | null;
  unidade: string | null;
  precoAtualizadoEm: Date | null;
  foto: FotoGuardada | null;
  ordem: number;
};

/** Proposta (item novo ou mudança) como está no banco. */
export type LinhaProposta = {
  id: string;
  produtorId: string;
  /** null = item novo. */
  itemId: string | null;
  nome: string;
  descricao: string | null;
  precoCentavos: number | null;
  unidade: string | null;
  foto: FotoGuardada | null;
  situacao: 'em_analise' | 'recusada';
  motivo: string | null;
  enviadaEm: Date;
};

/** Data AAAA-MM-DD no fuso de Santa Catarina (o que o produtor vê no calendário). */
export const dataLocal = (d: Date) =>
  d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

function precoDe(centavos: number | null, unidade: string | null): ProducerPrice | undefined {
  const u = UNIDADES.find((x) => x === unidade);
  return centavos !== null && u ? { centavos, unidade: u } : undefined;
}

export function paraItemPublico(l: LinhaItem): ProducerItem {
  const preco = precoDe(l.precoCentavos, l.unidade);
  return {
    nome: l.nome,
    ...(l.descricao && { descricao: l.descricao }),
    ...(preco && { preco }),
    ...(preco && l.precoAtualizadoEm && { precoAtualizadoEm: dataLocal(l.precoAtualizadoEm) }),
    ...(l.foto && { foto: { ...l.foto } }),
  };
}

export function paraProposta(l: LinhaProposta): ItemProposal {
  const preco = precoDe(l.precoCentavos, l.unidade);
  return {
    id: l.id,
    nome: l.nome,
    ...(l.descricao && { descricao: l.descricao }),
    ...(preco && { preco }),
    ...(l.foto && { foto: { ...l.foto } }),
    situacao: l.situacao,
    ...(l.motivo && { motivo: l.motivo }),
    enviadaEm: l.enviadaEm.toISOString(),
  };
}

/**
 * O produtor com o catálogo publicado. Os nomes dos itens completam a lista curta `produtos`
 * (cartão do mapa), sem repetir o que já está nela.
 */
export function comCatalogo(p: Producer, itens: readonly ProducerItem[]): Producer {
  if (itens.length === 0) return p;
  const jaListados = new Set(p.produtos.map((n) => n.toLocaleLowerCase('pt-BR')));
  const novos = itens
    .map((i) => i.nome)
    .filter((n) => !jaListados.has(n.toLocaleLowerCase('pt-BR')));
  return { ...p, produtos: [...p.produtos, ...novos], catalogo: [...itens] };
}
