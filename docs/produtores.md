# Produtores rurais — coleta e cadastro

O mapa mostra produtores visitados pessoalmente pelo autor e produtores que pediram para
aparecer pelo formulário "Quero aparecer no mapa" e foram aprovados. Produtor não tem login.

Os dados reais ficam em `api/data/produtores.local.json`, **fora do Git**, porque o repositório
é público. O formato está em `api/data/produtores.exemplo.json` (dados fictícios).

## Na visita: o que perguntar

Obrigatório (sem isso o produtor não entra no mapa):

1. **Autorização para publicar**: leia a frase abaixo e anote a resposta.
2. **Nome** que deve aparecer: o do sítio/marca, ou o do produtor.
3. **O que vende**: os produtos em palavras simples ("alface, couve, ovos caipira").
4. **Onde vende**: pelo menos um local, com a posição no mapa (ver "Como pegar a posição").
   - Feira ou loja: nome, endereço, dias e horário.
   - Propriedade: só se o produtor vende ali **e** aceita que apareça. Pergunte se prefere que
     apareça a posição **aproximada** (raio de ~1 km) em vez da exata.
5. **Contato** que pode ser publicado: WhatsApp (de preferência o número de vendas) e/ou Instagram.

Opcional (enriquece o detalhe):

- Nome do responsável (só se ele quiser).
- Como produz: **orgânico certificado** (peça o selo/certificadora: SisOrg, OPAC, OCS),
  **agroecológico / sem agrotóxico** (sem certificação, o app mostra como "declarado pelo
  produtor") ou convencional. Não deduza: anote o que ele disser.
- Faz entrega? Onde?
- Uma frase curta sobre o produtor (até 200 caracteres).
- **Fotos** (2 a 5; máximo 8): a banca ou a loja, os produtos, a plantação ou a criação. O
  produtor só aparece se quiser (pergunte). Evite rostos de clientes e de terceiros, placas de
  carro e a fachada da casa quando o local for aproximado.

### Frase de autorização (LGPD)

> "Estou fazendo um aplicativo, o NutriScan, que mostra num mapa produtores da região para
> quem quer comprar direto de quem produz. Posso publicar o nome, o que você vende, o local de
> venda, o seu contato (WhatsApp/Instagram) e algumas fotos? Você pode pedir para sair do mapa
> quando quiser, é só me avisar."

Anote **sim/não** (para os dados e, à parte, para as fotos), a data e o que ele **não** quer
que apareça (ex.: endereço da casa, o próprio rosto). Sem "sim", o produtor não é cadastrado —
o script de importação recusa o registro; fotos sem `"fotos": true` na autorização também.

## Formulário online (Google Forms)

Para quem não dá para visitar: um link que o produtor preenche sozinho, com as perguntas no
mesmo formato do cadastro (as respostas chegam padronizadas numa planilha). O script
[`formulario-produtores.gs`](formulario-produtores.gs) cria o formulário inteiro:

1. Em [forms.google.com](https://forms.google.com), crie um formulário **em branco** e copie o
   id da barra de endereço (`docs.google.com/forms/d/<id>/edit`). Criar o formulário pelo script
   às vezes falha ("Falha ao criar o novo formulário"); preencher um já criado, não.
2. Preencha `ID_FORMULARIO`, `AUTOR` e `CONTATO` no início do script.
3. [script.google.com](https://script.google.com) → Novo projeto → cole o script → função
   `criarFormulario` → Executar → autorize. Os links aparecem no "Registro de execução".
4. No editor do formulário, na página "Fotos e autorização", adicione a pergunta **Carregar
   arquivo** (só imagens, até 5 arquivos, 10 MB cada) — o Apps Script não cria essa pergunta.
   Quem envia arquivo precisa estar logado numa conta Google (no Android, quase sempre já está);
   a pergunta das fotos deve ser opcional, e o formulário já diz que dá para mandar pelo WhatsApp.
5. (Catálogo) Na mesma página, adicione uma pergunta **Parágrafo** "Seus produtos para a
   vitrine do app (opcional)", com a ajuda: "Um por linha: nome — embalagem/quantidade — preço.
   Ex.: Ovos caipira — bandeja com 30 — R$ 30". As fotos dos produtos vão na pergunta de
   arquivo; peça que o nome do arquivo ou a ordem siga a lista (o script já cria essa pergunta
   em formulários novos).
6. Aba **Respostas** → Vincular ao Planilhas.
7. Mande o link de responder (WhatsApp, grupo da feira, Instagram).

Do formulário ao mapa:

1. Baixe a planilha em CSV (Arquivo → Fazer download) e a pasta das fotos no Drive
   ("… (File responses)" → Fazer download).
2. Confira cada produtor pelo WhatsApp (o formulário promete essa conferência) e pegue as
   coordenadas dos links do Google Maps.
3. Acrescente os blocos no `produtores.local.json`, as fotos em `api/data/fotos/` e importe. A
   data da resposta (coluna "Carimbo de data/hora") é a data da autorização.

A planilha tem dados pessoais: ela fica na sua conta Google e **não vai para o repositório**.

## Cadastro pelo WhatsApp

Para quem não usa formulário. A autorização por escrito no WhatsApp fica registrada na
conversa — guarde-a. Mensagem para copiar (troque o que está entre colchetes):

> Oi, [nome]! Sou [seu nome], estudante de Engenharia de Software. Estou fazendo o NutriScan,
> um app que mostra num mapa produtores da região para quem quer comprar direto de quem
> produz — sem custo nenhum para você. Se quiser aparecer, me manda:
>
> 1. O nome que deve aparecer (do sítio, da marca ou o seu)
> 2. O que você vende
> 3. Onde e quando vende (feira, loja ou na propriedade, com dias e horário). Se for na
>    propriedade, pode mandar a localização pelo WhatsApp (📎 → Localização) e me dizer se
>    prefere que apareça só a região aproximada
> 4. O WhatsApp e/ou Instagram que posso publicar
> 5. Se quiser: como produz (orgânico com selo, agroecológico/sem veneno, convencional) e se
>    faz entrega
> 6. De 2 a 5 fotos: da banca, dos produtos, da plantação ou da criação
> 7. Se quiser uma vitrine no app: os principais produtos, cada um com uma foto, uma frase
>    (embalagem, quantidade) e o preço
>
> Você autoriza publicar essas informações e as fotos no app? Pode pedir para sair quando
> quiser, é só me avisar.

A localização compartilhada no WhatsApp abre um link com as coordenadas
(`maps.google.com/?q=-26.30451,-48.84612`): use esses números.

### Como pegar a posição

- **Google Maps**: segure o dedo no local → as coordenadas aparecem na busca
  (ex.: `-26.30451, -48.84612`). Toque para copiar.
- **Apple Maps**: segure o dedo no local (marca um alfinete) → deslize o cartão para cima →
  "Coordenadas".
- Alternativa: tire uma foto do local com a localização do celular ligada; a posição fica nas
  informações da foto (deslize a foto para cima no app Fotos).

Use a ordem **latitude, longitude**. Em Santa Catarina as duas são negativas.

## Categorias

Cada categoria tem um ícone pixel no mapa e é o filtro da tela.

| Código       | Nome no app            | Exemplos                                  |
| ------------ | ---------------------- | ----------------------------------------- |
| `hortalicas` | Verduras e legumes     | alface, couve, cenoura, aipim             |
| `frutas`     | Frutas                 | banana, laranja, morango                  |
| `ovos`       | Ovos                   | ovos caipira, de codorna                  |
| `laticinios` | Leite e queijos        | leite, queijo colonial, nata, iogurte     |
| `carnes`     | Carnes                 | frango caipira, suínos, embutidos         |
| `pescados`   | Peixes e frutos do mar | peixe, camarão, ostra, marisco            |
| `mel`        | Mel                    | mel, própolis, melado                     |
| `graos`      | Grãos e farinhas       | feijão, arroz, milho, farinha de mandioca |
| `artesanais` | Feitos à mão           | pão, geleia, conserva, cuca, café         |
| `cosmeticos` | Cosméticos naturais    | sabonete artesanal, óleos                 |

## Cadastro (depois da visita)

1. Copie `api/data/produtores.exemplo.json` para `api/data/produtores.local.json` (na primeira
   vez) e acrescente um bloco por produtor.
2. `npm run produtores:importar` — valida o arquivo e grava/atualiza os produtores no Postgres.
   O `id` de cada produtor é fixo: rodar de novo atualiza, não duplica. Produtor que saiu do
   arquivo sai do mapa.
3. Locais com `"precisao": "aproximada"` têm a posição arredondada (~1 km) **antes** de ir para o
   banco; a posição exata não sai do arquivo local.

### Fotos

Ponha os arquivos em `api/data/fotos/` (**fora do Git**), uma pasta por produtor, e liste-os no
bloco do produtor, na ordem de exibição (a primeira é a capa da galeria):

```json
"fotos": [
  { "arquivo": "sitio-boa-vista/banca.jpg", "legenda": "Banca na feira de sábado" },
  { "arquivo": "sitio-boa-vista/horta.jpg" }
],
"autorizacao": { "publicar": true, "fotos": true, "data": "2026-11-18" }
```

- A importação gira a foto conforme o celular, reduz para no máximo 1600 px e grava em JPEG
  **sem metadados** — o EXIF de uma foto de celular traz a posição GPS de onde ela foi tirada.
  As fotos ficam no Postgres (não precisa de armazenamento à parte no deploy).
- Aceita JPEG, PNG e WebP (as do WhatsApp já vêm em JPEG). HEIC do iPhone (AirDrop) precisa ser
  convertido antes: `sips -s format jpeg foto.heic --out foto.jpg`.
- Se alguma foto faltar ou não abrir, nada é importado e o script diz qual foi.
- Legenda: opcional, até 120 caracteres. Não aparece na tela: é a descrição da foto para o leitor
  de tela (acessibilidade).

### Catálogo

Os itens que o produtor vende, com foto, descrição e preço, viram cartões na seção "O que vende"
do detalhe (grade de 2 colunas; tocar na foto abre em tela cheia). É opcional: sem catálogo, a
seção mostra a lista `produtos` em texto. Para o **produtor sem conta no app**, o catálogo vem
do arquivo; quem tem conta cuida dele pelo app (ver [Conta de produtor](#conta-de-produtor)).

```json
"produtos": ["queijo colonial", "nata"],
"catalogo": [
  {
    "nome": "Leite orgânico",
    "descricao": "Pasteurizado, garrafa de vidro de 1 L (retornável).",
    "preco": { "valor": 9.5, "unidade": "litro" },
    "foto": "sitio-boa-vista/leite.jpg"
  },
  { "nome": "Kefir", "preco": { "valor": 14, "unidade": "pacote" } }
]
```

- `nome` (até 60 caracteres) é o único campo obrigatório; `descricao` até 120. Até 30 itens.
- **Preço padronizado:** valor em reais (até R$ 99.999,99) por uma unidade da lista: `unidade`,
  `kg`, `litro`, `duzia`, `bandeja`, `pacote`, `pote`, `garrafa`, `maco`, `caixa`. O app mostra
  "R$ 9,50 / litro".
- Com catálogo, `produtos` pode ficar de fora ou listar só o que não tem cartão (aparece abaixo
  como "Também: …"). Os nomes do catálogo entram sozinhos na lista curta do cartão do mapa.
- As fotos dos itens seguem as regras das fotos acima (mesma pasta, sem metadados, exigem
  `"fotos": true` na autorização). Item sem foto mostra o ícone da categoria.
- O catálogo fica no banco. A importação **troca** o catálogo de quem tem `"catalogo"` no
  arquivo e não tem conta; sem a chave `"catalogo"`, o que está no banco fica como está. Para
  esvaziar, use `"catalogo": []`.

## Conta de produtor

O produtor cuida do próprio catálogo pelo app (Perfil → Meu catálogo). Produtor não tem um
login à parte: é uma conta comum do app, ligada ao produtor do mapa por um código de convite.

### Ligar a conta

1. O produtor precisa estar no mapa (importado).
2. `npm run produtores:contas -- convite <id-do-produtor>` — gera um código (ex.: `K7M2-QX9P`)
   e a mensagem pronta para o WhatsApp. Vale 7 dias e uma vez só; um código novo anula o
   anterior. O banco guarda só o hash do código.
3. No app, o produtor entra (ou cria a conta) no Perfil → "Sou produtor e tenho um código".
4. `npm run produtores:contas` lista as contas ligadas; `-- desligar <id>` desfaz a ligação
   (o catálogo continua no mapa e volta a ser seu, pelo arquivo). Se o produtor excluir a
   conta, acontece o mesmo.

Uma conta liga a um produtor só, e um produtor tem uma conta só.

### O que vale na hora e o que passa por você

| Pelo app                                 | Quando aparece no mapa                            |
| ---------------------------------------- | ------------------------------------------------- |
| Mudar ou tirar o preço de um item        | Na hora                                           |
| Tirar um item do catálogo                | Na hora                                           |
| Item novo                                | Depois da sua aprovação                           |
| Mudar nome, descrição ou foto de um item | Depois da sua aprovação (até lá, fica o anterior) |

O preço é só número + unidade da lista: não há texto livre publicado sem conferência. Fotos
enviadas pelo app passam pelo mesmo tratamento (reduzidas, sem GPS) e **não são públicas** até a
aprovação: só o próprio produtor as vê.

### Aprovar os itens

```bash
npm run produtores:itens                              # o que está em análise
npm run produtores:itens -- aprovar <id>              # publica
npm run produtores:itens -- recusar <id> "motivo"     # o produtor vê o motivo no app
```

A lista mostra o produtor, se é item novo ou mudança (com o antes e o depois) e o preço; as
fotos em análise são salvas em `api/data/revisao/` (fora do Git) para você abrir. O que
conferir: a foto mostra o produto (sem rostos de terceiros, sem placa de carro), o nome e a
descrição descrevem o item, e nada de propaganda enganosa ("cura", "detox") ou contato fora
do campo de contato.

## Pedidos do formulário

O formulário do app grava um pedido **pendente**. Nada aparece no mapa sem aprovação.

- `npm run produtores:pedidos` — lista os pendentes.
- Para aprovar: confira (visita ou contato), acrescente o produtor no `produtores.local.json`,
  rode a importação e marque o pedido: `npm run produtores:pedidos -- aprovar <id>`.
- Para recusar: `npm run produtores:pedidos -- recusar <id>` (o pedido é apagado).

## Sair do mapa

Se um produtor pedir para sair: apague o bloco dele do `produtores.local.json` e rode a
importação de novo (as fotos dele saem do banco junto; apague também a pasta em
`api/data/fotos/`).
