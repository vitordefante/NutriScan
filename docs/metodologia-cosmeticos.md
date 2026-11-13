# Metodologia da nota — cosméticos (v1)

> **Status:** pesos e lista aprovados pelo autor em 12/11/2026 (seção 6). Itens marcados com
> **[a confirmar]** dependem de conferir o texto oficial da norma antes da entrega.

## 1. Por que cosméticos precisam de outra metodologia

Alimentos têm tabela nutricional, NOVA, Nutri-Score e a lupa da ANVISA. Cosméticos não têm nada
disso: a única informação confiável no rótulo é a **lista de ingredientes**, que a ANVISA obriga a
trazer na nomenclatura internacional **INCI** (RDC 752/2022). Por isso a nota de cosméticos é
**baseada só em ingredientes**: começa em 100 HP e cada ingrediente de atenção desconta pontos,
cada um com o motivo e a fonte — o mesmo formato `ScoreItem` dos alimentos, a mesma barra de HP e
a mesma tela "Por que essa nota".

**Limite honesto (dito também na tela):** a lista de ingredientes mostra **o que** existe no
produto, mas não **quanto**. As normas que citamos limitam concentrações que não temos como
medir. Por isso a linguagem é sempre "ingrediente de atenção", nunca "tóxico" ou "perigoso": a
nota reflete a **presença** de ingredientes que órgãos reguladores e pesquisas apontam como
preocupantes, somada ao viés naturalista assumido do autor.

## 2. Fontes de dados

- **Open Beauty Facts** (mesma API do Open Food Facts). Cobertura no Brasil é baixa: em
  12/11/2026, 519 produtos com o Brasil entre os países de venda e cerca de 40% com lista de
  ingredientes. Consequência: a **foto da lista de ingredientes (OCR)** deixa de ser só extra e
  passa a ser um caminho importante para cosméticos (Fase 8). A análise trabalha sobre o **texto
  da lista**, venha ele da base ou da foto.
- Sem lista de ingredientes → **dados insuficientes** (sem nota), como nos alimentos.

## 3. Níveis e pesos (proposta)

| Nível        | Critério                                                                                                                                           | Desconto por grupo | Teto do nível |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- |
| **Alto**     | proibido no Brasil ou na UE, cancerígeno/mutagênico/tóxico para reprodução (CMR) ou IARC Grupo 1/2A                                                | −25                | —             |
| **Moderado** | permitido só com restrição (concentração, tipo de produto, aviso no rótulo), alérgeno forte, disruptor endócrino suspeito, persistente no ambiente | −10                | −40           |
| **Baixo**    | viés naturalista do autor: irritante, composição oculta, derivado de petróleo, possível contaminante                                               | −3                 | −15           |
| **Bônus**    | certificação orgânica/natural reconhecida (ex.: Ecocert, COSMOS, IBD)                                                                              | +5                 | —             |

- Desconto **por grupo**, não por ingrediente (três parabenos diferentes = um item "Parabenos"),
  igual aos aditivos dos alimentos — evita que listas longas sejam punidas só por serem longas.
- Mesmas faixas da nota de alimentos (excelente 80–100 … péssimo 0–19).

## 4. Lista curada de ingredientes de atenção (proposta)

### Alto (−25)

| Grupo               | Exemplos INCI                                                                  | Motivo                                          | Fonte                                                                                   |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| Parabenos proibidos | Isopropylparaben, Isobutylparaben, Phenylparaben, Benzylparaben, Pentylparaben | Proibidos por falta de dados de segurança       | Reg. (UE) 358/2014; ANVISA RDC 529/2021 **[a confirmar no anexo]**                      |
| Lilial              | Butylphenyl Methylpropional                                                    | Tóxico para reprodução (CMR 1B); proibido       | Reg. (UE) 2021/1902; ANVISA RDC 529/2021 alterada pela RDC 1.030/2026 **[a confirmar]** |
| Formaldeído livre   | Formaldehyde, Formalin, Methylene Glycol                                       | Cancerígeno para humanos (IARC Grupo 1)         | IARC, Monografia 100F                                                                   |
| Hidroquinona        | Hydroquinone                                                                   | Proibida em cosméticos (uso só em medicamentos) | Reg. (CE) 1223/2009, Anexo II **[a confirmar no Brasil]**                               |

