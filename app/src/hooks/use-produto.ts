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
 * Resultados já buscados nesta sessão do app. A tela "Por que essa nota" usa o mesmo produto
 * que acabou de ser mostrado no resultado — assim ela abre na hora, sem nova chamada à API.
 */
const memoria = new Map<string, ProductResult>();

export function useProduto(barcode: string) {
  const [tentativa, setTentativa] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);

  useEffect(() => {
    if (memoria.has(barcode)) return;
    const controle = new AbortController();
    const responder = (resultado: Resposta['resultado']) =>
      setResposta({ barcode, tentativa, resultado });

    buscarProduto(barcode, controle.signal)
      .then((dados) => {
        memoria.set(barcode, dados);
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
  const salvo = memoria.get(barcode);
  let estado: EstadoProduto;
  if (atual) {
    const r = atual.resultado;
    estado = r.ok ? { status: 'pronto', dados: r.dados } : { status: 'erro', tipo: r.tipo };
  } else if (salvo) estado = { status: 'pronto', dados: salvo };
  else estado = { status: 'carregando' };

  return { estado, tentarDeNovo };
}
