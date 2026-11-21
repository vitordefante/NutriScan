import type { ProducerCategory, ProducerItem, ProducerPhoto } from '@nutriscan/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { urlFotoProdutor } from '@/services/api-produtores';
import { cores, espaco, fontes } from '@/theme/tokens';

import { IconeCategoria } from './icone-categoria';
import { VisualizadorFotos } from './visualizador-fotos';

const COLUNAS = 2;
const VAO = 12;

type Props = {
  itens: readonly ProducerItem[];
  /** Ícone dos itens sem foto. */
  categoria: ProducerCategory;
};

/** Catálogo do produtor: grade de 2 colunas com foto, nome, descrição e preço. */
export function CatalogoProdutor({ itens, categoria }: Props) {
  const { width } = useWindowDimensions();
  const largura = Math.floor((width - espaco.margemTela * 2 - VAO * (COLUNAS - 1)) / COLUNAS);
  const lado = largura - espaco.borda * 2;
  const [aberta, setAberta] = useState<number | null>(null);

  // A tela cheia mostra só as fotos dos itens; o nome do item descreve a foto.
  const fotos: ProducerPhoto[] = itens.flatMap((i) =>
    i.foto ? [{ ...i.foto, legenda: i.nome }] : [],
  );

  return (
    <View style={estilos.grade}>
      {itens.map((item, i) => {
        // Sem o endereço da API (build sem EXPO_PUBLIC_API_URL), o item fica com o ícone.
        const url = item.foto ? urlFotoProdutor(item.foto.id) : null;
        const indiceFoto = item.foto ? fotos.findIndex((f) => f.id === item.foto!.id) : -1;
        const foto =
          url && item.foto ? (
            <Image
              source={url}
              style={{ width: lado, height: lado, backgroundColor: cores.vazio }}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={item.foto.id}
            />
          ) : (
            <View style={[estilos.semFoto, { width: lado, height: lado }]}>
              <IconeCategoria categoria={categoria} tamanho={56} />
            </View>
          );
        return (
          <View key={`${i}-${item.nome}`} style={[estilos.item, { width: largura }]}>
            {url && indiceFoto >= 0 ? (
              <Pressable
                onPress={() => setAberta(indiceFoto)}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Foto de ${item.nome}. Toque para ampliar.`}
                style={({ pressed }) => pressed && { opacity: 0.8 }}
              >
                {foto}
              </Pressable>
            ) : (
              foto
            )}
            <View style={estilos.textos}>
              <Texto variante="subtitulo" numberOfLines={2}>
                {item.nome}
              </Texto>
              {item.descricao && (
                <Texto variante="legenda" numberOfLines={4}>
                  {item.descricao}
                </Texto>
              )}
              {item.preco && <Texto style={estilos.preco}>{item.preco}</Texto>}
            </View>
          </View>
        );
      })}
      {aberta !== null && (
        <VisualizadorFotos fotos={fotos} inicial={aberta} onFechar={() => setAberta(null)} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: VAO },
  item: { borderWidth: espaco.borda, borderColor: cores.tinta, backgroundColor: cores.papel },
  semFoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: cores.vazio },
  textos: {
    padding: 10,
    gap: 4,
    borderTopWidth: espaco.borda,
    borderTopColor: cores.tinta,
    flexGrow: 1,
  },
  preco: { fontFamily: fontes.textoNegrito, fontSize: 15, marginTop: 'auto', paddingTop: 2 },
});