### Moderado (−10, teto −40)

| Grupo                                     | Exemplos INCI                                                                                                                                    | Motivo                                                                                                                                                                                           | Fonte                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Liberadores de formaldeído                | DMDM Hydantoin, Imidazolidinyl Urea, Diazolidinyl Urea, Quaternium-15, 2-Bromo-2-Nitropropane-1,3-Diol (Bronopol), Sodium Hydroxymethylglycinate | Liberam formaldeído (IARC Grupo 1); exigem aviso no rótulo na UE                                                                                                                                 | Reg. (UE) 2022/1181; IARC 100F                                                                  |
| Parabenos com restrição                   | Propylparaben, Butylparaben                                                                                                                      | Limite de concentração; proibidos em produtos sem enxágue para a área da fralda (< 3 anos)                                                                                                       | Reg. (UE) 358/2014; SCCS                                                                        |
| Isotiazolinonas                           | Methylisothiazolinone, Methylchloroisothiazolinone                                                                                               | Alérgenos de contato; proibidas em produtos sem enxágue na UE                                                                                                                                    | Reg. (UE) 2016/1198 e 2017/1224                                                                 |
| Triclosan                                 | Triclosan                                                                                                                                        | Uso restrito; disruptor endócrino suspeito                                                                                                                                                       | Reg. (UE) 358/2014; SCCS                                                                        |
| Filtros UV com restrição                  | Benzophenone-3 (Oxybenzone), Octocrylene, Homosalate                                                                                             | Disruptores endócrinos suspeitos; uso limitado                                                                                                                                                   | Reg. (UE) 2022/1176 (BP-3, octocrileno); Reg. (UE) 2022/2195 (homossalato, só rosto, até 7,34%) |
| BHA                                       | BHA (Butylated Hydroxyanisole)                                                                                                                   | Possivelmente cancerígeno (IARC Grupo 2B)                                                                                                                                                        | IARC, Monografia 40                                                                             |
| Siloxanos cíclicos                        | Cyclotetrasiloxane (D4), Cyclopentasiloxane (D5), Cyclohexasiloxane (D6)                                                                         | Persistentes e bioacumuláveis no ambiente                                                                                                                                                        | Reg. (UE) 2018/35 e 2024/1328 (REACH)                                                           |
| Talco                                     | Talc                                                                                                                                             | **Exposição potencial**: provavelmente cancerígeno (IARC 2A, 2024) e risco de contaminação por amianto                                                                                           | IARC, Monografia 136                                                                            |
| Microplásticos                            | Polyethylene, Polypropylene, Nylon-12, Polymethyl Methacrylate                                                                                   | Poluição persistente; restrição progressiva na UE                                                                                                                                                | Reg. (UE) 2023/2055                                                                             |
| PFAS                                      | PTFE, Perfluoro…/Polyfluoro…                                                                                                                     | "Químicos eternos": persistentes; **exposição potencial**                                                                                                                                        | ECHA, proposta de restrição universal de PFAS (2023)                                            |
| Fragrância não revelada                   | Parfum, Fragrance                                                                                                                                | Mistura de composição oculta; principal causa de alergia de contato a cosméticos. Peso moderado por decisão do autor (viés naturalista)                                                          | Reg. (UE) 2023/1545 (amplia alérgenos de declaração obrigatória) + metodologia do autor         |
| Disruptor endócrino em avaliação (**−6**) | Benzyl Salicylate, BHT, Resorcinol, Kojic Acid, 4-Methylbenzylidene Camphor, Triclocarban                                                        | Na lista europeia de possíveis disruptores endócrinos em avaliação; o SCCS viu indícios de ação hormonal, mas não comprovou efeito nas doses permitidas. Peso intermediário por decisão do autor | Comissão Europeia, chamada de dados (2019); SCCS; metodologia do autor                          |

### Baixo (−3, teto −15) — viés naturalista

