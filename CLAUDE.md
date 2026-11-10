# NutriScan — contexto do projeto

TCC / projeto de portfólio de Engenharia de Software (Católica SC), linha **Aplicações Mobile**.
Prazo de entrega: **30/11/2026**. RFC já entregue. Desenvolvedor solo, com experiência em JavaScript/TypeScript.
Prioridade: **entregar um app de qualidade e funcional** para demo ao vivo. A banca é tolerante com os requisitos formais do guia; não gastar tempo com burocracia de processo.

Responda e documente em **português do Brasil**.

## O que é o app

Aplicativo que analisa **alimentos e cosméticos** a partir do código de barras (com leitura do rótulo por foto/OCR como extra) e retorna:

- nota/rating de qualidade, com explicação de **por que** o produto recebeu aquela nota;
- alertas de ingredientes e aditivos potencialmente danosos;
- **alternativas melhores** do mercado brasileiro (mesma categoria, nota maior);
- **mapa de produtores rurais locais** (o que vendem, endereço/ponto de venda, contato), com dados coletados presencialmente pelo autor.

Objetivo: incentivar consumo mais consciente, com base em fontes reconhecidas e também na opnião pessoal do desenvolvedor (viés naturalista / anti processados).

## Fluxos principais (demo)

1. Escanear alimento → análise (nota, lupa ANVISA, NOVA, aditivos) → alternativas + produtores próximos.
2. Escanear cosmético (ou fotografar a lista de ingredientes) → análise de ingredientes com alertas.
3. Abrir mapa → filtrar produtores por categoria → detalhe → contato (WhatsApp).

Extras: histórico de escaneamentos (salvo no aparelho), OCR do rótulo como fallback quando o produto não está na base.

## Stack

- **App:** Expo (React Native) + TypeScript + Expo Router.
  - `expo-camera` para leitura de código de barras.
  - `react-native-maps` (Apple Maps no iOS).
  - `expo-sqlite` para histórico/cache local.
- **API:** Node.js + TypeScript + Fastify, testes com Vitest.
- **Banco:** PostgreSQL (local via Docker Compose).
- **Fontes de dados de produtos:** API do Open Food Facts (alimentos) e Open Beauty Facts (cosméticos), filtrando Brasil quando aplicável.
- **Hospedagem:** a definir (há GitHub Student Developer Pack com créditos de nuvem).

## Estrutura do repositório

Monorepo com **npm workspaces** (`package.json` na raiz):

```
/app               → @nutriscan/app — Expo SDK 58 + Expo Router (rotas em app/src/app/)
/api               → @nutriscan/api — Fastify + Zod + Drizzle + Vitest
/packages/shared   → @nutriscan/shared — SOMENTE tipos de domínio (usar `import type`)
docker-compose.yml → Postgres 17 para desenvolvimento
```

- `app/AGENTS.md` tem regras do Expo que valem aqui: **a API do Expo muda a cada SDK — consultar a doc da versão (docs.expo.dev) antes de usar qualquer API do Expo/RN**, e instalar libs do app com `npx expo install` (dentro de `app/`).
- API: `buildApp(deps)` em `api/src/app.ts` monta o servidor sem abrir porta; dependências (banco etc.) são injetadas para os testes usarem fakes. Módulos em `api/src/modules/<nome>/`.
- TypeScript ~6.0 em todo o repo (versão fixada pelo Expo SDK 58).

## Comandos (na raiz)

```bash
npm install          # instala tudo (app, api, shared)
npm run db:up        # sobe o Postgres (Docker Desktop precisa estar aberto)
npm run dev:api      # API em http://localhost:3333 (GET /health)
npm run dev:app      # Expo (Metro)
npm test             # testes da API (Vitest)
npm run typecheck    # tsc em todos os pacotes
npm run format       # Prettier
```

- `api/.env` é criado a partir de `api/.env.example` (não vai para o Git).
- O npm desta máquina bloqueia scripts de instalação por padrão (`npm install-scripts ls`); esbuild e fsevents não precisam deles.
- Xcode 27: o simulador fica no app **DeviceHub** (`/Applications/Xcode.app/Contents/Applications/DeviceHub.app`).

## Decisões tomadas

