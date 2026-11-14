import type { ProductKind } from '@nutriscan/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CartaoFoto } from '@/components/rotulo/cartao-foto';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { IconePixel } from '@/components/ui/icone-pixel';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { type ParteRotulo, useEnvioRotulo } from '@/hooks/use-envio-rotulo';
import { cores, espaco, fontes } from '@/theme/tokens';

const PARTES: Record<ParteRotulo, { titulo: string; dica: string }> = {
  ingredientes: {
    titulo: 'Lista de ingredientes',
    dica: 'Enquadre o bloco que começa com "Ingredientes:", com o texto reto e sem reflexo.',
  },
  tabela: {
    titulo: 'Tabela nutricional',
    dica: 'A tabela inteira, do título "Informação nutricional" até o sódio.',
  },
};

/**
 * "Fotografar o rótulo": para produtos que as bases abertas não conhecem (ou conhecem sem
 * ingredientes/tabela). O texto é lido no aparelho e a análise fica guardada na base própria —
 * quem escanear o mesmo código depois já recebe a nota.
 *
 * Parâmetros: `tipo` (já conhecido quando o produto está nas bases) e `novo=1` (produto não
 * encontrado: pede o nome).
 */
export default function TelaRotulo() {
  const params = useLocalSearchParams<{ barcode: string; tipo?: ProductKind; novo?: string }>();
  const envio = useEnvioRotulo(params.barcode, params.tipo);
  const novo = params.novo === '1';

  async function analisar() {
    if (await envio.enviar()) router.back();
  }

  return (
    <Tela>
      <CabecalhoTela titulo="FOTO DO RÓTULO" onVoltar={() => router.back()} />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
      >
        <Texto variante="apoio">
          O texto é lido no próprio celular: as fotos não saem do aparelho. A análise fica guardada
          para quem escanear este código depois.
        </Texto>

        {!params.tipo && (
          <View style={{ gap: 12 }}>
            <Texto variante="secao" accessibilityRole="header">
              O QUE É ESTE PRODUTO?
            </Texto>
            <View style={estilos.linha}>
              {(['alimento', 'cosmetico'] as const).map((t) => (
                <Botao
                  key={t}
                  titulo={t === 'alimento' ? 'Alimento' : 'Cosmético'}
                  variante={envio.tipo === t ? 'primario' : 'secundario'}
                  onPress={() => envio.setTipo(t)}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          </View>
        )}

        {novo && envio.tipo && (
          <View style={{ gap: 8 }}>
            <Texto variante="secao" nativeID="rotulo-nome">
              NOME DO PRODUTO (OPCIONAL)
            </Texto>
            <TextInput
              value={envio.nome}
              onChangeText={envio.setNome}
              placeholder={
                envio.tipo === 'alimento' ? 'Ex.: Biscoito de polvilho' : 'Ex.: Loção hidratante'
              }
              placeholderTextColor={cores.cinza}
              maxLength={120}
              returnKeyType="done"
              accessibilityLabelledBy="rotulo-nome"
              style={estilos.campo}
            />
          </View>
        )}

        {envio.tipo &&
          envio.partes.map((parte, i) => (
            <CartaoFoto
              key={parte}
              titulo={`${i + 1} · ${PARTES[parte].titulo}`}
              dica={PARTES[parte].dica}
              foto={envio.fotos[parte]}
              lendo={envio.lendo === parte}
              ocupado={envio.lendo !== null || envio.enviando}
              onFotografar={() => void envio.fotografar(parte, 'camera')}
              onGaleria={() => void envio.fotografar(parte, 'galeria')}
            />
          ))}

        {envio.tipo === 'alimento' && (
          <Texto variante="legenda">
            Com as duas fotos a análise fica completa: a lista mostra o processamento e os aditivos;
            a tabela, o excesso de açúcar, gordura e sódio.
          </Texto>
        )}

        {envio.aviso && (
          <View style={estilos.aviso} accessibilityLiveRegion="polite">
            <IconePixel nome="alerta" />
            <Texto style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{envio.aviso}</Texto>
          </View>
        )}

        {envio.tipo && (
          <Botao
            titulo={envio.enviando ? 'Analisando...' : 'Analisar'}
            onPress={() => void analisar()}
            desabilitado={!envio.temFoto || envio.enviando || envio.lendo !== null}
          />
        )}
      </ScrollView>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    paddingHorizontal: espaco.margemTela,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 24,
  },
  linha: { flexDirection: 'row', gap: 12 },
  campo: {
    height: 52,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 14,
    fontFamily: fontes.textoMedio,
    fontSize: 17,
    color: cores.tinta,
  },
  aviso: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: cores.avisoClaro,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    padding: 14,
  },
});
