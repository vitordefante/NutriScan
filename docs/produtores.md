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

### Frase de autorização (LGPD)

> "Estou fazendo um aplicativo, o NutriScan, que mostra num mapa produtores da região para
> quem quer comprar direto de quem produz. Posso publicar o nome, o que você vende, o local de
> venda e o seu contato (WhatsApp/Instagram)? Você pode pedir para sair do mapa quando quiser,
> é só me avisar."

Anote **sim/não**, a data e o que ele **não** quer que apareça (ex.: endereço da casa).
Sem "sim", o produtor não é cadastrado — o script de importação recusa o registro.

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

## Pedidos do formulário

O formulário do app grava um pedido **pendente**. Nada aparece no mapa sem aprovação.

- `npm run produtores:pedidos` — lista os pendentes.
- Para aprovar: confira (visita ou contato), acrescente o produtor no `produtores.local.json`,
  rode a importação e marque o pedido: `npm run produtores:pedidos -- aprovar <id>`.
- Para recusar: `npm run produtores:pedidos -- recusar <id>` (o pedido é apagado).

## Sair do mapa

Se um produtor pedir para sair: apague o bloco dele do `produtores.local.json` e rode a
importação de novo.
