import type { LogEntry } from '@nutriscan/shared';
import { useState } from 'react';

import { comConta } from '@/lib/sessao';
import { ErroApi } from '@/services/api';
import { registrar } from '@/services/api-conta';

export type EstadoRegistro =
  | { status: 'pronto' }
  | { status: 'enviando' }
  | { status: 'feito'; registro: LogEntry }
  | { status: 'erro'; mensagem: string };

/**
 * Botão "Registrar consumo/uso": grava agora, com a análise atual do produto (feita na API) e,
 * em alimentos com tabela, a quantidade consumida.
 */
export function useRegistrarConsumo(barcode: string) {
  const [estado, setEstado] = useState<EstadoRegistro>({ status: 'pronto' });

  async function registrarAgora(quantidade?: number) {
    if (estado.status === 'enviando') return;
    setEstado({ status: 'enviando' });
    try {
      const registro = await comConta((token) => registrar(token, barcode, quantidade));
      setEstado({ status: 'feito', registro });
    } catch (err) {
      setEstado({
        status: 'erro',
        mensagem:
          err instanceof ErroApi && err.tipo === 'nao_autenticado'
            ? 'Sua sessão expirou. Entre de novo na aba Perfil.'
            : 'Não foi possível registrar agora. Confira a conexão e tente de novo.',
      });
    }
  }

  return { estado, registrarAgora };
}
