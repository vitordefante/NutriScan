import type { ProducersForProduct } from '@nutriscan/shared';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CartaoProdutor } from '@/components/produtores/cartao-produtor';
import { Texto } from '@/components/ui/texto';
import type { EstadoBusca } from '@/hooks/use-produtores';
import { NOME_CATEGORIA } from '@/lib/categorias-produtor';
import { localizacaoSemPedir, useLocalizacao } from '@/lib/localizacao';
import { ordenarPorDistancia } from '@/lib/produtores';
import { fontes } from '@/theme/tokens';

import { Secao } from './secoes';

type Props = {
  estado: EstadoBusca<ProducersForProduct>;
  onAbrir: (id: string) => void;
  onVerNoMapa: () => void;
};

/** Até 3 aparecem aqui; o resto, no mapa. */
const NA_TELA = 3;

/**
 * "Direto do produtor": produtores locais que vendem o que substitui o produto (ovos → ovos
 * caipira). Some quando não há nenhum — sem seção vazia na tela.
 */
export function SecaoProdutoresLocais({ estado, onAbrir, onVerNoMapa }: Props) {
  const localizacao = useLocalizacao();
  const posicao = localizacao.status === 'ok' ? localizacao.posicao : null;

  // Só usa a localização se ela já foi permitida (o pedido de permissão fica na aba Mapa).
  useEffect(() => {
    void localizacaoSemPedir();
  }, []);

  if (estado.status !== 'pronto' || !estado.dados.categoria) return null;
  const { categoria, produtores } = estado.dados;
  if (produtores.length === 0) return null;
  const linhas = ordenarPorDistancia(produtores, posicao).slice(0, NA_TELA);

  return (
    <Secao titulo="Direto do produtor">
      <Texto variante="apoio">
        {NOME_CATEGORIA[categoria]} de produtores da região
        {posicao ? ', do mais perto ao mais longe:' : ':'}
      </Texto>
      <View style={{ gap: 10 }}>
        {linhas.map((l) => (
          <CartaoProdutor
            key={l.produtor.id}
            produtor={l.produtor}
            local={l.local}
            km={l.km}
            categoria={categoria}
            onPress={() => onAbrir(l.produtor.id)}
          />
        ))}
      </View>
      <Pressable onPress={onVerNoMapa} accessibilityRole="button" hitSlop={10}>
        <Texto style={estilos.link}>
          {produtores.length > NA_TELA ? `Ver os ${produtores.length} no mapa` : 'Ver no mapa'}
        </Texto>
      </Pressable>
    </Secao>
  );
}

const estilos = StyleSheet.create({
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
});
