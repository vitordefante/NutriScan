import type { NutritionFacts } from '@nutriscan/shared';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Botao, BotaoIcone } from '@/components/ui/botao';
import { CartaoEmPilha } from '@/components/ui/cartao-em-pilha';
import { Texto } from '@/components/ui/texto';
import {
  descreverConsumo,
  energia,
  formatarNumero,
  maximoDePassos,
  PASSOS_PADRAO,
  passoDoConsumo,
} from '@/lib/nutricao';
import { cores, espaco, fontes } from '@/theme/tokens';

type Props = {
  visivel: boolean;
  nome: string;
  nutricao: NutritionFacts;
  enviando: boolean;
  /** Mensagem de erro do último envio (o popup continua aberto para tentar de novo). */
  erro?: string;
  onCancelar: () => void;
  onRegistrar: (quantidade: number) => void;
};

/**
 * Popup "Quanto você consumiu?": − e + de meia em meia porção (sem porção, 50 g/ml), com as kcal
 * da quantidade escolhida. Abre sempre em 1 porção (ou 100 g/ml).
 */
export function EscolherQuantidade({
  visivel,
  nome,
  nutricao,
  enviando,
  erro,
  onCancelar,
  onRegistrar,
}: Props) {
  const [passos, setPassos] = useState(PASSOS_PADRAO);
  const maximo = maximoDePassos(nutricao);
  const quantidade = passos * passoDoConsumo(nutricao);
  const descricao = descreverConsumo(quantidade, nutricao.unidade, nutricao.porcao);
  const kcal = energia(nutricao.por100, quantidade / 100);
  const cancelar = () => {
    if (!enviando) onCancelar();
  };

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={cancelar}
      onShow={() => setPassos(PASSOS_PADRAO)}
    >
      <View style={estilos.fundo}>
        {/* Tocar fora do cartão cancela. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={cancelar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <View style={estilos.largura}>
          <CartaoEmPilha style={estilos.cartao}>
            <View style={{ gap: 4 }}>
              <Texto variante="pixel" style={{ fontSize: 11 }}>
                REGISTRAR CONSUMO
              </Texto>
              <Texto variante="apoio" numberOfLines={2}>
                {nome}
              </Texto>
            </View>

            <Texto variante="subtitulo">Quanto você consumiu?</Texto>

            <View style={estilos.quantidade}>
              <BotaoIcone
                rotuloAcessivel="Menos"
                onPress={() => setPassos((p) => Math.max(1, p - 1))}
              >
                <Sinal mais={false} apagado={passos <= 1} />
              </BotaoIcone>
              <View style={estilos.valor} accessible accessibilityLiveRegion="polite">
                <Texto style={estilos.descricao}>{descricao}</Texto>
                {kcal !== null && (
                  <Texto variante="legenda">{formatarNumero(Math.round(kcal))} kcal</Texto>
                )}
              </View>
              <BotaoIcone
                rotuloAcessivel="Mais"
                onPress={() => setPassos((p) => Math.min(maximo, p + 1))}
              >
                <Sinal mais apagado={passos >= maximo} />
              </BotaoIcone>
            </View>

            <View style={estilos.botoes}>
              <Botao
                titulo="Cancelar"
                variante="secundario"
                onPress={cancelar}
                desabilitado={enviando}
                style={{ flex: 1 }}
              />
              <Botao
                titulo={enviando ? 'Registrando…' : 'Registrar'}
                onPress={() => onRegistrar(quantidade)}
                desabilitado={enviando}
                style={{ flex: 1 }}
              />
            </View>

            {erro && (
              <Texto variante="legenda" style={estilos.centro} accessibilityLiveRegion="polite">
                {erro}
              </Texto>
            )}
          </CartaoEmPilha>
        </View>
      </View>
    </Modal>
  );
}

/** "−" ou "+" desenhado em blocos (o da fonte pixel fica pequeno e fora do centro). */
function Sinal({ mais, apagado }: { mais: boolean; apagado: boolean }) {
  const cor = { backgroundColor: apagado ? cores.cinza : cores.tinta };
  return (
    <View style={estilos.sinal}>
      <View style={[estilos.traco, cor]} />
      {mais && <View style={[estilos.traco, estilos.vertical, cor]} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espaco.margemTela,
    backgroundColor: 'rgba(31, 31, 31, 0.55)', // cores.tinta translúcida
  },
  largura: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  cartao: { padding: 20, gap: 18 },
  quantidade: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valor: { flex: 1, alignItems: 'center', gap: 2 },
  descricao: { fontFamily: fontes.textoNegrito, fontSize: 16, textAlign: 'center' },
  botoes: { flexDirection: 'row', gap: 12 },
  centro: { textAlign: 'center' },
  sinal: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  traco: { position: 'absolute', width: 14, height: 4 },
  vertical: { width: 4, height: 14 },
});