| Grupo                     | Exemplos INCI                                                                           | Motivo                                                                                                                                                                                                                      | Fonte                                                         |
| ------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Alérgenos de fragrância   | Limonene, Linalool, Citral, Eugenol, Coumarin, Geraniol, Citronellol, Hexyl Cinnamal, … | Alérgenos de declaração obrigatória                                                                                                                                                                                         | Reg. (UE) 2023/1545                                           |
| Sulfatos agressivos       | Sodium Lauryl Sulfate (SLS), Ammonium Lauryl Sulfate                                    | Irritantes para pele e mucosas                                                                                                                                                                                              | CIR (Cosmetic Ingredient Review) **[a confirmar referência]** |
| Etoxilados                | PEG-n, Laureth-n, Ceteareth-n, Sodium Laureth Sulfate                                   | Podem trazer 1,4-dioxano como contaminante (IARC 2B) — **exposição potencial**                                                                                                                                              | IARC, Monografia 110                                          |
| Derivados de petróleo     | Paraffinum Liquidum (Mineral Oil), Petrolatum                                           | Origem fóssil; possível contaminação por MOAH                                                                                                                                                                               | **[a confirmar referência]**                                  |
| Parabenos de cadeia curta | Methylparaben, Ethylparaben                                                             | Considerados seguros pelo SCCS; entram só pelo viés do autor                                                                                                                                                                | SCCS (2013) + metodologia do autor                            |
| Silicones lineares        | Dimethicone, Amodimethicone, Dimethiconol                                               | Sem risco à saúde apontado pelo SCCS; persistentes no ambiente — entram só pelo viés ambiental do autor                                                                                                                     | Metodologia do autor                                          |
| Flúor                     | Sodium Monofluorophosphate, Sodium Fluoride, Stannous Fluoride                          | Ingerido em dose alta, associado a QI mais baixo em crianças (NTP 2024) e a fluorose quando crianças engolem a pasta. No uso tópico, OMS e Ministério da Saúde o recomendam contra cáries — entra pela preferência do autor | NTP, Monografia (2024); metodologia do autor                  |

> "Aroma" **não** conta como fragrância: em cremes dentais e produtos de boca ele é o
> aromatizante de sabor.

## 5. Reconhecimento dos ingredientes

- A lista é dividida nos separadores usuais (vírgula, ponto-e-vírgula, "•", quebras de linha).
- Cada item é normalizado (minúsculas, sem acentos, sem "(nano)", sem números de CI) e comparado
  com **sinônimos** de cada grupo: nome INCI + nomes comuns em português e inglês
  (ex.: "Paraffinum Liquidum" = "Mineral Oil" = "Óleo Mineral").
- Padrões para famílias (ex.: tudo que começa com `peg-` ou contém `paraben`).
- A posição na lista é guardada (ingredientes vêm em ordem decrescente de concentração até 1%),
  para uma versão futura poder pesar mais o que está no topo.
- **Lista possivelmente incompleta:** menos de 8 ingredientes e nenhuma água (Aqua/Water/Água)
  costuma ser só o "destaque" da embalagem (ex.: "Óleo de Coco, Água de Coco, Óleo de
  Abacate"). A nota vira **parcial** (teto, mostrada com "≤"), como nos alimentos.

## 6. Decisões do autor (12/11/2026)

1. **Pesos:** mantidos (−25 / −10 / −3; tetos −40 no moderado e −15 no baixo).
2. **Metilparabeno e etilparabeno:** nível baixo (−3), declarados como viés do autor.
3. **Silicones lineares:** nível baixo (−3), pelo viés ambiental.
4. **Fragrância "Parfum"/"Fragrance":** nível **moderado** (−10).
5. **Bônus de certificação orgânica/natural:** +5, como nos alimentos (proposta mantida).
6. **Posição na lista:** ignorada na v1 (guardada para uma versão futura).
7. **Flúor (creme dental):** nível baixo (−3), como preferência do autor, com a ressalva de que o
   uso tópico é recomendado pelas autoridades de saúde.
8. **Disruptores endócrinos em avaliação:** grupo próprio com **−6** (meio-termo entre baixo e
   moderado), contando no teto do nível moderado.

Toda escolha que vem do viés do autor (e não de uma norma ou de um comitê científico) aparece
assim na tela "Por que essa nota", com "metodologia do autor" como fonte.
