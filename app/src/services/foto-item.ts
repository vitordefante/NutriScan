import * as ImagePicker from 'expo-image-picker';

export type FotoEscolhida = { uri: string; base64: string };

/**
 * Foto de um item do catálogo: recorte quadrado (no iPhone o recorte é sempre quadrado, igual
 * ao cartão do catálogo) e JPEG comprimido. A API reduz, gira e apaga os metadados (GPS).
 */
export async function escolherFotoItem(
  origem: 'camera' | 'galeria',
): Promise<FotoEscolhida | 'cancelado' | 'sem_permissao' | 'falhou'> {
  try {
    if (origem === 'camera') {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissao.granted) return 'sem_permissao';
    }
    const opcoes: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    };
    const escolha =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);
    const imagem = escolha.canceled ? undefined : escolha.assets[0];
    if (!imagem) return 'cancelado';
    return imagem.base64 ? { uri: imagem.uri, base64: imagem.base64 } : 'falhou';
  } catch {
    // Ex.: câmera indisponível (simulador).
    return 'falhou';
  }
}
