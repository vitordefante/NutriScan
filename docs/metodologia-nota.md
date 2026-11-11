# Metodologia da nota de alimentos (v1)

> Status: **v1 aprovada em 10/11/2026**. Implementada em `api/src/modules/analise/`.
> Este documento descreve como o NutriScan calcula a nota de 0 a 100 de um alimento.
> Os pesos refletem a visão do autor (viés naturalista, contra ultraprocessados) e são
> publicados aqui justamente para que qualquer pessoa possa discordar deles com base em algo concreto.

## 1. Princípio: a nota é uma barra de HP

Todo alimento começa com **100 pontos**. Cada problema encontrado causa um "dano" (pontos negativos)
e o selo de orgânico dá um pequeno bônus. O resultado é limitado ao intervalo 0–100.

Cada desconto ou bônus vira um item da tela **"Por que essa nota?"**, com o motivo e a fonte.
A nota exibida é exatamente **100 + a soma desses itens**, limitada a 0–100: não há ajuste escondido.
Até o limite de desconto por aditivos aparece como um item próprio.

| Faixa  | Rótulo    |
| ------ | --------- |
| 80–100 | Excelente |
| 60–79  | Bom       |
| 40–59  | Regular   |
| 20–39  | Ruim      |
| 0–19   | Péssimo   |

## 2. Componentes

| Componente                     | Pontos                                                               | Fonte                                                                  |
| ------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Processamento (NOVA)           | NOVA 1: 0 · NOVA 2: −5 · NOVA 3: −15 · **NOVA 4: −45**               | Guia Alimentar para a População Brasileira (MS, 2014); Monteiro et al. |
| Qualidade nutricional          | Nutri-Score A: 0 · B: −5 · C: −12 · D: −22 · E: −32                  | Nutri-Score, algoritmo de 2023 (Santé publique France)                 |
| Rotulagem frontal (lupa)       | −10 para cada "alto em" (açúcar adicionado, gordura saturada, sódio) | ANVISA RDC 429/2020 e IN 75/2020                                       |
| Aditivos de atenção            | alto: −8 · moderado: −4 · baixo: −1 · **limite total: −20**          | ver seção 5                                                            |
| Contaminantes (fase posterior) | −2 por exposição potencial · limite total: −5                        | PARA/ANVISA e outras (por categoria)                                   |
| Orgânico                       | **+5**                                                               | selo de produto orgânico                                               |

### Por que lupa e Nutri-Score descontam juntos

Um produto alto em açúcar perde pontos no Nutri-Score e também na lupa. A duplicidade é
intencional: a lupa é a regra legal brasileira e funciona como um alerta adicional ao Nutri-Score,
que é um índice europeu.

### Por que o NOVA 4 pesa tanto

É a escolha central da metodologia. O Guia Alimentar brasileiro recomenda **evitar**
ultraprocessados, não apenas moderar. Com −45, mesmo um ultraprocessado de bom perfil nutricional
(ex.: pão integral industrializado, Nutri-Score A) fica na faixa Regular.

## 3. Como cada componente é obtido

Os dados vêm do Open Food Facts (OFF), que é colaborativo e frequentemente incompleto ou com erros
nos produtos brasileiros. Por isso o NutriScan calcula os componentes por conta própria sempre que
possível, em vez de copiar os campos prontos do OFF.

### 3.1 NOVA

Ordem de preferência:

1. **Classificação própria a partir da lista de ingredientes**, procurando marcadores de
   ultraprocessamento. Os marcadores encontrados aparecem no motivo
   (ex.: "contém aromatizante e emulsificante").
2. Campo `nova_group` do OFF, se não houver lista de ingredientes em português.
3. **Estimativa pela categoria do OFF** (ex.: refrigerantes, embutidos, margarinas → NOVA 4;
   queijos, pães → NOVA 3; leguminosas, arroz, ovos, água → NOVA 1). As categorias do OFF vão da
   mais geral à mais específica; vale a **mais específica** que tiver estimativa (aveia em flocos é
   marcada também como "cereal matinal", mas a estimativa usada é a de "aveia em flocos").
4. **Estimativa pelo nome do produto**, porque muitos cadastros brasileiros não têm nem categoria
   (ex.: "salsicha", "mortadela", "sorvete", "lasanha" → NOVA 4).
5. Sem nada disso: componente ausente (ver seção 4).

Nos casos 3 e 4 o item da nota informa que a classificação é **estimada**.

Regras da classificação própria:

