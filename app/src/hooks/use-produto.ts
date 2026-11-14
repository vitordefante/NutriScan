import type { ProductResult } from '@nutriscan/shared';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  aindaValido,
  assinarMemoria,
  envioDaSessao,
  guardarNaMemoria,
  type ItemMemoria,
  itemNaMemoria,
} from '@/lib/memoria-produtos';
import { ErroApi, type TipoErroApi } from '@/services/api';
import { buscarProduto } from '@/services/api-produtos';

export type EstadoProduto =
  | { status: 'carregando' }
  | { status: 'erro'; tipo: TipoErroApi }
  | { status: 'pronto'; dados: ProductResult };

/** Resposta de uma busca específica (código + tentativa). */
type Resposta = {
  barcode: string;
  tentativa: number;
  /** Quando chegou: uma versão mais nova na memória (ex.: depois da foto do rótulo) vence. */
  em: number;
  resultado: { ok: true; dados: ProductResult } | { ok: false; tipo: TipoErroApi };
};

export function useProduto(barcode: string) {
  const [tentativa, setTentativa] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  // Re-renderiza quando outra tela guarda uma versão nova deste produto.
  const salvo = useSyncExternalStore(assinarMemoria, () => itemNaMemoria(barcode));
  const enviado = useSyncExternalStore(assinarMemoria, () => envioDaSessao(barcode));

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
        responder({ ok: false, tipo: err instanceof ErroApi ? err.tipo : 'inesperado' });
      });
    return () => controle.abort();
  }, [barcode, tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((t) => t + 1), []);

  // O estado é derivado: vale a informação mais nova entre a resposta desta busca (deste código
  // e desta tentativa), a memória curta e o envio de foto do rótulo feito nesta sessão.
  const atual = resposta?.barcode === barcode && resposta.tentativa === tentativa ? resposta : null;
  const guardados = [aindaValido(salvo) ? salvo : undefined, enviado].filter(
    (i): i is ItemMemoria => i !== undefined,
  );
  const guardado = guardados.sort((a, b) => b.em - a.em)[0];
  let estado: EstadoProduto;
  if (atual && !(guardado && guardado.em > atual.em)) {
    const r = atual.resultado;
    estado = r.ok ? { status: 'pronto', dados: r.dados } : { status: 'erro', tipo: r.tipo };
  } else if (guardado) estado = { status: 'pronto', dados: guardado.dados };
  else estado = { status: 'carregando' };

  return { estado, tentarDeNovo };
}
