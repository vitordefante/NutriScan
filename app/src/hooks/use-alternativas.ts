import type { AlternativesResult } from '@nutriscan/shared';
import { useCallback, useEffect, useState } from 'react';

import { buscarAlternativas } from '@/services/api-produtos';

export type EstadoAlternativas =
  { status: 'carregando' } | { status: 'erro' } | { status: 'pronto'; dados: AlternativesResult };

/**
 * Respostas já recebidas nesta sessão (voltar de uma alternativa não busca de novo). A chave
 * inclui a nota: depois da foto do rótulo a referência muda e a lista precisa ser refeita.
 */
const recebidas = new Map<string, AlternativesResult>();

/**
 * Alternativas do produto, buscadas à parte do resultado: a busca na base é mais lenta e não
 * deve atrasar a nota. `nota` é a nota atual do produto (null se ele não tem nota); `ativo` é
 * false enquanto o produto não carregou (ou não existe).
 */
export function useAlternativas(barcode: string, nota: number | null, ativo: boolean) {
  const chave = `${barcode}:${nota ?? '-'}`;
  const [tentativa, setTentativa] = useState(0);
  const [resposta, setResposta] = useState<
    { chave: string; ok: true; dados: AlternativesResult } | { chave: string; ok: false } | null
  >(null);

  useEffect(() => {
    if (!ativo || recebidas.has(chave)) return;
    const controle = new AbortController();
    buscarAlternativas(barcode, controle.signal)
      .then((dados) => {
        // Lista incompleta (uma busca falhou): não guarda, para buscar de novo ao reabrir.
        if (!(dados.status === 'ok' && dados.incompleta)) recebidas.set(chave, dados);
        setResposta({ chave, ok: true, dados });
      })
      .catch(() => {
        if (!controle.signal.aborted) setResposta({ chave, ok: false });
      });
    return () => controle.abort();
  }, [ativo, barcode, chave, tentativa]);

  const tentarDeNovo = useCallback(() => {
    setResposta(null);
    setTentativa((t) => t + 1);
  }, []);

  // A resposta fica no estado do React: com o React Compiler, ler só o Map (que muda fora do
  // React) devolveria o valor memorizado do render anterior. O Map serve para reabrir a tela de
  // um produto já carregado nesta sessão (ex.: voltar de uma alternativa).
  const atual = resposta?.chave === chave ? resposta : null;
  const dados = atual?.ok ? atual.dados : recebidas.get(chave);
  const estado: EstadoAlternativas = dados
    ? { status: 'pronto', dados }
    : atual && !atual.ok
      ? { status: 'erro' }
      : { status: 'carregando' };
  return { estado, tentarDeNovo };
}
