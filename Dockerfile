# App Nuxt como servidor Node (Easypanel). Build em duas etapas: a imagem final só leva
# o .output (servidor já empacotado, sem node_modules).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Sem o postinstall (nuxt prepare): o projeto ainda não foi copiado; o build prepara
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
