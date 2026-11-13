import type { ProductResult } from '@nutriscan/shared';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  aindaValido,
  assinarMemoria,
  guardarNaMemoria,
  itemNaMemoria,
} from '@/lib/memoria-produtos';
import { buscarProduto, ErroProduto, type TipoErroProduto } from '@/services/api-produtos';

export type EstadoProduto =
  | { status: 'carregando' }
  | { status: 'erro'; tipo: TipoErroProduto }
  | { status: 'pronto'; dados: ProductResult };

/** Resposta de uma busca específica (código + tentativa). */
type Resposta = {
  barcode: string;
  tentativa: number;
  /** Quando chegou: uma versão mais nova na memória (ex.: depois da foto do rótulo) vence. */
  em: number;
  resultado: { ok: true; dados: ProductResult } | { ok: false; tipo: TipoErroProduto };
};

export function useProduto(barcode: string) {
  const [tentativa, setTentativa] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  // Re-renderiza quando outra tela guarda uma versão nova deste produto.
  const salvo = useSyncExternalStore(assinarMemoria, () => itemNaMemoria(barcode));

  useEffect(() => {
    if (aindaValido(itemNaMemoria(barcode))) return;
    const controle = new AbortController();
    const responder = (resultado: Resposta['resultado']) =>
      setResposta({ barcode, tentativa, em: Date.now(), resultado });

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

  // O estado é derivado: a resposta só vale se for deste código e desta tentativa, e se não
  // houver uma versão mais nova guardada na memória.
  const atual = resposta?.barcode === barcode && resposta.tentativa === tentativa ? resposta : null;
  const memoria = aindaValido(salvo) ? salvo : undefined;
  let estado: EstadoProduto;
  if (atual && !(memoria && memoria.em > atual.em)) {
    const r = atual.resultado;
    estado = r.ok ? { status: 'pronto', dados: r.dados } : { status: 'erro', tipo: r.tipo };
  } else if (memoria) estado = { status: 'pronto', dados: memoria.dados };
  else estado = { status: 'carregando' };

  return { estado, tentarDeNovo };
}
