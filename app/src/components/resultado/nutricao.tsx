import type { Macronutrients, Micronutrient, NutritionFacts } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { Seletor } from '@/components/ui/seletor';
import { Texto } from '@/components/ui/texto';
import {
  type BaseNutricao,
  divisaoDaEnergia,
  energia,
  fatorDaBase,
  formatarNumero,
  type Macro,
  ORDEM_MACROS,
  pctVd,
  rotuloDaBase,
} from '@/lib/nutricao';
import { cores, coresMacros, espaco, fontes } from '@/theme/tokens';

import { AnelMacros } from './anel-macros';
import { Secao } from './secoes';

const NOME_MACRO: Record<Macro, string> = {
  carboidratos: 'Carboidratos',
  proteinas: 'Proteínas',
  gorduras: 'Gorduras',
};

type Props = { nutricao: NutritionFacts; base: BaseNutricao; onBase: (b: BaseNutricao) => void };

/** Anel de energia (de onde vêm as calorias) e as quantidades na porção ou em 100 g/ml. */
export function SecaoMacros({ nutricao, base, onBase }: Props) {
  return (
    <Secao
      titulo={
        nutricao.porcao ? 'O que tem na porção' : `O que tem em ${rotuloDaBase(nutricao, '100')}`
      }
    >
      {nutricao.porcao ? (
        <Seletor
          opcoes={[
            { valor: 'porcao', rotulo: `Porção · ${rotuloDaBase(nutricao, 'porcao')}` },
            { valor: '100', rotulo: `100 ${nutricao.unidade}` },
          ]}
          valor={base}
          onMudar={onBase}
          rotuloAcessivel="Mostrar valores por"
        />
      ) : null}
      <PainelMacros
        macros={nutricao.por100}
        fator={fatorDaBase(nutricao, base)}
        rotulo={rotuloDaBase(nutricao, base)}
      />
    </Secao>
  );
}

/**
 * Anel de energia + gramas de cada macro + açúcares, fibras, saturadas e sódio. `macros` × `fator`
 * dá os valores mostrados; `rotulo` diz em quê ("30 g", "por dia").
 */
export function PainelMacros({
  macros: p,
  fator,
  rotulo,
  tamanho = 140,
}: {
  macros: Macronutrients;
  fator: number;
  rotulo: string;
  tamanho?: number;
}) {
  const divisao = divisaoDaEnergia(p);
  const kcal = energia(p, fator);
  const secundarios = [
    p.acucares !== undefined && `Açúcares ${gramas(p.acucares * fator)}`,
    p.fibras !== undefined && `Fibras ${gramas(p.fibras * fator)}`,
    p.gordurasSaturadas !== undefined && `Gord. saturadas ${gramas(p.gordurasSaturadas * fator)}`,
    p.sodioMg !== undefined && `Sódio ${formatarNumero(p.sodioMg * fator)} mg`,
  ].filter(Boolean);

  return (
    <>
      <View
        style={estilos.linha}
        accessible
        accessibilityLabel={descricaoAcessivel(p, divisao, kcal, rotulo, fator)}
      >
        <AnelMacros
          divisao={divisao}
          tamanho={tamanho}
          valor={kcal === null ? '—' : formatarNumero(Math.round(kcal))}
          legenda={`kcal · ${rotulo}`}
        />
        <View style={estilos.legendas}>
          {ORDEM_MACROS.map((m) => (
            <View key={m} style={estilos.itemLegenda}>
              <View style={[estilos.amostra, { backgroundColor: coresMacros[m] }]} />
              <View style={{ flex: 1 }}>
                <Texto variante="apoio" style={{ color: cores.tinta }}>
                  {NOME_MACRO[m]}
                </Texto>
                <Texto style={estilos.quantidade}>
                  {p[m] === undefined ? 'sem dado' : gramas(p[m] * fator)}
                  {divisao && p[m] !== undefined ? (
                    <Texto variante="legenda"> · {Math.round(divisao[m] * 100)}% kcal</Texto>
                  ) : null}
                </Texto>
              </View>
            </View>
          ))}
        </View>
      </View>
      {secundarios.length > 0 && <Texto variante="legenda">{secundarios.join(' · ')}</Texto>}
    </>
  );
}

