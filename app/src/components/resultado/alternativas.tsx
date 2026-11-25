import type { Alternative } from '@nutriscan/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { BarraHp } from '@/components/ui/barra-hp';
import { Etiqueta } from '@/components/ui/etiqueta';
import { FotoProduto } from '@/components/ui/foto-produto';
import type { NomeIconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import type { EstadoAlternativas } from '@/hooks/use-alternativas';
import { cores, coresNutriScore, espaco, faixas, fontes } from '@/theme/tokens';

import { Secao } from './secoes';

type Props = {
  estado: EstadoAlternativas;
  /** Ícone dos cartões sem foto: o da categoria do produto escaneado (é a mesma busca). */
  icone: NomeIconePixel;
  onAbrir: (barcode: string) => void;
  onTentarDeNovo: () => void;
};

/** Seção "Alternativas melhores": produtos da mesma categoria, vendidos no Brasil, com nota maior. */
export function SecaoAlternativas({ estado, icone, onAbrir, onTentarDeNovo }: Props) {
  // Sem nota de referência, a lista é dos mais bem avaliados — não dá para dizer "melhores".
  const semReferencia =
    estado.status === 'pronto' && estado.dados.status === 'ok'
      ? estado.dados.referencia === null
      : false;

  return (
    <Secao titulo={semReferencia ? 'Mais bem avaliados' : 'Alternativas melhores'}>
      {estado.status === 'carregando' && (
        <Texto variante="apoio">Procurando produtos da mesma categoria…</Texto>
      )}

      {estado.status === 'erro' && (
        <View style={estilos.linhaErro}>
          <Texto variante="apoio" style={{ flex: 1 }}>
            Não deu para buscar alternativas agora.
          </Texto>
          <Pressable onPress={onTentarDeNovo} accessibilityRole="button" hitSlop={10}>
            <Texto style={estilos.link}>Tentar de novo</Texto>
          </Pressable>
        </View>
      )}

      {estado.status === 'pronto' && estado.dados.status === 'sem_categoria' && (
        <Texto variante="apoio">
          O cadastro deste produto não tem categoria, então não dá para compará-lo com outros.
        </Texto>
      )}

      {estado.status === 'pronto' && estado.dados.status === 'ok' && (
        <>
          {estado.dados.alternativas.length > 0 ? (
            <View style={{ gap: 10 }}>
              {estado.dados.alternativas.map((alternativa) => (
                <CartaoAlternativa
                  key={alternativa.barcode}
                  alternativa={alternativa}
                  icone={icone}
                  onPress={() => onAbrir(alternativa.barcode)}
                />
              ))}
            </View>
          ) : (
            <Texto variante="apoio">
              {estado.dados.comparados > 0
                ? `Nenhum produto com nota maior entre os ${estado.dados.comparados} comparados.`
                : 'Nenhum produto da mesma categoria tem dados completos na base para comparar.'}
            </Texto>
          )}
          {estado.dados.incompleta && (
            <View style={estilos.linhaErro}>
              <Texto variante="legenda" style={{ flex: 1 }}>
                Parte da busca falhou agora: a lista pode estar incompleta.
              </Texto>
              <Pressable onPress={onTentarDeNovo} accessibilityRole="button" hitSlop={10}>
                <Texto style={estilos.link}>Tentar de novo</Texto>
              </Pressable>
            </View>
          )}
        </>
      )}
    </Secao>
  );
}

function CartaoAlternativa({
  alternativa: a,
  icone,
  onPress,
}: {
  alternativa: Alternative;
  icone: NomeIconePixel;
  onPress: () => void;
}) {
  const faixa = faixas[a.faixa];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${a.nome}${a.marca ? `, ${a.marca}` : ''}: nota ${a.nota} de 100. Abrir análise.`}
      style={({ pressed }) => [estilos.cartao, pressed && { backgroundColor: cores.vazio }]}
    >
      {/* Em cima: foto, nome e seta. Embaixo, na largura toda: nota e etiquetas (ao lado da
          foto elas quebravam em duas linhas no iPhone 13 mini). */}
      <View style={estilos.topo}>
        <FotoProduto url={a.imagemUrl} icone={icone} style={estilos.foto} />
        <View style={estilos.textos}>
          <Texto variante="subtitulo" style={{ fontSize: 15, lineHeight: 19 }} numberOfLines={2}>
            {a.nome}
          </Texto>
          {a.marca && (
            <Texto variante="legenda" numberOfLines={1}>
              {a.marca}
            </Texto>
          )}
        </View>
        <Texto variante="pixel" style={estilos.seta} accessible={false}>
          {'>'}
        </Texto>
      </View>

      <View style={estilos.linhaNota}>
        <Texto style={[estilos.nota, { color: faixa.texto }]}>{a.nota}</Texto>
        <View style={{ flex: 1 }}>
          <BarraHp valor={a.nota} cor={faixa.preenchimento} altura={8} />
        </View>
      </View>
      <View style={estilos.etiquetas}>
        {a.tipo === 'alimento' ? (
          <>
            {a.nova !== null && <Etiqueta texto={`NOVA ${a.nova}`} />}
            {a.nutriScore !== null && (
              <Etiqueta
                texto={`Nutri-Score ${a.nutriScore}`}
                fundo={coresNutriScore[a.nutriScore]}
              />
            )}
            <Etiqueta
              texto={a.lupa === 0 ? 'Sem lupa' : `${a.lupa} ${a.lupa === 1 ? 'lupa' : 'lupas'}`}
            />
          </>
        ) : (
          <Etiqueta texto={a.alertas === 0 ? 'Sem atenção' : `${a.alertas} de atenção`} />
        )}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    gap: 10,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    padding: 12,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: {
    width: 48,
    height: 48,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
  },
  textos: { flex: 1, gap: 2 },
  linhaNota: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nota: { fontFamily: fontes.pixel, fontSize: 18, minWidth: 30 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  seta: { fontSize: 16 },
  linhaErro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
});
