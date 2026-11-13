import type { LabelLine } from '@nutriscan/shared';
import * as ImagePicker from 'expo-image-picker';

import LeitorRotulo from '../../modules/leitor-rotulo/src/LeitorRotuloModule';

/** O aparelho sabe ler texto de fotos? (hoje: só iOS, com o Apple Vision). */
export const podeLerRotulo = LeitorRotulo !== null;

export type FotoLida = { uri: string; linhas: LabelLine[] };

export type ResultadoFoto =
  | { status: 'ok'; foto: FotoLida }
  | { status: 'cancelado' }
  | { status: 'sem_permissao' }
  | { status: 'sem_texto' }
  | { status: 'falhou' };

/**
 * Tira (ou escolhe) uma foto e lê o texto dela no próprio aparelho.
 * Só o texto e a posição de cada linha seguem para a API; a foto fica no celular.
 */
export async function fotografarELer(origem: 'camera' | 'galeria'): Promise<ResultadoFoto> {
  if (!LeitorRotulo) return { status: 'falhou' };

  try {
    if (origem === 'camera') {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissao.granted) return { status: 'sem_permissao' };
    }
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const escolha =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);
    const imagem = escolha.canceled ? undefined : escolha.assets[0];
    if (!imagem) return { status: 'cancelado' };

    const lidas = await LeitorRotulo.lerTexto(imagem.uri);
    const linhas = lidas
      .filter((l) => l.texto.trim())
      .map(({ texto, x, y, largura, altura }) => ({ texto, x, y, largura, altura }));
    return linhas.length > 0
      ? { status: 'ok', foto: { uri: imagem.uri, linhas } }
      : { status: 'sem_texto' };
  } catch {
    // Ex.: câmera indisponível (simulador) ou imagem num formato que o Vision não abre.
    return { status: 'falhou' };
  }
}
