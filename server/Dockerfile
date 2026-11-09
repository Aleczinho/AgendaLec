FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# O motor de consultas do Prisma precisa do OpenSSL no Alpine.
RUN apk add --no-cache openssl

COPY server/package.json server/package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Gera o Prisma Client; o CLI (prisma migrate deploy) fica disponível para a API aplicar as migrations ao iniciar.
COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/src ./src
COPY server/scripts ./scripts

USER node
EXPOSE 3001
CMD ["node", "src/index.js"]