- **NOVA 4** se houver qualquer marcador:
  - aditivos cosméticos: aromatizante/aroma, corante, emulsificante, espessante, estabilizante,
    gelificante, realçador de sabor, edulcorante/adoçante, glaceante, espumante;
  - ingredientes de uso industrial: xarope de glicose/milho/frutose, açúcar invertido,
    maltodextrina, dextrose, lactose, soro de leite, caseinato, proteína isolada/hidrolisada/texturizada,
    glúten adicionado, amido modificado, gordura vegetal (hidrogenada, interesterificada ou sem
    especificação — no Brasil, o termo designa gorduras industriais).
- **NOVA 2** para ingredientes culinários (óleo, azeite, açúcar, sal, mel, manteiga, vinagre,
  amido), identificados pela categoria, mesmo com adições simples como iodo e antiumectante no sal
  ou sal e fermento na manteiga.
- **NOVA 3** se não houver marcador e houver sal, açúcar, óleo, vinagre ou conservante adicionados a um alimento.
- **NOVA 1** nos demais casos (alimento in natura ou minimamente processado).

> A NOVA do OFF também é inferida por marcadores, mas erra em produtos brasileiros. Exemplos
> encontrados: biscoito recheado com emulsificante e aromatizantes classificado como NOVA 3, e
> queijo frescal (leite, sal e coalho) classificado como NOVA 4.

### 3.2 Nutri-Score

1. Calculado pela API a partir da tabela nutricional (algoritmo de 2023), quando houver os campos necessários.
2. Senão, a letra informada pelo OFF.
3. Sem nenhum dos dois: componente ausente.

Detalhes da implementação:

- São implementadas as tabelas de alimentos em geral e de bebidas (incluindo +4 pontos negativos
  para bebidas com adoçante). Para categorias com regra própria (gorduras, óleos, oleaginosas,
  queijos) usa-se a letra informada pelo OFF.
- O produto é tratado como bebida quando a embalagem está em ml/L ou a categoria é de bebidas
  (exceto pós para preparo, como achocolatado em pó). Sorvetes e similares são sempre sólidos,
  mesmo vendidos em litros, porque a tabela nutricional deles vem por 100 g.
- Água pura (sem sabor, açúcar ou adoçante) recebe A, como no algoritmo oficial; as demais
  bebidas começam em B.
- Antes de buscar marcadores e açúcar, a lista de ingredientes é limpa de frases que não são
  ingredientes ("sem glúten", "sem adição de açúcares", "zero açúcar", avisos de alérgicos).
- Fibras, proteínas e percentual de frutas ausentes contam como zero: a falta de dado nunca melhora a nota.

### 3.3 Lupa ANVISA

Limites por 100 g (sólidos) ou 100 ml (líquidos):

| Nutriente         | Sólidos  | Líquidos |
| ----------------- | -------- | -------- |
| Açúcar adicionado | ≥ 15 g   | ≥ 7,5 g  |
| Gordura saturada  | ≥ 6 g    | ≥ 3 g    |
| Sódio             | ≥ 600 mg | ≥ 300 mg |

O campo "açúcar adicionado" quase nunca está preenchido no OFF. Quando ele faltar e a lista de
ingredientes contiver açúcar, xarope, mel ou similares, usa-se o total de açúcares como estimativa,
e o item informa que é estimado. Sem lista de ingredientes, a mesma estimativa vale para categorias
em que o açúcar é sempre adicionado (refrigerantes, bebidas adoçadas, balas, biscoitos, sorvetes, chocolates).

**Checagem de consistência:** se o açúcar adicionado informado for menor que 1/4 dos açúcares
totais, mas um açúcar estiver entre os 3 primeiros ingredientes (a lista segue a ordem decrescente
de quantidade), o valor informado é descartado e usa-se o total, como estimativa. Casos reais:
leite condensado com 5,5 g informados para 55 g totais; achocolatado com 4,2 g para 42 g.

**Alimentos dispensados da lupa** (IN 75/2020, Anexo XVI, em que a lupa é vedada): não recebem desconto de lupa.

- itens 1–6: frutas, hortaliças, leguminosas, tubérculos, cereais, nozes, castanhas, sementes,
  cogumelos, farinhas, carnes e pescados, ovos, leites fermentados e queijos, **desde que sem
  ingredientes que agreguem açúcar adicionado, gordura saturada ou sódio**. Aproximação usada:
  produto NOVA 1, ou queijo/leite fermentado sem açúcar entre os ingredientes;
- itens 7–10: leites de todas as espécies, leite em pó, azeite e outros óleos vegetais, sal.

O **mel não está na lista**, então recebe a lupa de açúcar adicionado normalmente.

## 4. Dados faltando: nota parcial

Os dois pilares da nota são **processamento** (NOVA) e **nutrição** (Nutri-Score e lupa).

