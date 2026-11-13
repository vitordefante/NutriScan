import type { Alert, AnalysisHighlights, NutriScoreLetter } from '@nutriscan/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import { cores, coresNova, coresNutriScore, espaco, fontes } from '@/theme/tokens';

/** Seção da tela de resultado: título pixel em caixa alta + conteúdo. */
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.secao}>
      <Texto variante="secao" accessibilityRole="header">
        {titulo.toLocaleUpperCase('pt-BR')}
      </Texto>
      {children}
    </View>
  );
}

/** Avisos "alto em" da rotulagem frontal (lupa da ANVISA). */
export function LupaAnvisa({ avisos }: { avisos: AnalysisHighlights['lupa'] }) {
  return (
    <View style={{ gap: 8 }}>
      {avisos.map((aviso) => (
        <View key={aviso.nutriente} style={estilos.lupa}>
          <IconePixel nome="lupa" cor={cores.papel} />
          <View style={{ flex: 1, gap: 4 }}>
            <Texto variante="pixel" cor={cores.papel} style={{ fontSize: 13 }}>
              {aviso.titulo.toLocaleUpperCase('pt-BR')}
            </Texto>
            <Texto variante="apoio" cor={cores.textoSobreTinta}>
              {aviso.detalhe}
              {aviso.estimado ? ' · estimado' : ''}
            </Texto>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Grupo NOVA: nome e quadradinhos na cor do grupo. */
export function CartaoNova({ nova }: { nova: NonNullable<AnalysisHighlights['nova']> }) {
  const cor = coresNova[nova.grupo];
  return (
    <View style={estilos.cartao}>
      <View style={estilos.linhaNova}>
        <Texto variante="subtitulo" style={{ flex: 1 }}>
          Grupo {nova.grupo} ·{' '}
          <Texto variante="subtitulo" cor={cor}>
            {nova.nome}
          </Texto>
        </Texto>
        <View style={estilos.blocos} accessible={false}>
          {[1, 2, 3, 4].map((g) => (
            <View
              key={g}
              style={[estilos.bloco, { backgroundColor: g <= nova.grupo ? cor : cores.vazio }]}
            />
          ))}
        </View>
      </View>
      {/* O motivo já diz quando o grupo foi estimado (ex.: "Estimado pela categoria…"). */}
      <Texto variante="apoio">{nova.motivo}</Texto>
    </View>
  );
}

const LETRAS: NutriScoreLetter[] = ['A', 'B', 'C', 'D', 'E'];

/** Escala A–E com a letra do produto em destaque. */
export function EscalaNutriScore({ letra }: { letra: NutriScoreLetter }) {
  return (
    <View
      style={estilos.escala}
      accessible
      accessibilityLabel={`Nutri-Score ${letra}, numa escala de A (melhor) a E (pior)`}
    >
      {LETRAS.map((l) => {
        const atual = l === letra;
        return (
          <View
            key={l}
            style={[
              estilos.letra,
              {
                height: atual ? 56 : 40,
                backgroundColor: atual ? coresNutriScore[l] : cores.papel,
              },
            ]}
          >
            <Texto variante="pixel" style={{ fontSize: atual ? 24 : 16 }}>
              {l}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}

const SEVERIDADE: Record<Alert['severidade'], { rotulo: string; fundo: string }> = {
  alto: { rotulo: 'ALTO', fundo: cores.coral },
  moderado: { rotulo: 'MODERADO', fundo: cores.coralClaro },
  baixo: { rotulo: 'BAIXO', fundo: cores.vazio },
};

export function CartaoAlerta({ alerta }: { alerta: Alert }) {
  const severidade = SEVERIDADE[alerta.severidade];
  return (
    <View style={[estilos.cartao, estilos.alerta]}>
      <IconePixel nome="alerta" />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={estilos.tituloAlerta}>
          <Texto variante="subtitulo" style={{ fontSize: 16 }}>
            {alerta.titulo}
          </Texto>
          <View style={[estilos.severidade, { backgroundColor: severidade.fundo }]}>
            <Texto variante="pixel" style={{ fontSize: 10 }}>
              {severidade.rotulo}
            </Texto>
          </View>
        </View>
        <Texto style={{ fontSize: 14, lineHeight: 20 }}>{alerta.descricao}</Texto>
        {alerta.ingredientes && alerta.ingredientes.length > 0 && (
          <Texto variante="apoio">
            <Texto variante="apoio" style={{ fontFamily: fontes.textoNegrito }}>
              No rótulo:
            </Texto>{' '}
            {alerta.ingredientes.join(', ')}
          </Texto>
        )}
        {alerta.estimado && (
          <Texto variante="legenda">Exposição potencial: inferida, não medida no produto.</Texto>
        )}
        <Texto variante="legenda">Fonte: {alerta.fonte}</Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: 12 },
  cartao: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    padding: 16,
    gap: 12,
  },
  lupa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cores.tinta,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linhaNova: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  blocos: { flexDirection: 'row', gap: 3 },
  bloco: { width: 14, height: 14, borderWidth: espaco.borda, borderColor: cores.tinta },
  escala: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  letra: {
    flex: 1,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alerta: { flexDirection: 'row', gap: 14 },
  tituloAlerta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  severidade: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
