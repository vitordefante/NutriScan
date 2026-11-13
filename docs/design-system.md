# Design system — NutriScan (v0)

Aprovado pelo autor em 11/11/2026 a partir do protótipo no canvas
(<https://claude.ai/artifact/3jvsfXPmybBpy6KMmKkznt>). No código, os valores vivem em
`app/src/theme/tokens.ts`; este documento explica **por que** cada regra existe.

## Princípios

- **Limpo antes de decorativo.** Interface profissional e organizada; a pixel art aparece em
  detalhes (ícones, números, rótulos curtos, barra de HP), nunca no texto corrido.
- **Neo-brutalista leve.** Cantos retos (sem `borderRadius`), bordas de 2 px na cor tinta e
  sombra sólida deslocada nos botões — a sensação de "peças sobrepostas".
- **Cor nunca sozinha.** Toda informação codificada por cor também tem número ou texto ao lado
  (acessibilidade e leitura no sol durante a demo).
- **Fatos primeiro, lacunas depois.** A tela mostra antes o que foi encontrado e ajuda o
  usuário (nota, rótulo, NOVA, Nutri-Score, alertas); avisos de dados faltantes ficam no fim.
- **Uma fonte por informação.** Cada bloco mostra de onde vem o dado (título da seção ou linha
  de fonte), coerente com a regra da metodologia: toda penalidade tem fonte.

## Cores

| Token            | Valor     | Uso                                                  |
| ---------------- | --------- | ---------------------------------------------------- |
| tinta            | `#1F1F1F` | texto, bordas, botão primário, **sombra dos botões** |
| papel            | `#FFFFFF` | fundo das telas e dos cartões                        |
| grafite          | `#5E5E5E` | texto secundário (contraste 6,4:1)                   |
| vazio            | `#EBEBEB` | blocos vazios da barra de HP e da escala NOVA        |
| destaque (menta) | `#ADEBB3` | detalhes pontuais; uso definitivo ainda em aberto    |
| coral            | `#FF6B4A` | pontos descontados na tela "Por que essa nota"       |

**Faixas da nota** — cada faixa tem uma cor de preenchimento (barra, etiqueta) e um tom mais
escuro para texto, porque as cores claras não têm contraste suficiente como letra no fundo branco:

| Faixa     | Nota   | Preenchimento | Texto     |
| --------- | ------ | ------------- | --------- |
| Excelente | 80–100 | `#1F8A4C`     | `#1A7A43` |
| Bom       | 60–79  | `#8BC34A`     | `#4F7A1F` |
| Regular   | 40–59  | `#F5C542`     | `#8A6A00` |
| Ruim      | 20–39  | `#F08C2E`     | `#B35C12` |
| Péssimo   | 0–19   | `#D93F3F`     | `#C62F2F` |

## Tipografia

- **Space Grotesk** (Google Fonts) — todo o texto: títulos 24–28/700, corpo 15–16/400, legenda 12–13.
- **Silkscreen** (Google Fonts, pixel) — números da nota, títulos de seção em caixa alta,
  etiquetas, rótulos das abas.

## Componentes

- **Botão:** altura 52, borda 2 px, sombra sólida preta deslocada 6 px. Primário = fundo tinta;
  secundário = fundo papel. Ao tocar, o botão desce até a sombra (efeito de pressionar).
- **Botão "?":** quadrado 40 px com sombra preta de 3 px, sempre **à esquerda** da etiqueta da
  faixa; abre "Por que essa nota". A área de toque é maior que o desenho (`hitSlop`).
- **Etiqueta:** borda 2 px, texto pixel em caixa alta. Tipo e subtipo do produto ficam **sem
  fundo**; a etiqueta da faixa usa a cor de preenchimento da faixa.
- **Barra de HP:** 20 blocos de 5 pontos, coração pixel + "HP". Todo produto começa com 100 HP
  (barra cheia, verde) e os itens descontam.
- **Nível de processamento (NOVA):** 4 quadradinhos; os preenchidos (até o grupo do produto)
  e o nome do grupo usam a **mesma cor**, a do grupo — reforçam o grupo, não mostram escala.
- **Títulos de seção:** pixel, caixa alta, com a fonte separada por "·"
  (ex.: `NÍVEL DE PROCESSAMENTO · NOVA (USP)`).
- **Viewfinder do scanner:** cantos e linha de leitura brancos sobre a câmera.

## Em aberto

- Papel exato da cor de destaque (menta) no layout.
- Modo escuro.
- Ícones pixel nas abas nativas (hoje: SF Symbols / Material).
