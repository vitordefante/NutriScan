import type { ExposureSummary, FrontLabelNutrient } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { BarraHp } from '@/components/ui/barra-hp';
import { CartaoEmPilha } from '@/components/ui/cartao-em-pilha';
import { Texto } from '@/components/ui/texto';
import { coresNova, faixas, fontes } from '@/theme/tokens';

const NUTRIENTE: Record<FrontLabelNutrient, string> = {
  acucar_adicionado: 'açúcar adicionado',
  gordura_saturada: 'gordura saturada',
  sodio: 'sódio',
};

/** Resumo do período: nota média, ultraprocessados, "alto em" e alertas mais frequentes. */
export function ResumoConsumo({ resumo: r }: { resumo: ExposureSummary }) {
  const titulo = `Últimos ${r.dias} dias · ${r.registros} ${r.registros === 1 ? 'registro' : 'registros'}`;
  const pct = r.comNova > 0 ? Math.round((r.ultraprocessados / r.comNova) * 100) : null;

  return (
    <CartaoEmPilha style={estilos.cartao}>
      <Texto variante="pixel" style={{ fontSize: 11 }}>
        {titulo.toLocaleUpperCase('pt-BR')}
      </Texto>

      {/* Médias separadas: alimentos e cosméticos são avaliados por réguas diferentes. */}
      {r.mediaAlimentos && <Media titulo="Nota média dos alimentos" media={r.mediaAlimentos} />}
      {r.mediaCosmeticos && <Media titulo="Nota média dos cosméticos" media={r.mediaCosmeticos} />}

      {pct !== null && (
        <View style={estilos.linha}>
          <Texto variante="apoio" style={{ flex: 1 }}>
            Ultraprocessados (NOVA 4)
          </Texto>
          <Texto style={[estilos.valor, pct > 0 && { color: coresNova[4] }]}>
            {r.ultraprocessados} de {r.comNova} · {pct}%
          </Texto>
        </View>
      )}

      {r.altoEm.length > 0 && (
        <Bloco titulo="“Alto em” (lupa da ANVISA)">
          {r.altoEm.map((a) => `${NUTRIENTE[a.nutriente]} ×${a.vezes}`).join(' · ')}
        </Bloco>
      )}
      {r.aditivos.length > 0 && (
        <Bloco titulo="Aditivos de atenção mais frequentes">
          {r.aditivos.map((a) => `${a.titulo} ×${a.vezes}`).join(' · ')}
        </Bloco>
      )}
      {r.ingredientesAtencao.length > 0 && (
        <Bloco titulo="Cosméticos: ingredientes de atenção">
          {r.ingredientesAtencao.map((a) => `${a.titulo} ×${a.vezes}`).join(' · ')}
        </Bloco>
      )}

      <Texto variante="legenda">
        Cada registro guarda a análise do momento em que foi feito (mesma metodologia da nota).
      </Texto>
    </CartaoEmPilha>
  );
}

function Media({
  titulo,
  media,
}: {
  titulo: string;
  media: NonNullable<ExposureSummary['mediaAlimentos']>;
}) {
  const cor = faixas[media.faixa];
  return (
    <View style={{ gap: 8 }}>
      <View style={estilos.linha}>
        <Texto variante="apoio" style={{ flex: 1 }}>
          {titulo}
        </Texto>
        <Texto style={[estilos.numero, { color: cor.texto }]}>{media.nota}</Texto>
      </View>
      <BarraHp valor={media.nota} cor={cor.preenchimento} altura={10} />
    </View>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Texto variante="apoio">{titulo}</Texto>
      <Texto style={{ fontSize: 15, lineHeight: 21 }}>{children}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { padding: 18, gap: 16 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numero: { fontFamily: fontes.pixel, fontSize: 28, lineHeight: 30 },
  valor: { fontFamily: fontes.textoNegrito, fontSize: 15 },
});
