import type { LogEntry, LogPeriod, ProductResult } from '@nutriscan/shared';

import type { ServicoProdutos } from '../produtos/produtos.service.js';
import type { NovoRegistro, RepositorioRegistros } from './registros.repository.js';
import { resumir } from './resumo.js';

const DIA_MS = 24 * 60 * 60 * 1000;

export type ServicoRegistros = {
  /**
   * Registra o consumo/uso do produto agora, com a análise atual dele; null se o produto não
   * existe. Lança FonteIndisponivelError se a base estiver fora do ar e o produto fora do cache.
   */
  registrar: (usuarioId: string, barcode: string) => Promise<LogEntry | null>;
  /** Registros dos últimos `dias` dias e o resumo deles. */
  periodo: (usuarioId: string, dias: number) => Promise<LogPeriod>;
  excluir: (usuarioId: string, id: string) => Promise<boolean>;
};

export function criarServicoRegistros({
  produtos,
  registros,
  agora = () => new Date(),
}: {
  produtos: ServicoProdutos;
  registros: RepositorioRegistros;
  agora?: () => Date;
}): ServicoRegistros {
  const desde = (dias: number) => new Date(agora().getTime() - dias * DIA_MS);

  return {
    async registrar(usuarioId, barcode) {
      // A análise vem do servidor (a mesma da tela de resultado), não do app.
      const resultado = await produtos.consultar(barcode);
      if (!resultado) return null;
      return registros.criar(usuarioId, paraRegistro(resultado, agora()));
    },

    async periodo(usuarioId, dias) {
      const lista = await registros.listar(usuarioId, desde(dias));
      return { resumo: resumir(lista, dias), registros: lista };
    },

    excluir: (usuarioId, id) => registros.excluir(usuarioId, id),
  };
}

/** O que o log guarda da análise no momento do registro. */
export function paraRegistro({ produto, analise }: ProductResult, quando: Date): NovoRegistro {
  const comNota = analise.status !== 'dados_insuficientes';
  return {
    barcode: produto.barcode,
    tipo: produto.tipo,
    nome: produto.nome,
    ...(produto.marca && { marca: produto.marca }),
    ...(produto.imagemUrl && { imagemUrl: produto.imagemUrl }),
    nota: comNota ? analise.nota : null,
    faixa: comNota ? analise.faixa : null,
    nova: comNota ? (analise.destaques.nova?.grupo ?? null) : null,
    altoEm: comNota ? analise.destaques.lupa.map((l) => l.nutriente) : [],
    alertas: analise.alertas.map((a) => a.titulo),
    registradoEm: quando.toISOString(),
  };
}
