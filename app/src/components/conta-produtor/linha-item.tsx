import type { ProducerPhoto, ProducerPrice } from '@nutriscan/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { formatarPreco } from '@/lib/preco';
import { cores, espaco, faixas } from '@/theme/tokens';

import { FotoItem } from './foto-item';

/** Situação mostrada na linha: publicado não leva marca; o resto, sim. */
export type SituacaoLinha = 'em_analise' | 'recusado' | 'mudanca_em_analise' | 'mudanca_recusada';

const SITUACAO: Record<SituacaoLinha, { texto: string; fundo: string; cor: string }> = {
  em_analise: { texto: 'EM ANÁLISE', fundo: cores.avisoClaro, cor: cores.tinta },
  recusado: { texto: 'RECUSADO', fundo: cores.coralClaro, cor: faixas.pessimo.texto },
  mudanca_em_analise: { texto: 'MUDANÇA EM ANÁLISE', fundo: cores.avisoClaro, cor: cores.tinta },
  mudanca_recusada: {
    texto: 'MUDANÇA RECUSADA',
    fundo: cores.coralClaro,
    cor: faixas.pessimo.texto,
  },
};

type Props = {
  nome: string;
  preco?: ProducerPrice;
  foto?: ProducerPhoto;
  situacao?: SituacaoLinha;
  token: string;
  onPress: () => void;
};

/** Linha de "Meu catálogo": foto, nome, preço e, quando há, a situação do envio. */
export function LinhaItem({ nome, preco, foto, situacao, token, onPress }: Props) {
  const marca = situacao ? SITUACAO[situacao] : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nome}. ${preco ? formatarPreco(preco) : 'Sem preço'}.${marca ? ` ${marca.texto.toLocaleLowerCase('pt-BR')}.` : ''} Editar.`}
      style={({ pressed }) => [estilos.linha, pressed && { backgroundColor: cores.vazio }]}
    >
      <FotoItem foto={foto} token={token} tamanho={56} />
      <View style={estilos.textos}>
        <Texto variante="subtitulo" numberOfLines={1}>
          {nome}
        </Texto>
        <Texto variante="apoio">{preco ? formatarPreco(preco) : 'Sem preço'}</Texto>
        {marca && (
          <View style={[estilos.marca, { backgroundColor: marca.fundo }]}>
            <Texto variante="pixel" style={{ fontSize: 9, color: marca.cor }}>
              {marca.texto}
            </Texto>
          </View>
        )}
      </View>
      <Texto variante="pixel" style={{ fontSize: 16 }} accessible={false}>
        {'>'}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    padding: 10,
  },
  textos: { flex: 1, gap: 2 },
  marca: {
    alignSelf: 'flex-start',
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
});
