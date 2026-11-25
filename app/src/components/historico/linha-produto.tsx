import type { ProductKind, ScoreBand } from '@nutriscan/shared';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FotoProduto } from '@/components/ui/foto-produto';
import { Texto } from '@/components/ui/texto';
import { iconeDoProduto } from '@/lib/icone-produto';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

type Props = {
  nome: string;
  /** O histórico não guarda a categoria: sem foto, o ícone é o do tipo. */
  tipo: ProductKind;
  imagemUrl?: string;
  nota: number | null;
  faixa: ScoreBand | null;
  /** Linha de apoio (ex.: "Hellmann's · hoje, 14:32"). */
  detalhe: string;
  onPress: () => void;
  /** Ação extra à direita (ex.: apagar o registro). */
  acao?: ReactNode;
};

/** Linha de uma lista de produtos (histórico, log): foto, nome, detalhe e a nota. */
export function LinhaProduto({
  nome,
  tipo,
  imagemUrl,
  nota,
  faixa,
  detalhe,
  onPress,
  acao,
}: Props) {
  const cor = faixa ? faixas[faixa] : null;
  return (
    <View style={estilos.linha}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${nome}, ${nota === null ? 'sem nota' : `nota ${nota}`}. ${detalhe}. Abrir análise.`}
        style={({ pressed }) => [estilos.toque, pressed && { backgroundColor: cores.vazio }]}
      >
        <FotoProduto url={imagemUrl} icone={iconeDoProduto(tipo)} style={estilos.foto} />
        <View style={estilos.textos}>
          <Texto variante="subtitulo" style={estilos.nome} numberOfLines={2}>
            {nome}
          </Texto>
          <Texto variante="legenda" numberOfLines={2}>
            {detalhe}
          </Texto>
        </View>
        <View style={[estilos.nota, cor && { backgroundColor: cor.preenchimento }]}>
          <Texto variante="pixel" style={estilos.numero}>
            {nota ?? '–'}
          </Texto>
        </View>
      </Pressable>
      {acao}
    </View>
  );
}

/** "hoje, 14:32", "ontem, 09:10" ou "12/11, 18:00". */
export function quando(iso: string, agora = new Date()): string {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diferenca = Math.round((dia(agora) - dia(d)) / 86_400_000);
  if (diferenca === 0) return `hoje, ${hora}`;
  if (diferenca === 1) return `ontem, ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hora}`;
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toque: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    padding: 10,
  },
  foto: { width: 44, height: 44, borderWidth: espaco.borda, borderColor: cores.tinta },
  textos: { flex: 1, gap: 2 },
  nome: { fontSize: 15, lineHeight: 19 },
  nota: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 6,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.vazio,
  },
  numero: { fontFamily: fontes.pixel, fontSize: 14 },
});
