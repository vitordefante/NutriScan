import type { Producer, ProducerPlace } from '@nutriscan/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconeCategoria } from '@/components/produtores/icone-categoria';
import { Secao } from '@/components/resultado/secoes';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { useProdutor } from '@/hooks/use-produtores';
import { CULTIVO, ROTULO_CATEGORIA, TIPO_LOCAL } from '@/lib/categorias-produtor';
import { distanciaKm, formatarDistancia, useLocalizacao } from '@/lib/localizacao';
import { linkWhatsApp } from '@/lib/produtores';
import { cores, espaco, fontes } from '@/theme/tokens';

/** Detalhe do produtor: o que vende, onde comprar e o contato. */
export default function TelaProdutor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado, tentarDeNovo } = useProdutor(id);

  return (
    <Tela>
      <CabecalhoTela titulo="PRODUTOR" onVoltar={() => router.back()} />
      {estado.status === 'carregando' && (
        <Texto variante="apoio" style={estilos.estado}>
          Carregando…
        </Texto>
      )}
      {estado.status === 'erro' && (
        <View style={[estilos.estado, { gap: 16 }]}>
          <Texto variante="apoio">
            {estado.tipo === 'produtor_nao_encontrado'
              ? 'Esse produtor não está mais no mapa.'
              : 'Não deu para carregar o produtor agora.'}
          </Texto>
          {estado.tipo !== 'produtor_nao_encontrado' && (
            <Botao titulo="Tentar de novo" variante="secundario" onPress={tentarDeNovo} />
          )}
        </View>
      )}
      {estado.status === 'pronto' && <Detalhe produtor={estado.dados} />}
    </Tela>
  );
}

function Detalhe({ produtor: p }: { produtor: Producer }) {
  const localizacao = useLocalizacao();
  const posicao = localizacao.status === 'ok' ? localizacao.posicao : null;
  const cultivo = p.cultivo ? CULTIVO[p.cultivo] : null;

  return (
    <ScrollView contentContainerStyle={estilos.conteudo} contentInsetAdjustmentBehavior="never">
      <View style={estilos.topo}>
        <IconeCategoria categoria={p.categorias[0]!} tamanho={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <Texto variante="titulo">{p.nome}</Texto>
          {p.responsavel && <Texto variante="apoio">{p.responsavel}</Texto>}
        </View>
      </View>

      <View style={estilos.etiquetas}>
        {p.categorias.map((c) => (
          <Etiqueta key={c} texto={ROTULO_CATEGORIA[c]} />
        ))}
      </View>

      {cultivo && (
        <View style={{ gap: 4 }}>
          <View style={estilos.etiquetas}>
            <Etiqueta
              texto={cultivo.rotulo}
              fundo={p.cultivo === 'convencional' ? undefined : cores.destaque}
            />
          </View>
          <Texto variante="legenda">
            {p.cultivo === 'organico_certificado' && p.certificacao
              ? `Certificação: ${p.certificacao}`
              : cultivo.detalhe}
          </Texto>
        </View>
      )}

      {p.descricao && <Texto>{p.descricao}</Texto>}

      <View style={{ gap: 12 }}>
        {p.contato.whatsapp && (
          <Botao
            titulo="Chamar no WhatsApp"
            onPress={() => void Linking.openURL(linkWhatsApp(p.contato.whatsapp!, p.nome))}
          />
        )}
        {p.contato.instagram && (
          <Botao
            titulo={`Instagram @${p.contato.instagram}`}
            variante="secundario"
            onPress={() => void Linking.openURL(`https://instagram.com/${p.contato.instagram}`)}
          />
        )}
      </View>

      <Secao titulo="O que vende">
        <Texto>{p.produtos.join(' · ')}</Texto>
      </Secao>

      <Secao titulo="Onde comprar">
        <View style={{ gap: 10 }}>
          {p.locais.map((l, i) => (
            <CartaoLocal
              key={i}
              local={l}
              km={posicao ? distanciaKm(posicao, l) : null}
              nomeProdutor={p.nome}
            />
          ))}
        </View>
      </Secao>

      {p.entrega && (
        <Secao titulo="Entrega">
          <Texto>{p.entrega}</Texto>
        </Secao>
      )}

      <Texto variante="legenda">
        {p.visitadoEm
          ? `Visitado pelo autor do app em ${new Date(`${p.visitadoEm}T12:00:00`).toLocaleDateString('pt-BR')}. `
          : 'Cadastrado a pedido do produtor e conferido pelo autor do app. '}
        Produtos, preços e horários podem mudar: confirme pelo contato antes de ir.
      </Texto>
    </ScrollView>
  );
}

function CartaoLocal({
  local: l,
  km,
  nomeProdutor,
}: {
  local: ProducerPlace;
  km: number | null;
  nomeProdutor: string;
}) {
  const aproximada = l.precisao === 'aproximada';
  return (
    <View style={estilos.local}>
      <View style={estilos.linha}>
        <Texto variante="pixel" style={{ fontSize: 10, flex: 1 }}>
          {TIPO_LOCAL[l.tipo].toLocaleUpperCase('pt-BR')}
        </Texto>
        {km !== null && <Texto style={estilos.distancia}>{formatarDistancia(km)}</Texto>}
      </View>
      {l.nome && <Texto variante="subtitulo">{l.nome}</Texto>}
      <Texto variante="apoio">{[l.endereco, l.cidade].filter(Boolean).join(' · ')}</Texto>
      {l.horario && <Texto>{l.horario}</Texto>}
      {aproximada ? (
        <Texto variante="legenda">
          Posição aproximada, a pedido do produtor. Combine o endereço pelo contato.
        </Texto>
      ) : (
        <Pressable
          onPress={() => void Linking.openURL(rota(l, l.nome ?? nomeProdutor))}
          accessibilityRole="link"
          hitSlop={10}
        >
          <Texto style={estilos.link}>Como chegar</Texto>
        </Pressable>
      )}
    </View>
  );
}

/** Rota no app de mapas do aparelho (Apple Maps no iPhone, Google Maps no Android). */
function rota({ latitude, longitude }: ProducerPlace, nome: string): string {
  const destino = `${latitude},${longitude}`;
  return Platform.OS === 'ios'
    ? `https://maps.apple.com/?daddr=${destino}&q=${encodeURIComponent(nome)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}

const estilos = StyleSheet.create({
  estado: { padding: espaco.margemTela },
  conteudo: { padding: espaco.margemTela, paddingTop: 8, gap: 20, paddingBottom: 48 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  local: { borderWidth: espaco.borda, borderColor: cores.tinta, padding: 14, gap: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distancia: { fontFamily: fontes.textoNegrito, fontSize: 14 },
  link: {
    fontFamily: fontes.textoNegrito,
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
