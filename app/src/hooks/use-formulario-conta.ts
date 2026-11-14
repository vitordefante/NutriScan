import { useState } from 'react';

import { sincronizarHistorico } from '@/lib/sincronizacao';
import { criarConta, entrarNaConta } from '@/lib/sessao';
import { ErroApi } from '@/services/api';

export type ModoConta = 'entrar' | 'criar';

/** Erros cuja mensagem da API já é a certa para mostrar (e-mail em uso, senha errada…). */
const MENSAGEM_DA_API = new Set(['credenciais_invalidas', 'email_em_uso', 'dados_invalidos']);

/** Formulário de entrar / criar conta. */
export function useFormularioConta() {
  const [modo, setModo] = useState<ModoConta>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const pronto = email.trim().length > 3 && senha.length >= (modo === 'criar' ? 8 : 1);

  function mudarModo(m: ModoConta) {
    setModo(m);
    setAviso(null);
  }

  async function enviar() {
    if (!pronto || enviando) return;
    setAviso(null);
    setEnviando(true);
    try {
      await (modo === 'entrar' ? entrarNaConta : criarConta)(email.trim(), senha);
      setSenha('');
      // O que foi escaneado antes de entrar vai para a conta (e o da conta vem para cá).
      void sincronizarHistorico();
    } catch (err) {
      setAviso(
        err instanceof ErroApi && MENSAGEM_DA_API.has(err.tipo)
          ? err.message
          : 'Não foi possível falar com o servidor. Confira a conexão e tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return { modo, mudarModo, email, setEmail, senha, setSenha, enviando, aviso, pronto, enviar };
}
