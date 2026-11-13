import { NativeModule, requireOptionalNativeModule } from 'expo';

/** Uma linha de texto lida na foto, com a posição normalizada (0–1, origem no topo à esquerda). */
export type LinhaLida = {
  texto: string;
  /** Confiança do reconhecimento (0–1). */
  confianca: number;
  x: number;
  y: number;
  largura: number;
  altura: number;
};

declare class LeitorRotuloModule extends NativeModule<{}> {
  /** Lê o texto de uma imagem local (file://) com o Apple Vision, no próprio aparelho. */
  lerTexto(uri: string): Promise<LinhaLida[]>;
}

/**
 * null onde o módulo nativo não existe: por enquanto só há a implementação para iOS (Apple
 * Vision); no Android e na web a opção de fotografar o rótulo não aparece.
 */
export default requireOptionalNativeModule<LeitorRotuloModule>('LeitorRotulo');
