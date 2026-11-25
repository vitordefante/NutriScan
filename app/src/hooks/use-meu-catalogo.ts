import type { MyCatalog } from '@nutriscan/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSessao } from '@/lib/sessao';
import { ErroApi, type TipoErroApi } from '@/services/api';
import { meuCatalogo } from '@/services/api-conta-produtor';

export type EstadoMeuCatalogo =
  | { status: 'sem_conta' }
  | { status: 'carregando' }
  /** Conta comum: o Perfil mostra "Sou produtor". */
  | { status: 'nao_e_produtor' }
  | { status: 'erro'; tipo: TipoErroApi }
  | { status: 'pronto'; dados: MyCatalog; token: string };

/**
 * O catálogo do produtor da conta. Busca de novo sempre que a tela volta ao foco (ao voltar da
 * edição de um item, a lista já aparece atualizada). Os dados antigos ficam na tela enquanto isso.
 */
export function useMeuCatalogo() {
  const sessao = useSessao();
  const token = sessao.status === 'conectado' ? sessao.token : null;
  const [resposta, setResposta] = useState<{ token: string; estado: EstadoMeuCatalogo } | null>(
    null,
  );
  const [tentativa, setTentativa] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const controle = new AbortController();
      meuCatalogo(token, controle.signal)
        .then((dados) => setResposta({ token, estado: { status: 'pronto', dados, token } }))
        .catch((err: unknown) => {
          if (controle.signal.aborted) return;
          const tipo = err instanceof ErroApi ? err.tipo : 'inesperado';
          setResposta({
            token,
            estado:
              tipo === 'nao_e_produtor' ? { status: 'nao_e_produtor' } : { status: 'erro', tipo },
          });
        });
      return () => controle.abort();
      // `tentativa` não é lida: muda só para buscar de novo ("Tentar de novo").
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, tentativa]),
  );

  const recarregar = useCallback(() => setTentativa((t) => t + 1), []);

  let estado: EstadoMeuCatalogo;
  if (sessao.status === 'carregando') estado = { status: 'carregando' };
  else if (!token) estado = { status: 'sem_conta' };
  // A resposta de outra conta (saiu e entrou com outra) não vale.
  else estado = resposta?.token === token ? resposta.estado : { status: 'carregando' };
  return { estado, recarregar };
}
