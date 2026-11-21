# Imagem da API para o deploy (Render). Só a API entra: o app Expo fica de fora.
# Testar localmente: docker build -t nutriscan-api . && docker run --env-file api/.env -p 3333:3333 nutriscan-api

FROM node:26-slim AS base
WORKDIR /repo
# O app Expo sai da lista de workspaces: sem isso o npm instala as ~600 MB de dependências dele.
# As versões continuam as do package-lock.json.
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY packages/shared/package.json packages/shared/
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));p.workspaces=['api','packages/*'];fs.writeFileSync('package.json',JSON.stringify(p))"

FROM base AS build
RUN npm install --no-audit --no-fund
COPY packages/shared packages/shared
COPY api api
RUN npm run build -w @nutriscan/api

FROM base AS deps
RUN npm install --no-audit --no-fund --omit=dev

FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=deps /repo/node_modules node_modules
COPY packages/shared packages/shared
COPY api/package.json api/
COPY --from=build /repo/api/dist api/dist
WORKDIR /repo/api
USER node
# PORT vem do provedor (o Render define sozinho); HOST já é 0.0.0.0 por padrão.
CMD ["node", "dist/server.js"]
