import type { ProductResult } from '@nutriscan/shared';
import { useCallback, useEffect, useState } from 'react';

import { buscarProduto, ErroProduto, type TipoErroProduto } from '@/services/api-produtos';

export type EstadoProduto =
  | { status: 'carregando' }
  | { status: 'erro'; tipo: TipoErroProduto }
  | { status: 'pronto'; dados: ProductResult };

/** Resposta de uma busca específica (código + tentativa). */
type Resposta = {
  barcode: string;
  tentativa: number;
  resultado: { ok: true; dados: ProductResult } | { ok: false; tipo: TipoErroProduto };
};

/**
 * Memória curta dos produtos recém-buscados. Serve para a tela "Por que essa nota" abrir na
 * hora com o mesmo produto que o resultado acabou de mostrar — não é um cache de longo prazo
 * (esse fica na API): expira em minutos, guarda poucos itens e ignora respostas desatualizadas.
 */
const VALIDADE_MS = 10 * 60 * 1000;
const MAXIMO = 20;
const memoria = new Map<string, { dados: ProductResult; em: number }>();

function lerMemoria(barcode: string): ProductResult | undefined {
  const item = memoria.get(barcode);
  if (item && Date.now() - item.em < VALIDADE_MS) return item.dados;
  return undefined;
}

function guardarNaMemoria(barcode: string, dados: ProductResult) {
  // Cópia antiga (fonte estava fora do ar): não guarda, para buscar de novo da próxima vez.
  if (dados.desatualizado) return;
  memoria.delete(barcode); // reinserir coloca no fim (o mais recente)
  memoria.set(barcode, { dados, em: Date.now() });
  if (memoria.size > MAXIMO) memoria.delete(memoria.keys().next().value!);
}

export function useProduto(barcode: string) {
  const [tentativa, setTentativa] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);

  useEffect(() => {
    if (lerMemoria(barcode)) return;
    const controle = new AbortController();
    const responder = (resultado: Resposta['resultado']) =>
      setResposta({ barcode, tentativa, resultado });

    buscarProduto(barcode, controle.signal)
      .then((dados) => {
        guardarNaMemoria(barcode, dados);
        responder({ ok: true, dados });
      })
      .catch((err: unknown) => {
        if (controle.signal.aborted) return; // a tela saiu ou o código mudou
        responder({ ok: false, tipo: err instanceof ErroProduto ? err.tipo : 'inesperado' });
      });
    return () => controle.abort();
  }, [barcode, tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((t) => t + 1), []);

  // O estado é derivado: a resposta só vale se for deste código e desta tentativa.
  const atual = resposta?.barcode === barcode && resposta.tentativa === tentativa ? resposta : null;
  const salvo = lerMemoria(barcode);
  let estado: EstadoProduto;
  if (atual) {
    const r = atual.resultado;
    estado = r.ok ? { status: 'pronto', dados: r.dados } : { status: 'erro', tipo: r.tipo };
  } else if (salvo) estado = { status: 'pronto', dados: salvo };
  else estado = { status: 'carregando' };

  return { estado, tentarDeNovo };
}