/**
 * Vitaminas e minerais: primeiro os declarados no rótulo (medidos); depois os típicos do tipo de
 * alimento pela TACO, marcados como estimativa. Sem nenhum dos dois, a seção some.
 */
export function SecaoMicros({ nutricao, base }: Omit<Props, 'onBase'>) {
  const { micronutrientes, tipicos } = nutricao;
  if (micronutrientes.length === 0 && !tipicos) return null;
  const fator = fatorDaBase(nutricao, base);
  const rotulo = rotuloDaBase(nutricao, base);

  return (
    <Secao titulo="Vitaminas e minerais">
      {micronutrientes.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Texto variante="apoio">Declarados no rótulo · em {rotulo}</Texto>
          {micronutrientes.map((m) => (
            <LinhaMicro key={m.id} micro={m} fator={fator} />
          ))}
        </View>
      ) : (
        <Texto variante="apoio">O rótulo não declara vitaminas e minerais.</Texto>
      )}

      {tipicos && (
        <View style={estilos.tipicos}>
          <Texto variante="subtitulo">Típicos deste alimento</Texto>
          <Texto variante="apoio">
            Estimativa pela TACO (UNICAMP) para “{tipicos.alimento}”, não medida neste produto · em{' '}
            {rotulo}
          </Texto>
          {tipicos.itens.map((m) => (
            <LinhaMicro key={m.id} micro={m} fator={fator} estimado />
          ))}
        </View>
      )}

      <Texto variante="legenda">
        %VD: percentual do valor diário de referência para adultos (ANVISA, IN 75/2020).
      </Texto>
    </Secao>
  );
}

const BLOCOS_VD = 10;

/** Uma vitamina/mineral: nome, quantidade (× fator), %VD e barra de 10 blocos (cinza se estimado). */
export function LinhaMicro({
  micro,
  fator,
  estimado = false,
}: {
  micro: Micronutrient;
  fator: number;
  estimado?: boolean;
}) {
  const pct = pctVd(micro, fator);
  const cheios = Math.min(BLOCOS_VD, Math.round(pct / (100 / BLOCOS_VD)));
  const quantidade = `${estimado ? '≈ ' : ''}${formatarNumero(micro.quantidade * fator)} ${micro.unidade}`;
  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityLabel={`${micro.nome}: ${quantidade}, ${pct}% do valor diário${estimado ? ', estimado' : ''}`}
    >
      <View style={estilos.linhaMicro}>
        <Texto style={{ flex: 1 }}>{micro.nome}</Texto>
        <Texto variante="apoio">{quantidade}</Texto>
        <Texto style={estilos.pct}>{pct}%</Texto>
      </View>
      <View style={estilos.barra}>
        {Array.from({ length: BLOCOS_VD }, (_, i) => (
          <View
            key={i}
            style={[
              estilos.bloco,
              {
                backgroundColor:
                  i < cheios ? (estimado ? cores.grafite : cores.tinta) : cores.vazio,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function gramas(v: number): string {
  return `${formatarNumero(v)} g`;
}

function descricaoAcessivel(
  macros: Macronutrients,
  divisao: Record<Macro, number> | null,
  kcal: number | null,
  rotulo: string,
  fator: number,
): string {
  const partes = ORDEM_MACROS.filter((m) => macros[m] !== undefined).map(
    (m) =>
      `${NOME_MACRO[m]} ${gramas(macros[m]! * fator)}${divisao ? `, ${Math.round(divisao[m] * 100)}% das calorias` : ''}`,
  );
  return `Em ${rotulo}: ${kcal === null ? 'energia sem dado' : `${Math.round(kcal)} kcal`}. ${partes.join('; ')}.`;
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legendas: { flex: 1, gap: 12 },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amostra: { width: 14, height: 14, borderWidth: espaco.borda, borderColor: cores.tinta },
  quantidade: { fontFamily: fontes.textoNegrito, fontSize: 16 },
  tipicos: {
    gap: 12,
    borderTopWidth: espaco.borda,
    borderTopColor: cores.tinta,
    borderStyle: 'dashed',
    paddingTop: 16,
  },
  linhaMicro: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  pct: { fontFamily: fontes.textoNegrito, fontSize: 15, minWidth: 44, textAlign: 'right' },
  barra: { flexDirection: 'row', gap: 2 },
  bloco: { flex: 1, height: 8 },
});