- **Produtores:** modelo híbrido — o autor cadastra os produtores visitados (importados por script de um arquivo local `api/data/*.local.json`, fora do Git, pois o repositório é **público**) + formulário "Quero aparecer no mapa" que gera pedido pendente para aprovação. Produtor não tem login.
- **Contaminantes** (mercúrio, arsênio, agrotóxicos, PFAS, microplásticos): alerta de **exposição potencial** inferido por categoria/ingrediente, com fonte (ex.: PARA/ANVISA); nunca "este produto contém". Peso pequeno na nota.
- **Contas:** e-mail + senha implementados na API (`@fastify/jwt` + argon2); token no app em `expo-secure-store`. Escanear funciona sem login; log de exposição exige conta e sincroniza na API.
- **Nota:** 0–100, exibida como barra de HP. Cada componente é um `ScoreItem` (`pontos`, `motivo`, `fonte`) — a tela "por que essa nota" lista esses itens. Os pesos refletem a metodologia do autor (viés naturalista) e são documentados de forma transparente.
- **UI:** profissional e organizada, com detalhes em pixel art (fonte, ícones, barra de HP, ícones de alimentos dos produtores).
- **Foto/OCR:** fica para o final.
- **Git:** uma branch por fase, PR via `gh`, `/code-review` antes do merge.

## Roadmap

0. Fundação (monorepo, API com /health, app com abas) — feito
1. Produtos + motor de nota de alimentos (Open Food Facts, cache, testes)
2. Scanner + tela de resultado + design pixel art (primeiro build no iPhone)
3. Cosméticos (Open Beauty Facts + lista curada)
4. Alternativas
5. Contas + exposure tracking
6. Mapa de produtores + formulário de pedido
7. Entrega: deploy, estados de erro, APK, build release no iPhone
8. Extra: foto/OCR

## Arquitetura

- App em camadas: telas (views) → hooks (view models) → serviços/repositórios (chamadas à API, SQLite) → tipos de domínio.
- API em camadas: rotas → serviços → repositórios; o **motor de análise** (nota, alertas, alternativas) fica em funções puras, isoladas de I/O, cobertas por testes.
- A API encapsula o Open Food Facts / Open Beauty Facts e faz cache dos produtos no Postgres.
- Chaves de serviços externos (OCR/LLM, se usados) ficam **somente na API**, nunca no app.
- Nada de lógica toda concentrada em um arquivo: manter módulos pequenos e coesos.

## Metodologia da nota (diretrizes)

Ainda a detalhar (pesos e faixas). Princípios:

- **Alimentos:** compor a partir de Nutri-Score, classificação NOVA (ultraprocessados — alinhada ao Guia Alimentar para a População Brasileira), rotulagem nutricional frontal da ANVISA (alto em açúcar adicionado, gordura saturada, sódio) e aditivos com alerta (referências EFSA/IARC).
- **Cosméticos:** lista curada própria de ingredientes de atenção (ex.: parabenos, liberadores de formaldeído, certos filtros UV, fragrâncias alergênicas), cada um com nível de risco e referência.
- Toda penalidade exibida ao usuário deve ter a fonte associada. Linguagem neutra e baseada em evidência — sem acusar marcas.
- Tratar cadastros incompletos com honestidade: indicar quando faltam dados em vez de inventar nota.

## Produtores rurais (dados pessoais)

- Publicar nome, contato e localização do produtor.
- Permitir localização aproximada ou ponto de venda (feira) em vez do endereço residencial.
- O app precisa de uma política de privacidade (câmera, localização, dados de produtores).

## Ambiente do desenvolvedor

- MacBook Air M4, iPhone 13 mini.
- Demo no iPhone via **build release local** com conta Apple gratuita (`npx expo run:ios --configuration Release --device`) — a instalação expira em 7 dias; reinstalar perto da apresentação.
- APK Android via EAS Build para distribuição.

## Cronograma

- **Semana 1 (10–16/11):** setup do repositório, API com motor de nota de alimentos + testes, Postgres via Docker, app com scanner e tela de resultado integrados.
- **Semana 2 (17–23/11):** cosméticos (lista curada + análise), alternativas, API e tela do mapa de produtores (visitas presenciais), histórico local.
- **Semana 3 (24–30/11):** estados de carregamento/erro, polimento visual, deploy, APK, build no iPhone, ensaio da demo. OCR se sobrar tempo.

## Decisões pendentes

- Pesos e faixas da nota de alimentos.
- Lista curada de ingredientes de cosméticos.
- Provedor de nuvem para a API e o banco.
- OCR/foto: serviço a usar (somente se houver tempo).
- Referências visuais de UI (o autor vai enviar antes da Fase 2).
