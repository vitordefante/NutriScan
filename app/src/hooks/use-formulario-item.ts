import type { ItemProposal, MyCatalogItem, PriceUnit, ProducerPrice } from '@nutriscan/shared';
import { useState } from 'react';

import { centavosDoTexto, textoDoValor } from '@/lib/preco';
import { ErroApi } from '@/services/api';
import * as api from '@/services/api-conta-produtor';
import { escolherFotoItem } from '@/services/foto-item';

/**
 * - `novo`: item novo (ou um item novo já enviado, que o produtor corrige e manda de novo);
 * - `item`: item publicado (preço na hora; nome, descrição e foto vão para análise).
 */
export type ModoItem =
  { tipo: 'novo'; proposta?: ItemProposal } | { tipo: 'item'; item: MyCatalogItem };

/** A foto do formulário: o id na API e de onde mostrar (o arquivo local logo depois de escolher). */
type Foto = { id: string; uriLocal?: string };

/** Erros cuja mensagem da API já serve para o produtor. */
const MENSAGEM_DA_API = new Set([
  'dados_invalidos',
  'limite_itens',
  'foto_invalida',
  'muitas_tentativas',
  'item_nao_encontrado',
  'proposta_nao_encontrada',
]);
const mensagem = (err: unknown) =>
  err instanceof ErroApi && MENSAGEM_DA_API.has(err.tipo)
    ? err.message
    : 'Não foi possível enviar agora. Confira a conexão e tente de novo.';

export function useFormularioItem(token: string, modo: ModoItem) {
  // Mudança já enviada de um item: o formulário começa com ela (o produtor continua de onde parou).
  const base = modo.tipo === 'item' ? (modo.item.alteracao ?? modo.item) : (modo.proposta ?? null);
  const precoInicial = modo.tipo === 'item' ? modo.item.preco : modo.proposta?.preco;

  const [nome, setNome] = useState(base?.nome ?? '');
  const [descricao, setDescricao] = useState(base?.descricao ?? '');
  const [foto, setFoto] = useState<Foto | null>(base?.foto ? { id: base.foto.id } : null);
  const [valor, setValor] = useState(precoInicial ? textoDoValor(precoInicial.centavos) : '');
  const [unidade, setUnidade] = useState<PriceUnit | null>(precoInicial?.unidade ?? null);
  const [ocupado, setOcupado] = useState<null | 'foto' | 'enviando' | 'preco' | 'removendo'>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);

  // Preço: vazio = sem preço; preenchido, precisa de valor válido e unidade.
  const centavos = centavosDoTexto(valor);
  const preco: ProducerPrice | null = centavos !== null && unidade ? { centavos, unidade } : null;
  const precoValido = valor.trim() === '' || preco !== null;

  // Para um item publicado, só vale mandar para análise o que mudou em relação ao publicado.
  const publicado = modo.tipo === 'item' ? modo.item : null;
  const mudou =
    !publicado ||
    nome.trim() !== publicado.nome ||
    (descricao.trim() || undefined) !== publicado.descricao ||
    foto?.id !== publicado.foto?.id;
  const podeEnviar =
    nome.trim() !== '' && (modo.tipo === 'item' || precoValido) && mudou && ocupado === null;

  // O preço salvo (muda na hora): o do item ao abrir a tela, depois o último salvo aqui.
  const [precoSalvo, setPrecoSalvo] = useState<ProducerPrice | null>(publicado?.preco ?? null);
  const precoMudou =
    publicado !== null &&
    (preco?.centavos !== precoSalvo?.centavos || preco?.unidade !== precoSalvo?.unidade);

  async function trocarFoto(origem: 'camera' | 'galeria') {
    setAviso(null);
    const escolhida = await escolherFotoItem(origem);
    if (escolhida === 'cancelado') return;
    if (escolhida === 'sem_permissao') {
      setAviso('Sem acesso à câmera. Libere nos Ajustes do iPhone ou escolha da galeria.');
      return;
    }
    if (escolhida === 'falhou') {
      setAviso('Não deu para abrir a foto. Tente de novo ou escolha outra.');
      return;
    }
    setOcupado('foto');
    try {
      const enviada = await api.enviarFoto(token, escolhida.base64);
      setFoto({ id: enviada.id, uriLocal: escolhida.uri });
    } catch (err) {
      setAviso(mensagem(err));
    } finally {
      setOcupado(null);
    }
  }

  /** Manda para análise. true = enviado (a tela volta para a lista). */
  async function enviar(): Promise<boolean> {
    if (!podeEnviar) return false;
    setAviso(null);
    setOcupado('enviando');
    try {
      // Correção de um item novo já enviado: a API troca o envio antigo pelo novo de uma vez
      // (se o autor já tiver analisado o antigo, recusa e nada é gravado).
      await api.propor(token, {
        ...(publicado && { itemId: publicado.id }),
        ...(modo.tipo === 'novo' && modo.proposta && { substitui: modo.proposta.id }),
        nome: nome.trim(),
        ...(descricao.trim() && { descricao: descricao.trim() }),
        ...(!publicado && preco && { preco }),
        ...(foto && { fotoId: foto.id }),
      });
      return true;
    } catch (err) {
      setAviso(mensagem(err));
      return false;
    } finally {
      setOcupado(null);
    }
  }

  async function salvarPreco(novo: ProducerPrice | null) {
    if (!publicado) return;
    setAviso(null);
    setConfirmacao(null);
    setOcupado('preco');
    try {
      await api.mudarPreco(token, publicado.id, novo);
      setPrecoSalvo(novo);
      if (!novo) {
        setValor('');
        setUnidade(null);
      }
      setConfirmacao(novo ? 'Preço salvo. Já aparece no mapa.' : 'Preço retirado.');
    } catch (err) {
      setAviso(mensagem(err));
    } finally {
      setOcupado(null);
    }
  }

  /** Tira do catálogo (item publicado) ou cancela o envio (item novo). true = feito. */
  async function remover(): Promise<boolean> {
    setAviso(null);
    setOcupado('removendo');
    try {
      if (publicado) await api.removerItem(token, publicado.id);
      else if (modo.tipo === 'novo' && modo.proposta) {
        await api.cancelarProposta(token, modo.proposta.id);
      }
      return true;
    } catch (err) {
      setAviso(mensagem(err));
      return false;
    } finally {
      setOcupado(null);
    }
  }

  /** Desfaz a mudança enviada de um item publicado (o publicado continua como está). */
  async function cancelarMudanca(): Promise<boolean> {
    if (modo.tipo !== 'item' || !modo.item.alteracao) return false;
    setOcupado('removendo');
    try {
      await api.cancelarProposta(token, modo.item.alteracao.id);
      return true;
    } catch (err) {
      setAviso(mensagem(err));
      return false;
    } finally {
      setOcupado(null);
    }
  }

  return {
    nome,
    setNome,
    descricao,
    setDescricao,
    foto,
    tirarFoto: () => setFoto(null),
    trocarFoto,
    valor,
    setValor: (v: string) => {
      setValor(v);
      setConfirmacao(null);
    },
    unidade,
    setUnidade: (u: PriceUnit) => {
      setUnidade(u);
      setConfirmacao(null);
    },
    preco,
    precoValido,
    precoMudou,
    temPrecoSalvo: precoSalvo !== null,
    podeEnviar,
    ocupado,
    aviso,
    confirmacao,
    enviar,
    salvarPreco,
    remover,
    cancelarMudanca,
  };
}
