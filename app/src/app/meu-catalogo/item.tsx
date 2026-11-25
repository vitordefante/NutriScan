import { router, useLocalSearchParams } from 'expo-router';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FotoItem } from '@/components/conta-produtor/foto-item';
import { SeletorUnidade } from '@/components/conta-produtor/seletor-unidade';
import { Secao } from '@/components/resultado/secoes';
import { Aviso } from '@/components/ui/aviso';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { type ModoItem, useFormularioItem } from '@/hooks/use-formulario-item';
import { type EstadoMeuCatalogo, useMeuCatalogo } from '@/hooks/use-meu-catalogo';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

/**
 * Um item do catálogo: novo (`/meu-catalogo/item`), publicado (`?id=`) ou um item novo já
 * enviado (`?proposta=`).
 */
export default function TelaItem() {
  const { id, proposta } = useLocalSearchParams<{ id?: string; proposta?: string }>();
  const { estado, recarregar } = useMeuCatalogo();

  let modo: ModoItem | null = null;
  let chave = 'novo';
  if (estado.status === 'pronto') {
    if (id) {
      const item = estado.dados.itens.find((i) => i.id === id);
      if (item) {
        modo = { tipo: 'item', item };
        chave = item.id;
      }
    } else if (proposta) {
      const p = estado.dados.novos.find((n) => n.id === proposta);
      if (p) {
        modo = { tipo: 'novo', proposta: p };
        chave = p.id;
      }
    } else {
      modo = { tipo: 'novo' };
    }
  }
  const titulo = id ? 'ITEM' : 'NOVO ITEM';

  return (
    <Tela>
      <CabecalhoTela titulo={titulo} onVoltar={() => router.back()} />
      {estado.status === 'pronto' && modo ? (
        // A chave só muda se for outro item: os campos não voltam ao início quando a lista
        // é buscada de novo por trás.
        <Formulario key={chave} modo={modo} token={estado.token} />
      ) : (
        <View style={estilos.estado}>
          <Texto variante="apoio">{MENSAGEM_DO_ESTADO[estado.status]}</Texto>
          {estado.status === 'erro' && (
            <Botao titulo="Tentar de novo" variante="secundario" onPress={recarregar} />
          )}
        </View>
      )}
    </Tela>
  );
}

/** O que a tela diz quando não há formulário para mostrar. */
const MENSAGEM_DO_ESTADO: Record<EstadoMeuCatalogo['status'], string> = {
  pronto: 'Esse item não está mais no catálogo.',
  carregando: 'Carregando…',
  erro: 'Não deu para carregar o catálogo agora. Confira a conexão.',
  sem_conta: 'Entre na sua conta (aba Perfil) para cuidar do catálogo.',
  nao_e_produtor: 'Esta conta não está ligada a um produtor.',
};

