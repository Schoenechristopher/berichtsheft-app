# Ein Image für App und Worker (Next.js-App, Prisma-Migrationen, pg-boss-Worker).

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl tzdata
ENV NODE_ENV=production \
    TZ=Europe/Berlin \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app ./
# Falls das Repository mit CRLF ausgecheckt wurde (Windows), Startskript auf LF bringen.
RUN sed -i 's/\r$//' docker/start-app.sh
USER node
EXPOSE 3000
CMD ["sh", "docker/start-app.sh"]
