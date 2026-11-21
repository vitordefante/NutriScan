import type { ProducerCategory } from '@nutriscan/shared';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { CampoTexto } from '@/components/ui/campo-texto';
import { IconePixel } from '@/components/ui/icone-pixel';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { usePedidoProdutor } from '@/hooks/use-pedido-produtor';
import { CATEGORIAS, NOME_CATEGORIA } from '@/lib/categorias-produtor';
import { cores, espaco, fontes } from '@/theme/tokens';

/** "Quero aparecer no mapa": pedido do produtor, conferido pelo autor antes de publicar. */
export default function TelaQueroAparecer() {
  const f = usePedidoProdutor();

  return (
    <Tela>
      <CabecalhoTela titulo="QUERO APARECER" onVoltar={() => router.back()} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.conteudo}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
        >
          {f.enviado ? (
            <>
              <Texto variante="titulo">Pedido enviado</Texto>
              <Texto>
                Obrigado! Antes de aparecer no mapa, o pedido é conferido (por visita ou pelo
                WhatsApp informado). Nada é publicado sem essa conferência.
              </Texto>
              <Botao titulo="Voltar ao mapa" onPress={() => router.back()} />
            </>
          ) : (
            <Formulario f={f} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Tela>
  );
}

function Formulario({ f }: { f: ReturnType<typeof usePedidoProdutor> }) {
  return (
    <>
      <View style={{ gap: 8 }}>
        <Texto variante="titulo">Venda direto para quem está perto</Texto>
        <Texto variante="apoio">
          O mapa mostra produtores rurais da região. Preencha e o pedido vai para conferência: não
          precisa de conta.
        </Texto>
      </View>

      <CampoTexto
        rotulo="Nome do sítio, marca ou produtor"
        value={f.campos.nome}
        onChangeText={f.set.setNome}
        maxLength={120}
        returnKeyType="next"
      />

      <View style={{ gap: 8 }}>
        <Texto variante="apoio" style={estilos.rotulo}>
          O que você produz (uma ou mais)
        </Texto>
        <View style={estilos.categorias}>
          {CATEGORIAS.map((c) => (
            <OpcaoCategoria
              key={c}
              categoria={c}
              ativa={f.categorias.includes(c)}
              onPress={() => f.alternarCategoria(c)}
            />
          ))}
        </View>
      </View>

      <CampoTexto
        rotulo="Produtos"
        placeholder="Ex.: alface, couve, ovos caipira"
        value={f.campos.produtos}
        onChangeText={f.set.setProdutos}
        maxLength={300}
      />
      <CampoTexto
        rotulo="Onde vende (feira, loja, na propriedade) e cidade"
        placeholder="Ex.: Feira do bairro, Jaraguá do Sul"
        value={f.campos.local}
        onChangeText={f.set.setLocal}
        maxLength={300}
      />
      <CampoTexto
        rotulo="WhatsApp com DDD"
        placeholder="(47) 99999-9999"
        value={f.campos.whatsapp}
        onChangeText={f.set.setWhatsapp}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={20}
      />
      <CampoTexto
        rotulo="Instagram (opcional)"
        placeholder="@seuperfil"
        value={f.campos.instagram}
        onChangeText={f.set.setInstagram}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={31}
      />
      <CampoTexto
        rotulo="Algo mais? (opcional)"
        placeholder="Ex.: entrego no centro às sextas"
        value={f.campos.mensagem}
        onChangeText={f.set.setMensagem}
        maxLength={500}
        multiline
        style={{ height: 96, paddingTop: 12, textAlignVertical: 'top' }}
      />

      <Pressable
        onPress={() => f.setAutoriza(!f.autoriza)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: f.autoriza }}
        style={estilos.autorizacao}
      >
        <View style={[estilos.caixa, f.autoriza && { backgroundColor: cores.tinta }]}>
          {f.autoriza && <Texto style={estilos.marca}>✓</Texto>}
        </View>
        <Texto style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
          Autorizo publicar no mapa o nome, os produtos, o local de venda e os contatos acima. Posso
          pedir para sair do mapa quando quiser.
        </Texto>
      </Pressable>

      {f.aviso && <Aviso>{f.aviso}</Aviso>}

      <Botao
        titulo={f.enviando ? 'Enviando…' : 'Enviar pedido'}
        onPress={() => void f.enviar()}
        desabilitado={!f.pronto || f.enviando}
      />
      <Texto variante="legenda">
        Endereço de casa não é publicado: no mapa aparece o local de venda ou uma posição
        aproximada, como o produtor preferir.
      </Texto>
    </>
  );
}

function OpcaoCategoria({
  categoria,
  ativa,
  onPress,
}: {
  categoria: ProducerCategory;
  ativa: boolean;
  onPress: () => void;
}) {
  const cor = ativa ? cores.papel : cores.tinta;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ativa }}
      accessibilityLabel={NOME_CATEGORIA[categoria]}
      style={[estilos.opcao, { backgroundColor: ativa ? cores.tinta : cores.papel }]}
    >
      <IconePixel nome={categoria} escala={1} cor={cor} />
      <Texto style={[estilos.textoOpcao, { color: cor }]}>{NOME_CATEGORIA[categoria]}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.margemTela, paddingTop: 8, gap: 18, paddingBottom: 48 },
  rotulo: { fontFamily: fontes.textoMedio, color: cores.tinta },
  categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
  },
  textoOpcao: { fontFamily: fontes.textoMedio, fontSize: 14 },
  autorizacao: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  caixa: {
    width: 26,
    height: 26,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marca: { color: cores.papel, fontFamily: fontes.textoNegrito, fontSize: 16, lineHeight: 18 },
});
