import type { LogEntry } from '@nutriscan/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LinhaProduto, quando } from '@/components/historico/linha-produto';
import { ResumoConsumo } from '@/components/historico/resumo-consumo';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Seletor } from '@/components/ui/seletor';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { useLogConsumo } from '@/hooks/use-log-consumo';
import { useHistoricoLocal } from '@/lib/historico-local';
import { useSessao } from '@/lib/sessao';
import { sincronizarHistorico } from '@/lib/sincronizacao';
import { cores, espaco, fontes } from '@/theme/tokens';

type Aba = 'escaneados' | 'consumo';
const ABAS = [
  { valor: 'escaneados', rotulo: 'Escaneados' },
  { valor: 'consumo', rotulo: 'Meu consumo' },
] as const satisfies readonly { valor: Aba; rotulo: string }[];

type Periodo = '7' | '30';
const PERIODOS = [
  { valor: '7', rotulo: '7 dias' },
  { valor: '30', rotulo: '30 dias' },
] as const satisfies readonly { valor: Periodo; rotulo: string }[];

const abrir = (barcode: string) =>
  router.push({ pathname: '/produto/[barcode]', params: { barcode } });

/** Aba Histórico: produtos escaneados (no aparelho e na conta) e o log de consumo. */
export default function TelaHistorico() {
  const [aba, setAba] = useState<Aba>('escaneados');
  return (
    <Tela comAbas>
      <CabecalhoTela titulo="HISTÓRICO" />
      <ScrollView contentContainerStyle={estilos.conteudo} contentInsetAdjustmentBehavior="never">
        <Seletor opcoes={ABAS} valor={aba} onMudar={setAba} rotuloAcessivel="Histórico" />
        {aba === 'escaneados' ? <Escaneados /> : <Consumo />}
      </ScrollView>
    </Tela>
  );
}

function Escaneados() {
  const itens = useHistoricoLocal();
  // Ao abrir a aba, traz também o que foi escaneado em outros aparelhos da conta.
  useFocusEffect(
    useCallback(() => {
      void sincronizarHistorico();
    }, []),
  );
  const sessao = useSessao();
  if (itens === null) return null;
  return (
    <>
      {itens.length === 0 ? (
        <Texto variante="apoio">Os produtos que você escanear aparecem aqui.</Texto>
      ) : (
        <View style={{ gap: 10 }}>
          {itens.map((i) => (
            <LinhaProduto
              key={i.barcode}
              nome={i.nome}
              {...(i.imagemUrl && { imagemUrl: i.imagemUrl })}
              nota={i.nota}
              faixa={i.faixa}
              detalhe={[i.marca, quando(i.escaneadoEm)].filter(Boolean).join(' · ')}
              onPress={() => abrir(i.barcode)}
            />
          ))}
        </View>
      )}
      {sessao.status === 'anonimo' && itens.length > 0 && (
        <Texto variante="legenda">
          Este histórico está só neste aparelho. Entre na sua conta (aba Perfil) para guardá-lo.
        </Texto>
      )}
    </>
  );
}

function Consumo() {
  const [periodo, setPeriodo] = useState<Periodo>('7');
  const { estado, recarregar, apagar } = useLogConsumo(Number(periodo));

  if (estado.status === 'sem_conta') {
    return (
      <View style={{ gap: 16 }}>
        <Texto variante="apoio">
          Registre o que você consome (botão na tela do produto) e veja aqui o resumo da semana:
          nota média, quantos ultraprocessados, “alto em” e aditivos mais frequentes. Precisa de uma
          conta.
        </Texto>
        <Botao titulo="Entrar ou criar conta" onPress={() => router.navigate('/perfil')} />
      </View>
    );
  }

  return (
    <>
      <Seletor opcoes={PERIODOS} valor={periodo} onMudar={setPeriodo} rotuloAcessivel="Período" />

      {estado.status === 'carregando' && <Texto variante="apoio">Carregando…</Texto>}

      {estado.status === 'erro' && (
        <View style={estilos.linhaErro}>
          <Texto variante="apoio" style={{ flex: 1 }}>
            Não deu para carregar o seu log agora.
          </Texto>
          <Pressable onPress={recarregar} accessibilityRole="button" hitSlop={10}>
            <Texto style={estilos.link}>Tentar de novo</Texto>
          </Pressable>
        </View>
      )}

      {estado.status === 'pronto' &&
        (estado.registros.length === 0 ? (
          <Texto variante="apoio">
            Nenhum registro nos últimos {periodo} dias. Na tela de um produto, toque em “Registrar
            consumo”.
          </Texto>
        ) : (
          <>
            <ResumoConsumo resumo={estado.resumo} />
            <Texto variante="secao">REGISTROS</Texto>
            <View style={{ gap: 10 }}>
              {estado.registros.map((r) => (
                <LinhaRegistro key={r.id} registro={r} onApagar={() => apagar(r.id)} />
              ))}
            </View>
          </>
        ))}
    </>
  );
}

function LinhaRegistro({
  registro: r,
  onApagar,
}: {
  registro: LogEntry;
  onApagar: () => Promise<void>;
}) {
  function confirmar() {
    Alert.alert('Apagar este registro?', `${r.nome} · ${quando(r.registradoEm)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () =>
          void onApagar().catch(() =>
            Alert.alert('Não foi possível apagar agora', 'Confira a conexão e tente de novo.'),
          ),
      },
    ]);
  }
  return (
    <LinhaProduto
      nome={r.nome}
      {...(r.imagemUrl && { imagemUrl: r.imagemUrl })}
      nota={r.nota}
      faixa={r.faixa}
      detalhe={`${r.tipo === 'cosmetico' ? 'Uso' : 'Consumo'} · ${quando(r.registradoEm)}`}
      onPress={() => abrir(r.barcode)}
      acao={
        <Pressable
          onPress={confirmar}
          accessibilityRole="button"
          accessibilityLabel={`Apagar o registro de ${r.nome}`}
          hitSlop={8}
          style={estilos.apagar}
        >
          <Texto variante="pixel" style={{ fontSize: 14 }}>
            ×
          </Texto>
        </Pressable>
      }
    />
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingHorizontal: espaco.margemTela, paddingTop: 8, paddingBottom: 48, gap: 20 },
  linhaErro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
  apagar: {
    width: 36,
    height: 36,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
