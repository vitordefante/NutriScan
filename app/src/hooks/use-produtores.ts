import type { Producer, ProducersForProduct } from '@nutriscan/shared';
import { useCallback, useEffect, useState } from 'react';

import { ErroApi, type TipoErroApi } from '@/services/api';
import { buscarProdutor, listarProdutores, produtoresDoProduto } from '@/services/api-produtores';

/**
 * Produtores já recebidos nesta sessão: abrir o detalhe a partir do mapa ou do produto mostra
 * os dados na hora (e atualiza por trás). Lidos só para o valor inicial do estado — com o React
 * Compiler, ler durante o render algo que muda fora do React devolveria o valor memorizado.
 */
let ultimaLista: Producer[] | null = null;
const porId = new Map<string, Producer>();
function lembrar(lista: readonly Producer[]) {
  for (const p of lista) porId.set(p.id, p);
}

export type EstadoBusca<T> =
  { status: 'carregando' } | { status: 'erro'; tipo: TipoErroApi } | { status: 'pronto'; dados: T };

/** Buscas (fixas, fora dos componentes: o efeito só roda de novo quando a chave muda). */
const BUSCAS = {
  async todos(_: string, signal: AbortSignal) {
    const lista = await listarProdutores(signal);
    ultimaLista = lista;
    lembrar(lista);
    return lista;
  },
  async produtor(id: string, signal: AbortSignal) {
    try {
      const p = await buscarProdutor(id, signal);
      lembrar([p]);
      return p;
    } catch (err) {
      // Saiu do mapa (o produtor pediu, ou o autor tirou): esquece a cópia da sessão.
      if (err instanceof ErroApi && err.tipo === 'produtor_nao_encontrado') {
        porId.delete(id);
        ultimaLista = ultimaLista?.filter((p) => p.id !== id) ?? null;
      }
      throw err;
    }
  },
  async doProduto(barcode: string, signal: AbortSignal): Promise<ProducersForProduct> {
    const r = await produtoresDoProduto(barcode, signal);
    lembrar(r.produtores);
    return r;
  },
};

/** Erros que valem mais que a cópia da sessão: o dado não existe mais (não é falha de rede). */
const DEFINITIVOS: readonly TipoErroApi[] = ['produtor_nao_encontrado'];

/**
 * Busca com cancelamento e "tentar de novo". `chave` null = não buscar ainda. `inicial` é o que
 * já se sabe: aparece na hora e uma falha na atualização (rede, servidor) não o apaga — só um
 * erro definitivo (ex.: o produtor saiu do mapa).
 */
function useBusca<T>(
  buscar: (chave: string, signal: AbortSignal) => Promise<T>,
  chave: string | null,
  inicial?: T,
) {
  const [tentativa, setTentativa] = useState(0);
  const [resposta, setResposta] = useState<{ chave: string; estado: EstadoBusca<T> } | null>(null);

  useEffect(() => {
    if (chave === null) return;
    const controle = new AbortController();
    buscar(chave, controle.signal)
      .then((dados) => setResposta({ chave, estado: { status: 'pronto', dados } }))
      .catch((err: unknown) => {
        if (controle.signal.aborted) return;
        const tipo = err instanceof ErroApi ? err.tipo : 'inesperado';
        setResposta({ chave, estado: { status: 'erro', tipo } });
      });
    return () => controle.abort();
  }, [buscar, chave, tentativa]);

  const tentarDeNovo = useCallback(() => {
    setResposta(null);
    setTentativa((t) => t + 1);
  }, []);

  const atual = resposta?.chave === chave ? resposta.estado : null;
  let estado: EstadoBusca<T>;
  if (atual?.status === 'pronto') estado = atual;
  else if (atual?.status === 'erro' && DEFINITIVOS.includes(atual.tipo)) estado = atual;
  else if (inicial !== undefined) estado = { status: 'pronto', dados: inicial };
  else estado = atual ?? { status: 'carregando' };
  return { estado, tentarDeNovo };
}

/** Todos os produtores (aba Mapa). */
export function useProdutores() {
  const [inicial] = useState(() => ultimaLista ?? undefined);
  return useBusca(BUSCAS.todos, 'todos', inicial);
}

/** Um produtor (detalhe). */
export function useProdutor(id: string) {
  const [inicial] = useState(() => porId.get(id));
  return useBusca(BUSCAS.produtor, id, inicial);
}

/** Produtores que vendem o que substitui o produto (tela do produto). */
export function useProdutoresDoProduto(barcode: string, ativo: boolean) {
  return useBusca(BUSCAS.doProduto, ativo ? barcode : null);
}
