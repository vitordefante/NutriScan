import type { ScoreItem } from '@nutriscan/shared';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BarraHp } from '@/components/ui/barra-hp';
import { IconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

/** Lista dos itens que compõem a nota, cada um com motivo e fonte. */
export function PorQueNota({ itens }: { itens: ScoreItem[] }) {
  return (
    <ScrollView contentContainerStyle={estilos.conteudo} contentInsetAdjustmentBehavior="never">
      <Texto>
        Todo produto começa com <Texto style={{ fontFamily: fontes.textoNegrito }}>100 HP</Texto>.
        Cada item abaixo desconta (ou soma) pontos, sempre com a fonte que justifica a regra.
      </Texto>

      <View style={{ gap: 8 }}>
        <View style={estilos.hp}>
          <IconePixel nome="coracao" cor={faixas.pessimo.preenchimento} />
          <Texto variante="pixel">HP</Texto>
          <Texto variante="pixel">100/100</Texto>
        </View>
        <BarraHp valor={100} cor={faixas.excelente.preenchimento} />
      </View>

      {itens.map((item) => (
        <View key={item.id} style={estilos.item}>
          <View style={estilos.topoItem}>
            <Texto variante="subtitulo" style={{ flex: 1, fontSize: 16 }}>
              {item.label}
            </Texto>
            <View
              style={[
                estilos.pontos,
                { backgroundColor: item.pontos < 0 ? cores.coral : faixas.excelente.preenchimento },
              ]}
            >
              <Texto variante="pixel" style={{ fontSize: 14 }}>
                {formatarPontos(item.pontos)}
              </Texto>
            </View>
          </View>
          <Texto style={{ fontSize: 14, lineHeight: 20 }}>
            {item.motivo}
            {item.estimado ? ' (estimado)' : ''}
          </Texto>
          <View style={estilos.fonte}>
            <Texto variante="pixel" cor={cores.grafite} style={{ fontSize: 10 }}>
              FONTE
            </Texto>
            <Texto variante="legenda">{item.fonte}</Texto>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/** −45 / +5 (com o sinal de menos tipográfico). */
function formatarPontos(pontos: number): string {
  return pontos < 0 ? `−${Math.abs(pontos)}` : `+${pontos}`;
}

const estilos = StyleSheet.create({
  conteudo: {
    paddingHorizontal: espaco.margemTela,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 16,
  },
  hp: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    padding: 16,
    gap: 10,
  },
  topoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pontos: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fonte: {
    gap: 2,
    // Linha fina sólida: no iOS, borda pontilhada em um lado só não é desenhada.
    borderTopWidth: 1,
    borderTopColor: cores.linhaPontilhada,
    paddingTop: 10,
  },
});
