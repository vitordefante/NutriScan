# Nutrição: macros, vitaminas e minerais

A tela de cada alimento mostra, além da nota, **o que o produto tem**. É informação: nada disto entra na nota (ver `metodologia-nota.md`).

Código: `api/src/modules/nutricao/` (regras e dados, com testes) e `app/src/components/resultado/nutricao.tsx` (tela).

## 1. Macronutrientes (anel de energia)

- **Valores:** carboidratos, proteínas e gorduras totais por 100 g/ml. Vêm do Open Food Facts (`carbohydrates_100g`, `proteins_100g`, `fat_100g`) ou da foto da tabela, lida no aparelho.
- **Anel:** mostra **de onde vêm as calorias**. Cada macro conta pela energia que dá: 4 kcal/g para carboidrato e proteína, 9 kcal/g para gordura (fatores de Atwater, os da rotulagem). Por isso a proporção é a mesma na porção e em 100 g.
- **Centro do anel:** as kcal do rótulo. Sem elas, a soma pelos macros.
- **Porção:**
  - Vem do rótulo. O Open Food Facts quase nunca traz `serving_quantity` dos produtos brasileiros, mas guarda os valores "por porção". A porção sai da razão entre eles (ex.: 17 g de carboidratos na porção e 28,3 g em 100 g → porção de 60 g).
  - Na foto da tabela, é a linha "Porção de 30 g".
  - Porções fora de 1–1000 g são descartadas.
  - Sem porção, a tela mostra só "em 100 g".

## 2. Vitaminas e minerais declarados

- **Origem:** os micronutrientes que o rótulo declara, registrados no Open Food Facts. A base guarda tudo em gramas por 100 g; a API converte para mg ou µg.
- **Valores descartados:**
  - acima de 20 vezes o VDR em 100 g, porque é erro de cadastro (ex.: miligramas digitados como gramas);
  - valores "preparados" (`_prepared_100g`).
- **%VD:** percentual do **valor diário de referência para adultos**. Fonte: ANVISA, Instrução Normativa nº 75/2020, Anexo II ("alimentos em geral"), conferido no texto oficial. Os valores estão em `micronutrientes.ts`.
- **Quando aparecem:** no Brasil, vitaminas e minerais só são obrigatórios no rótulo quando o produto faz alegação ou é fortificado. Por isso muitos alimentos não declaram nenhum, e a tela diz isso.

## 3. Típicos deste alimento (estimativa pela TACO)

Para alimentos simples, a tela mostra os micronutrientes que **esse tipo de alimento** costuma ter. Por exemplo: aveia é fonte de B1, ferro e magnésio; feijão, de ferro, magnésio e potássio.

- **Fonte:** Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada, NEPA–UNICAMP, 2011. A reprodução é permitida citando a fonte. Os valores, por 100 g da parte comestível, foram gerados da versão digital da TACO e conferidos por amostragem com o PDF oficial.
- **Como o produto é ligado a um alimento da TACO:**
  - Por **categorias específicas do Open Food Facts** (`taco.ts`), sempre a mais específica primeiro (ex.: feijão preto antes de "feijões").
  - Categorias que descartam a regra: creme de leite e leite condensado não viram "leite".
  - Doces, chocolates, biscoitos e pratos prontos nunca recebem estimativa.
  - Não se usa a classificação NOVA: o leite UHT integral é NOVA 4 no Open Food Facts por causa do estabilizante e ficaria de fora.
- **Quais aparecem:** os que dão **pelo menos 15% do VDR**, a régua de "fonte" da ANVISA. A conta usa a porção ou 100 g, o que for maior: um copo de leite (200 ml) é fonte de cálcio, 100 ml não. Aparecem no máximo 6.
- **Sem repetição:** o que o rótulo já declara não se repete como típico, porque o valor medido no produto vale mais que a estimativa.
- **Na tela:** sempre com o aviso "Estimativa pela TACO (UNICAMP) para '…', não medida neste produto", o valor com "≈" e a barra em cinza, para não se confundir com o declarado.

## 4. No log de consumo

Com conta, "Registrar consumo" grava também **quanto** foi consumido e o que isso dá.

- **Quantidade:** o toque em "Registrar consumo" abre um popup "Quanto você consumiu?", com as kcal da quantidade escolhida, Cancelar e Registrar. Tocar fora do popup também cancela. Os botões − e + mudam de meia em meia porção (sem porção no rótulo, de 50 em 50 g/ml). O padrão é 1 porção, ou 100 g. A API aceita até 5 kg.
- **O que fica guardado** (`registros.nutricao`): a quantidade, a porção do momento, os macros dessa quantidade, os micronutrientes declarados e os típicos da TACO, separados. É uma foto do momento, como o resto do registro: se a base mudar depois, o registro não muda.
- **Resumo do período** (aba Histórico → Meu consumo): **média por dia com registro**, no horário de Brasília. Não divide pelos 7 ou 30 dias do período: quem registrou só 2 dias pareceria comer pouco nos dias em que esqueceu de registrar.
  - Anel de energia com kcal, carboidratos, proteínas e gorduras por dia, mais açúcares, fibras, saturadas e sódio.
  - Vitaminas e minerais com %VD por dia, do maior para o menor. Quando parte do valor vem da TACO, aparece "≈" e a barra cinza.
- **Limites, ditos na tela:** só entra o que foi registrado, e só alimentos com tabela. Como a maioria dos rótulos não declara vitaminas e minerais, o total real tende a ser maior.
- Código: `api/src/modules/nutricao/consumo.ts` (com testes) e `app/src/components/historico/nutricao-consumo.tsx`.

## Limites conhecidos

- A TACO não tem vitamina B12, D, E, folato nem selênio.
- A TACO descreve o alimento cru (ex.: feijão cru), que é o que a embalagem contém. O cozimento muda os valores por 100 g.
- Produtos sem categoria no Open Food Facts (ex.: só lidos por foto) não recebem estimativa.
