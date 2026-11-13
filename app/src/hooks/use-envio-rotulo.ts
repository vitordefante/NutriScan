import type { ProductKind } from '@nutriscan/shared';
import { useState } from 'react';

import { guardarNaMemoria } from '@/lib/memoria-produtos';
import { enviarRotulo, ErroProduto } from '@/services/api-produtos';
import { type FotoLida, fotografarELer } from '@/services/leitor-rotulo';

export type ParteRotulo = 'ingredientes' | 'tabela';

const AVISO_FOTO: Record<'sem_permissao' | 'sem_texto' | 'falhou', string> = {
  sem_permissao:
    'Sem acesso à câmera. Libere nos Ajustes do iPhone ou escolha uma foto da galeria.',
  sem_texto: 'Não encontrei texto nessa foto. Tente mais perto, com o rótulo reto e bem iluminado.',
  falhou: 'Não deu para usar essa foto. Tente de novo ou escolha outra da galeria.',
};

/**
 * Fluxo de "Fotografar o rótulo": cada parte (lista de ingredientes, tabela nutricional) tem
 * a sua foto, lida no aparelho; no fim, o texto lido vai para a API, que analisa e guarda na
 * base própria. A tela de resultado se atualiza sozinha pela memória de produtos.
 */
export function useEnvioRotulo(barcode: string, tipoInicial: ProductKind | undefined) {
  const [tipo, setTipo] = useState<ProductKind | undefined>(tipoInicial);
  const [nome, setNome] = useState('');
  const [fotos, setFotos] = useState<Partial<Record<ParteRotulo, FotoLida>>>({});
  const [lendo, setLendo] = useState<ParteRotulo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Cosmético não tem tabela nutricional: uma foto dela, tirada antes de trocar o tipo, não vai.
  const partes: ParteRotulo[] =
    tipo === 'cosmetico' ? ['ingredientes'] : ['ingredientes', 'tabela'];
  const temFoto = partes.some((p) => fotos[p]);

  async function fotografar(parte: ParteRotulo, origem: 'camera' | 'galeria') {
    setAviso(null);
    setLendo(parte);
    const r = await fotografarELer(origem);
    setLendo(null);
    if (r.status === 'ok') setFotos((f) => ({ ...f, [parte]: r.foto }));
    else if (r.status !== 'cancelado') setAviso(AVISO_FOTO[r.status]);
  }

  /** Envia e devolve true se deu certo (a tela então volta ao resultado). */
  async function enviar(): Promise<boolean> {
    if (!tipo || !temFoto || enviando) return false;
    setAviso(null);
    setEnviando(true);
    try {
      const dados = await enviarRotulo(barcode, {
        tipo,
        ...(nome.trim() && { nome: nome.trim() }),
        ...(fotos.ingredientes && { ingredientes: fotos.ingredientes.linhas }),
        ...(tipo === 'alimento' && fotos.tabela && { tabela: fotos.tabela.linhas }),
      });
      guardarNaMemoria(barcode, dados);
      return true;
    } catch (err) {
      setAviso(
        err instanceof ErroProduto && err.tipo === 'rotulo_ilegivel'
          ? err.message
          : 'Não foi possível enviar agora. Confira a conexão e tente de novo.',
      );
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return {
    tipo,
    setTipo,
    nome,
    setNome,
    partes,
    fotos,
    lendo,
    enviando,
    aviso,
    temFoto,
    fotografar,
    enviar,
  };
}
