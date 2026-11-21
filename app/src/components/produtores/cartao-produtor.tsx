import type { Producer, ProducerCategory, ProducerPlace } from '@nutriscan/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { CULTIVO } from '@/lib/categorias-produtor';
import { formatarDistancia } from '@/lib/localizacao';
import { resumoDoLocal } from '@/lib/produtores';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

import { IconeCategoria } from './icone-categoria';

type Props = {
  produtor: Producer;
  /** O local mostrado (o mais perto, ou o do pino escolhido). */
  local: ProducerPlace;
  km: number | null;
  /** O ícone mostrado: a categoria procurada (filtro, produto escaneado); senão, a primeira. */
  categoria?: ProducerCategory;
  onPress: () => void;
};

/** Linha da lista de produtores: ícone, nome, o que vende, onde e a que distância. */
export function CartaoProdutor({ produtor: p, local, km, categoria, onPress }: Props) {
  const ondeE = resumoDoLocal(local);
  const distancia = km === null ? null : formatarDistancia(km);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${p.nome}. Vende ${p.produtos.join(', ')}. ${ondeE}${distancia ? `, a ${distancia}` : ''}. Abrir detalhes.`}
      style={({ pressed }) => [estilos.cartao, pressed && { backgroundColor: cores.vazio }]}
    >
      <IconeCategoria categoria={categoria ?? p.categorias[0]!} />
      <View style={estilos.textos}>
        <Texto variante="subtitulo" style={estilos.nome} numberOfLines={1}>
          {p.nome}
        </Texto>
        <Texto variante="apoio" numberOfLines={1}>
          {p.produtos.join(', ')}
        </Texto>
        <Texto variante="legenda" numberOfLines={1}>
          {[distancia, ondeE].filter(Boolean).join(' · ')}
        </Texto>
        {p.cultivo && p.cultivo !== 'convencional' && (
          <Texto style={estilos.cultivo}>
            {CULTIVO[p.cultivo].rotulo.toLocaleUpperCase('pt-BR')}
          </Texto>
        )}
      </View>
      <Texto variante="pixel" style={{ fontSize: 16 }} accessible={false}>
        {'>'}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    padding: 12,
  },
  textos: { flex: 1, gap: 2 },
  nome: { fontSize: 16, lineHeight: 20 },
  cultivo: {
    fontFamily: fontes.pixel,
    fontSize: 9,
    letterSpacing: 0.5,
    color: faixas.excelente.texto,
    marginTop: 2,
  },
});
