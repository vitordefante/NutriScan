import type { ExposureSummary, LogEntry } from '@nutriscan/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { comConta, useSessao } from '@/lib/sessao';
import { buscarPeriodo, excluirRegistro } from '@/services/api-conta';

export type EstadoLog =
  | { status: 'sem_conta' }
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'pronto'; resumo: ExposureSummary; registros: LogEntry[] };

type Resposta =
  | { usuario: string; chave: string; ok: true; resumo: ExposureSummary; registros: LogEntry[] }
  | { usuario: string; chave: string; ok: false };

/**
 * Log de consumo do período (resumo + registros). Recarrega ao voltar para a aba (o usuário
 * pode ter acabado de registrar algo na tela de resultado) e depois de apagar um registro.
 */
export function useLogConsumo(dias: number) {
  const sessao = useSessao();
  const usuario = sessao.status === 'conectado' ? sessao.usuario.id : null;
  const [versao, setVersao] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const chave = `${dias}:${versao}`;

  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      const controle = new AbortController();
      comConta((token) => buscarPeriodo(token, dias, controle.signal))
        .then(({ resumo, registros }) =>
          setResposta({ usuario, chave, ok: true, resumo, registros }),
        )
        .catch(() => {
          if (!controle.signal.aborted) setResposta({ usuario, chave, ok: false });
        });
      return () => controle.abort();
    }, [usuario, dias, chave]),
  );

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  async function apagar(id: string) {
    await comConta((token) => excluirRegistro(token, id));
    recarregar();
  }

  // Enquanto recarrega (ex.: trocou de 7 para 30 dias), mostra o anterior em vez de piscar —
  // mas nunca o de outra conta.
  const daConta = resposta?.usuario === usuario ? resposta : null;
  let estado: EstadoLog;
  if (!usuario) estado = { status: 'sem_conta' };
  else if (daConta?.ok) {
    estado = { status: 'pronto', resumo: daConta.resumo, registros: daConta.registros };
  } else if (daConta && daConta.chave === chave) estado = { status: 'erro' };
  else estado = { status: 'carregando' };

  return { estado, recarregar, apagar };
}