function Formulario({ modo, token }: { modo: ModoItem; token: string }) {
  const f = useFormularioItem(token, modo);
  const publicado = modo.tipo === 'item' ? modo.item : null;
  const enviado = modo.tipo === 'item' ? modo.item.alteracao : modo.proposta;

  function escolherFoto() {
    Alert.alert('Foto do item', 'Uma foto do produto, de perto e com boa luz.', [
      { text: 'Tirar foto', onPress: () => void f.trocarFoto('camera') },
      { text: 'Escolher da galeria', onPress: () => void f.trocarFoto('galeria') },
      ...(f.foto ? [{ text: 'Tirar a foto do item', onPress: f.tirarFoto }] : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  async function enviar() {
    if (await f.enviar()) {
      Alert.alert(
        'Enviado para análise',
        publicado
          ? 'A mudança aparece no mapa depois da conferência. Até lá, o item continua como está.'
          : 'O item aparece no mapa depois da conferência do autor do app.',
      );
      router.back();
    }
  }

  function confirmarRemocao() {
    const novo = !publicado;
    Alert.alert(
      novo ? 'Cancelar o envio?' : 'Tirar do catálogo?',
      novo ? 'O item não vai para análise.' : 'O item sai do mapa agora.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: novo ? 'Cancelar envio' : 'Tirar',
          style: 'destructive',
          onPress: () => void f.remover().then((ok) => ok && router.back()),
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
      >
        {enviado && (
          <View style={[estilos.situacao, enviado.situacao === 'recusada' && estilos.recusada]}>
            <Texto variante="pixel" style={{ fontSize: 10 }}>
              {enviado.situacao === 'recusada'
                ? publicado
                  ? 'MUDANÇA RECUSADA'
                  : 'RECUSADO'
                : publicado
                  ? 'MUDANÇA EM ANÁLISE'
                  : 'EM ANÁLISE'}
            </Texto>
            <Texto>
              {enviado.situacao === 'recusada'
                ? `Motivo: ${enviado.motivo ?? 'não informado'}. Corrija e envie de novo.`
                : publicado
                  ? 'O mapa mostra o item como estava até a conferência. Abaixo, a mudança enviada.'
                  : 'Aparece no mapa depois da conferência do autor do app.'}
            </Texto>
            {publicado && (
              <Pressable
                onPress={() => void f.cancelarMudanca().then((ok) => ok && router.back())}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Texto style={estilos.link}>Desistir da mudança</Texto>
              </Pressable>
            )}
          </View>
        )}

        {publicado && (
          <Secao titulo="Preço · muda na hora">
            <CamposPreco f={f} />
            {f.confirmacao && <Texto style={estilos.ok}>{f.confirmacao}</Texto>}
            <View style={{ gap: 12, marginTop: 4 }}>
              <Botao
                titulo={f.ocupado === 'preco' ? 'Salvando…' : 'Salvar preço'}
                onPress={() => void f.salvarPreco(f.preco)}
                desabilitado={!f.preco || !f.precoMudou || f.ocupado !== null}
              />
              {f.temPrecoSalvo && (
                <Pressable
                  onPress={() => void f.salvarPreco(null)}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={{ alignSelf: 'center' }}
                >
                  <Texto style={estilos.link}>Tirar o preço</Texto>
                </Pressable>
              )}
            </View>
          </Secao>
        )}

        <Secao titulo={publicado ? 'Nome, descrição e foto · passa por análise' : 'Item'}>
          <View style={{ gap: 16 }}>
            <View style={estilos.linhaFoto}>
              <Pressable
                onPress={escolherFoto}
                disabled={f.ocupado !== null}
                accessibilityRole="button"
                accessibilityLabel={f.foto ? 'Trocar a foto' : 'Pôr uma foto'}
              >
                <FotoItem foto={f.foto} token={token} tamanho={120} />
              </Pressable>
              <View style={{ flex: 1, gap: 8 }}>
                <Botao
                  titulo={f.ocupado === 'foto' ? 'Enviando…' : f.foto ? 'Trocar foto' : 'Pôr foto'}
                  variante="secundario"
                  onPress={escolherFoto}
                  desabilitado={f.ocupado !== null}
                />
                <Texto variante="legenda">Quadrada, de perto e com boa luz.</Texto>
              </View>
            </View>
            <CampoTexto
              rotulo="Nome"
              value={f.nome}
              onChangeText={f.setNome}
              placeholder="Ex.: Ovos caipira"
              maxLength={60}
              returnKeyType="next"
            />
            <CampoTexto
              rotulo="Descrição (opcional)"
              value={f.descricao}
              onChangeText={f.setDescricao}
              placeholder="Ex.: Bandeja com 30, galinhas soltas"
              maxLength={120}
              multiline
              style={{ height: 84, paddingTop: 12, textAlignVertical: 'top' }}
            />
            {!publicado && <CamposPreco f={f} opcional />}
          </View>
        </Secao>

        {f.aviso && <Aviso>{f.aviso}</Aviso>}

        <Botao
          titulo={f.ocupado === 'enviando' ? 'Enviando…' : 'Enviar para análise'}
          onPress={() => void enviar()}
          desabilitado={!f.podeEnviar}
        />

        {(publicado || (modo.tipo === 'novo' && modo.proposta)) && (
          <Pressable
            onPress={confirmarRemocao}
            disabled={f.ocupado !== null}
            accessibilityRole="button"
            hitSlop={10}
            style={{ alignSelf: 'center' }}
          >
            <Texto style={estilos.excluir}>
              {publicado ? 'Tirar do catálogo' : 'Cancelar envio'}
            </Texto>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CamposPreco({
  f,
  opcional,
}: {
  f: ReturnType<typeof useFormularioItem>;
  opcional?: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      <CampoTexto
        rotulo={opcional ? 'Preço (opcional)' : 'Preço'}
        value={f.valor}
        onChangeText={f.setValor}
        placeholder="Ex.: 12,50"
        keyboardType="decimal-pad"
        maxLength={12}
      />
      <Texto variante="apoio" style={{ color: cores.tinta }}>
        Por
      </Texto>
      <SeletorUnidade valor={f.unidade} onMudar={f.setUnidade} />
      {!f.precoValido && f.valor.trim() !== '' && (
        <Texto variante="legenda" style={{ color: faixas.pessimo.texto }}>
          {f.unidade ? 'Valor entre R$ 0,01 e R$ 99.999,99.' : 'Escolha a unidade.'}
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  estado: { padding: espaco.margemTela, gap: 16 },
  conteudo: { padding: espaco.margemTela, paddingTop: 8, gap: 22, paddingBottom: 48 },
  linhaFoto: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  situacao: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.avisoClaro,
    padding: 14,
    gap: 8,
  },
  recusada: { backgroundColor: cores.coralClaro },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
  ok: { fontFamily: fontes.textoNegrito, fontSize: 14, color: faixas.excelente.texto },
  excluir: {
    fontFamily: fontes.textoNegrito,
    fontSize: 14,
    color: faixas.pessimo.texto,
    textDecorationLine: 'underline',
  },
});
