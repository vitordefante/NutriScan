import type { NutritionFacts, ProductKind } from '@nutriscan/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/botao';
import { Texto } from '@/components/ui/texto';
import { useRegistrarConsumo } from '@/hooks/use-registrar-consumo';
import { descreverConsumo } from '@/lib/nutricao';
import { useSessao } from '@/lib/sessao';
import { fontes } from '@/theme/tokens';

import { EscolherQuantidade } from './escolher-quantidade';

type Props = { barcode: string; tipo: ProductKind; nome: string; nutricao?: NutritionFacts };

/**
 * "Registrar consumo" (alimento) / "Registrar uso" (cosmético), com data e hora de agora. Em
 * alimentos com tabela, o toque abre o popup "Quanto você consumiu?" e o registro guarda os macros
 * e as vitaminas dessa quantidade; nos demais, 1 toque registra.
 */
export function RegistrarConsumo({ barcode, tipo, nome, nutricao }: Props) {
  const sessao = useSessao();
  const { estado, registrarAgora } = useRegistrarConsumo(barcode);
  const [escolhendo, setEscolhendo] = useState(false);
  const acao = tipo === 'cosmetico' ? 'uso' : 'consumo';
  const comQuantidade = tipo === 'alimento' && nutricao !== undefined;

  if (sessao.status !== 'conectado') {
    return (
      <View style={estilos.bloco}>
        <Botao
          titulo={`Registrar ${acao}`}
          variante="secundario"
          onPress={() => router.navigate('/perfil')}
        />
        <Texto variante="legenda" style={estilos.centro}>
          Entre na sua conta (aba Perfil) para registrar o que você{' '}
          {tipo === 'cosmetico' ? 'usa' : 'consome'} e ver o resumo da semana.
        </Texto>
      </View>
    );
  }

  if (estado.status === 'feito') {
    const n = estado.registro.nutricao;
    return (
      <View style={estilos.feito} accessibilityLiveRegion="polite">
        <Texto style={{ flex: 1 }}>
          ✓ {n ? `${descreverConsumo(n.quantidade, n.unidade, n.porcao)} no` : 'Registrado no'} seu{' '}
          {acao} de hoje.
        </Texto>
        <Pressable
          onPress={() => router.navigate('/historico')}
          accessibilityRole="link"
          hitSlop={10}
        >
          <Texto style={estilos.link}>Ver resumo</Texto>
        </Pressable>
      </View>
    );
  }

  const enviando = estado.status === 'enviando';
  const erro = estado.status === 'erro' ? estado.mensagem : undefined;

  return (
    <View style={estilos.bloco}>
      <Botao
        titulo={enviando && !escolhendo ? 'Registrando…' : `Registrar ${acao}`}
        variante="secundario"
        onPress={() => (comQuantidade ? setEscolhendo(true) : void registrarAgora())}
        desabilitado={enviando}
      />
      {/* Com o popup aberto, o erro aparece dentro dele. */}
      {erro && !escolhendo && (
        <Texto variante="legenda" style={estilos.centro} accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      )}
      {comQuantidade && nutricao && (
        <EscolherQuantidade
          visivel={escolhendo}
          nome={nome}
          nutricao={nutricao}
          enviando={enviando}
          {...(erro && { erro })}
          onCancelar={() => setEscolhendo(false)}
          onRegistrar={(q) => void registrarAgora(q)}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 8 },
  centro: { textAlign: 'center' },
  feito: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
});
