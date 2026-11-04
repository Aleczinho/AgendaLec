FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/src ./src
COPY server/migrations ./migrations
COPY server/scripts ./scripts

USER node
EXPOSE 3001
CMD ["node", "src/index.js"]
