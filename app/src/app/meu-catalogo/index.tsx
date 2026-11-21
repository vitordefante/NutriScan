import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LinhaItem, type SituacaoLinha } from '@/components/conta-produtor/linha-item';
import { Secao } from '@/components/resultado/secoes';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { useMeuCatalogo } from '@/hooks/use-meu-catalogo';
import { espaco, fontes } from '@/theme/tokens';

/** Área do produtor: o catálogo dele, com o que está publicado e o que espera a conferência. */
export default function TelaMeuCatalogo() {
  const { estado, recarregar } = useMeuCatalogo();

  return (
    <Tela>
      <CabecalhoTela titulo="MEU CATÁLOGO" onVoltar={() => router.back()} />
      {estado.status === 'pronto' ? (
        <Conteudo {...estado} />
      ) : (
        <View style={[estilos.conteudo, { gap: 16 }]}>
          <Texto variante="apoio">
            {estado.status === 'carregando'
              ? 'Carregando…'
              : estado.status === 'erro'
                ? 'Não deu para carregar o catálogo agora.'
                : 'Esta conta não está ligada a um produtor do mapa.'}
          </Texto>
          {estado.status === 'erro' && (
            <Botao titulo="Tentar de novo" variante="secundario" onPress={recarregar} />
          )}
        </View>
      )}
    </Tela>
  );
}

function Conteudo({
  dados: { produtor, itens, novos, limite },
  token,
}: Extract<ReturnType<typeof useMeuCatalogo>['estado'], { status: 'pronto' }>) {
  const ocupados = itens.length + novos.filter((n) => n.situacao === 'em_analise').length;
  const abrir = (params: { id: string } | { proposta: string } | Record<string, never>) =>
    router.push({ pathname: '/meu-catalogo/item', params });

  return (
    <ScrollView contentContainerStyle={estilos.conteudo} contentInsetAdjustmentBehavior="never">
      <View style={{ gap: 6 }}>
        <Texto variante="titulo">{produtor.nome}</Texto>
        <Pressable
          onPress={() => router.push({ pathname: '/produtor/[id]', params: { id: produtor.id } })}
          accessibilityRole="link"
          hitSlop={10}
        >
          <Texto style={estilos.link}>Ver minha página no mapa</Texto>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Botao
          titulo="Adicionar item"
          onPress={() => abrir({})}
          desabilitado={ocupados >= limite}
        />
        <Texto variante="legenda">
          {ocupados} de {limite} itens. Preço e remoção valem na hora; itens novos e mudanças de
          nome, descrição ou foto aparecem depois da conferência do autor do app.
        </Texto>
      </View>

      {novos.length > 0 && (
        <Secao titulo="Enviados">
          <View style={estilos.lista}>
            {novos.map((n) => (
              <LinhaItem
                key={n.id}
                nome={n.nome}
                {...(n.preco && { preco: n.preco })}
                {...(n.foto && { foto: n.foto })}
                situacao={n.situacao === 'recusada' ? 'recusado' : 'em_analise'}
                token={token}
                onPress={() => abrir({ proposta: n.id })}
              />
            ))}
          </View>
        </Secao>
      )}

      <Secao titulo="No mapa">
        {itens.length === 0 ? (
          <Texto variante="apoio">
            Nenhum item publicado ainda. Adicione o que você vende, com foto e preço.
          </Texto>
        ) : (
          <View style={estilos.lista}>
            {itens.map((i) => {
              const situacao: SituacaoLinha | undefined = i.alteracao
                ? i.alteracao.situacao === 'recusada'
                  ? 'mudanca_recusada'
                  : 'mudanca_em_analise'
                : undefined;
              return (
                <LinhaItem
                  key={i.id}
                  nome={i.nome}
                  {...(i.preco && { preco: i.preco })}
                  {...(i.foto && { foto: i.foto })}
                  {...(situacao && { situacao })}
                  token={token}
                  onPress={() => abrir({ id: i.id })}
                />
              );
            })}
          </View>
        )}
      </Secao>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.margemTela, paddingTop: 8, gap: 22, paddingBottom: 48 },
  lista: { gap: 10 },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
});
