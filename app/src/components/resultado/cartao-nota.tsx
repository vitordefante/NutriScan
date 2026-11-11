import type { ScoreBand } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { BarraHp } from '@/components/ui/barra-hp';
import { BotaoIcone } from '@/components/ui/botao';
import { Etiqueta } from '@/components/ui/etiqueta';
import { IconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

type Props = {
  nota: number;
  faixa: ScoreBand;
  /** Nota parcial: é um teto (mostrada com "≤"). */
  teto: boolean;
  resumo: string;
  onPorQue: () => void;
};

/** Cartão principal: HP, nota, faixa, botão "?" e barra de HP. */
export function CartaoNota({ nota, faixa, teto, resumo, onPorQue }: Props) {
  const corFaixa = faixas[faixa];
  return (
    <View style={estilos.pilha}>
      {/* Folha de trás, deslocada: dá a sensação de cartões sobrepostos. */}
      <View style={estilos.folhaDeTras} />
      <View style={estilos.cartao}>
        {/* Linha de cima: HP à esquerda; "?" e faixa no canto superior direito. */}
        <View style={estilos.topo}>
          <View style={estilos.hp}>
            <IconePixel nome="coracao" escala={2} cor={faixas.pessimo.preenchimento} />
            <Texto variante="pixel">HP</Texto>
          </View>
          <View style={estilos.faixa}>
            <BotaoIcone rotuloAcessivel="Por que essa nota?" onPress={onPorQue} tamanho={28}>
              <Texto variante="pixel" style={{ fontSize: 13 }}>
                ?
              </Texto>
            </BotaoIcone>
            <Etiqueta texto={corFaixa.rotulo} fundo={corFaixa.preenchimento} tamanho="m" />
          </View>
        </View>
        <View
          style={estilos.numero}
          accessible
          accessibilityLabel={`Nota ${teto ? 'no máximo ' : ''}${nota} de 100, ${corFaixa.rotulo.toLowerCase()}`}
        >
          {teto && <Texto style={[estilos.pixel, estilos.teto]}>≤</Texto>}
          <Texto style={[estilos.pixel, estilos.nota]}>{nota}</Texto>
          <Texto style={[estilos.pixel, estilos.de100]}>/100</Texto>
        </View>
        <BarraHp valor={nota} cor={corFaixa.preenchimento} />
        <Texto>{resumo}</Texto>
      </View>
    </View>
  );
}

const DESLOCAMENTO = 8;

const estilos = StyleSheet.create({
  pilha: { marginRight: DESLOCAMENTO, marginBottom: DESLOCAMENTO },
  folhaDeTras: {
    position: 'absolute',
    top: DESLOCAMENTO,
    left: DESLOCAMENTO,
    right: -DESLOCAMENTO,
    bottom: -DESLOCAMENTO,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
  },
  cartao: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    padding: 20,
    paddingTop: 22,
    gap: 16,
  },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hp: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  numero: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: -6 },
  pixel: { fontFamily: fontes.pixel, color: cores.tinta },
  teto: { fontSize: 28, color: cores.grafite },
  nota: { fontSize: 60, lineHeight: 62 },
  de100: { fontSize: 20, color: cores.grafite },
  faixa: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});