| Situação                    | Resultado                                        |
| --------------------------- | ------------------------------------------------ |
| Os dois pilares disponíveis | Nota completa                                    |
| Só um pilar disponível      | **Nota parcial**, com a lista do que faltou      |
| Nenhum pilar disponível     | "Dados insuficientes", com a lista do que faltou |

Como quase todos os componentes são descontos, **a nota parcial é um teto**: com os dados
completos ela só pode ficar igual ou menor. O app exibe isso ao usuário
(ex.: "Nota parcial: no máximo 34 — falta a tabela nutricional").

## 5. Aditivos de atenção

Regras de soma:

- **Grupos diferentes se somam.** Nitrato (alto, −8) + BHA (alto, −8) = −16.
- **Dentro do mesmo grupo, desconta uma vez só.** Nitrito (E250) + nitrato (E251) = −8, e não −16;
  três fosfatos = um único desconto de −4.
- **O total de aditivos tem limite de −20.** Ex.: uma salsicha com nitrito e nitrato (−8),
  fosfatos (−4), carragena (−4), glutamato (−1) e corante vermelho 40 (−4) somaria −21 e fica em −20.

Aditivos fora da lista (ex.: lecitina, pectina,
ácido cítrico, vitamina C) não descontam. Aromatizantes e emulsificantes em geral já pesam na NOVA
e não descontam de novo aqui; os emulsificantes listados abaixo são exceções com evidência própria.
Formas de vitamina com nome parecido não são confundidas com aditivos: mononitrato/nitrato de
tiamina (B1), riboflavina 5'-fosfato (B2) e fosfato de piridoxal (B6).

| Nível    | Grupo                                   | Códigos                      | Motivo resumido                                                       | Fonte                                                          |
| -------- | --------------------------------------- | ---------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Alto     | Nitritos e nitratos                     | E249, E250, E251, E252       | Formam nitrosaminas; carne processada é cancerígena (Grupo 1)         | IARC Monografia 114 (2018); EFSA (2017)                        |
| Alto     | Dióxido de titânio                      | E171                         | Genotoxicidade não descartada; proibido na União Europeia             | EFSA (2021); Regulamento (UE) 2022/63                          |
| Alto     | BHA                                     | E320                         | Possivelmente cancerígeno (Grupo 2B)                                  | IARC Monografia 40                                             |
| Moderado | Corantes azoicos                        | E102, E110, E122, E124, E129 | Associados a hiperatividade em crianças; exigem aviso na UE           | McCann et al., _Lancet_ (2007); Regulamento (CE) 1333/2008     |
| Moderado | Caramelo amônico                        | E150c, E150d                 | Contém 4-MEI, possivelmente cancerígeno (Grupo 2B)                    | IARC Monografia 101                                            |
| Moderado | BHT                                     | E321                         | Antioxidante sintético com dúvidas sobre efeitos endócrinos           | EFSA (2012)                                                    |
| Moderado | Aspartame                               | E951                         | Possivelmente cancerígeno (Grupo 2B)                                  | IARC (2023)                                                    |
| Moderado | Outros adoçantes artificiais            | E950, E952, E954, E955       | OMS recomenda não usar adoçantes não calóricos                        | OMS, diretriz sobre adoçantes (2023)                           |
| Moderado | Carragena                               | E407, E407a                  | Incertezas sobre inflamação intestinal                                | EFSA (2018)                                                    |
| Moderado | Emulsificantes com efeito na microbiota | E433, E466                   | Alteram a microbiota em estudos; associação com doença cardiovascular | Chassaing et al., _Nature_ (2015); Sellem et al., _BMJ_ (2023) |
| Moderado | Fosfatos adicionados                    | E338–E341, E450–E452         | Ingestão pode exceder a dose segura, especialmente em crianças        | EFSA (2019)                                                    |
| Moderado | Sulfitos                                | E220–E228                    | Podem desencadear reações em pessoas com asma                         | EFSA (2016)                                                    |
| Baixo    | Glutamato e realçadores de sabor        | E621, E627, E631, E635       | Seguro dentro da dose diária; marcador de produto muito processado    | EFSA (2017)                                                    |
| Baixo    | Benzoatos                               | E210–E213                    | Podem formar benzeno junto com vitamina C                             | EFSA (2016)                                                    |
| Baixo    | Sorbatos                                | E200–E203                    | Conservante com dose diária aceitável definida                        | EFSA (2019)                                                    |
| Baixo    | Propionatos                             | E280–E283                    | Conservante com dose diária aceitável definida                        | EFSA (2014)                                                    |
| Baixo    | Polióis                                 | E420, E421, E965, E966, E967 | Efeito laxativo em excesso                                            | EFSA                                                           |

## 6. Exemplos com produtos reais

