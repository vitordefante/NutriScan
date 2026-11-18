import type { ProducerCategory } from '@nutriscan/shared';
import { useState } from 'react';

import { ErroApi } from '@/services/api';
import { enviarPedido } from '@/services/api-produtores';

/** Erros cuja mensagem da API já é a certa para mostrar. */
const MENSAGEM_DA_API = new Set(['dados_invalidos', 'muitas_tentativas']);

/** Só dígitos; com DDD são 10 ou 11 (a API acrescenta o 55). */
const digitos = (s: string) => s.replace(/\D/g, '');

/** Formulário "Quero aparecer no mapa". */
export function usePedidoProdutor() {
  const [nome, setNome] = useState('');
  const [categorias, setCategorias] = useState<ProducerCategory[]>([]);
  const [produtos, setProdutos] = useState('');
  const [local, setLocal] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const pronto =
    nome.trim() !== '' &&
    categorias.length > 0 &&
    produtos.trim() !== '' &&
    local.trim() !== '' &&
    digitos(whatsapp).length >= 10 &&
    autoriza;

  function alternarCategoria(c: ProducerCategory) {
    setCategorias((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));
  }

  async function enviar() {
    if (!pronto || enviando) return;
    setAviso(null);
    setEnviando(true);
    try {
      await enviarPedido({
        nome: nome.trim(),
        categorias,
        produtos: produtos.trim(),
        local: local.trim(),
        whatsapp: digitos(whatsapp),
        ...(instagram.trim() && { instagram: instagram.trim() }),
        ...(mensagem.trim() && { mensagem: mensagem.trim() }),
        autorizaPublicar: true,
      });
      setEnviado(true);
    } catch (err) {
      setAviso(
        err instanceof ErroApi && MENSAGEM_DA_API.has(err.tipo)
          ? err.message
          : 'Não foi possível enviar agora. Confira a conexão e tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return {
    campos: { nome, produtos, local, whatsapp, instagram, mensagem },
    set: { setNome, setProdutos, setLocal, setWhatsapp, setInstagram, setMensagem },
    categorias,
    alternarCategoria,
    autoriza,
    setAutoriza,
    pronto,
    enviando,
    enviado,
    aviso,
    enviar,
  };
}