Notas calculadas sobre os dados do Open Food Facts coletados em 10/11/2026 (amostra de 49 produtos
brasileiros). Os produtos com código de barras na amostra de testes são verificados automaticamente
em `api/src/modules/analise/calibracao.test.ts`: se uma mudança de regra alterar alguma nota, o
teste falha. "≤" indica nota parcial; "est." indica NOVA estimada.

| Produto                          | Nota | Componentes                                                                          |
| -------------------------------- | ---: | ------------------------------------------------------------------------------------ |
| Feijão carioca                   |  100 | NOVA 1, A, isento de lupa                                                            |
| Macarrão de sêmola               |  100 | NOVA 1, A                                                                            |
| Pasta de amendoim integral       |  100 | NOVA 1, A, isento de lupa                                                            |
| Aveia em flocos                  | ≤100 | NOVA 1; falta tabela nutricional                                                     |
| Amido de milho                   |   83 | NOVA 2 −5, C −12                                                                     |
| Milho em conserva                |   73 | NOVA 3 −15, C −12                                                                    |
| Queijo frescal / minas meia cura |   73 | NOVA 3 −15, C −12, isento de lupa                                                    |
| Mel                              |   73 | NOVA 2 −5, C −12, alto em açúcar −10                                                 |
| Granola de frutas e mel          |   63 | NOVA 3 −15, C −12, alto em açúcar −10                                                |
| Cereal matinal açucarado         |  ≤55 | NOVA 4 (est.) −45; falta tabela nutricional                                          |
| Pão de forma integral            |   53 | NOVA 4 −45 (glúten adicionado), A, conservantes −2                                   |
| Batata palha                     |   53 | NOVA 3 −15, D −22, alto em gordura saturada −10                                      |
| Bebida de soja                   |   50 | NOVA 4 (est.) −45, B −5                                                              |
| Leite UHT integral               |   46 | NOVA 4 −45 (estabilizantes), B −5, fosfatos −4                                       |
| Lasanha congelada                |   43 | NOVA 4 (est.) −45, C −12                                                             |
| Catchup                          |   43 | NOVA 3 −15, E −32, alto em sódio −10                                                 |
| Queijo cottage                   |   42 | NOVA 4 −45 (espessantes), C −12, sorbato −1                                          |
| Sardinha em molho de tomate      |   41 | NOVA 4 −45, B −5, BHT −4, carragena −4, realçadores −1                               |
| Iogurte grego de morango         |   38 | NOVA 4 −45, C −12, carragena −4, sorbato −1                                          |
| Margarina                        |   37 | NOVA 4 −45, C −12, BHT −4, conservantes −2                                           |
| Lámen instantâneo                |  ≤34 | NOVA 4 −45, C −12, aditivos −9; falta sódio e gordura saturada                       |
| Refrigerante de guaraná          |   33 | NOVA 4 (est.) −45, D −22 (7,3 g de açúcar/100 ml, abaixo do limite da lupa)          |
| Biscoito recheado                |   29 | NOVA 4 −45, C −12, alto em açúcar −10, fosfatos −4                                   |
| Salsicha                         |   23 | NOVA 4 (est.) −45, D −22, alto em sódio −10                                          |
| Achocolatado em pó               |   23 | NOVA 4 −45, D −22, alto em açúcar −10                                                |
| Leite condensado                 |   13 | NOVA 4 −45 (lactose adicionada), E −32, alto em açúcar (est.) −10                    |
| Mortadela                        |   13 | NOVA 4 (est.) −45, E −32, alto em sódio −10                                          |
| Sorvete                          |   13 | NOVA 4 (est.) −45, E −32, alto em gordura saturada −10                               |
| Creme de leite UHT               |   11 | NOVA 4 −45, D −22, alto em gordura saturada −10, aditivos −12                        |
| Refrigerante de cola             |    5 | NOVA 4 −45, E −32, alto em açúcar −10, caramelo IV −4, fosfatos −4                   |
| Creme de avelã com cacau         |    3 | NOVA 4 −45, E −32, alto em açúcar −10, alto em gordura saturada −10                  |
| Salgadinho de milho              |    2 | NOVA 4 −45, E −32, alto em gordura saturada e sódio −20, realçadores −1              |
| Barra de cereal                  |    0 | NOVA 4 −45, D −22, alto em açúcar e gordura saturada −20, BHA −8, BHT −4, polióis −1 |

## 7. Limitações conhecidas

- A nota depende da qualidade dos dados do OFF. Valores claramente errados (ex.: biscoito recheado
  com 1 g de gordura saturada por 100 g) distorcem o resultado.
- A classificação NOVA por marcadores é uma aproximação; a classificação oficial exige análise humana.
- Contaminantes são inferidos pela categoria do produto e indicam **exposição potencial**, nunca
  presença medida no produto.
