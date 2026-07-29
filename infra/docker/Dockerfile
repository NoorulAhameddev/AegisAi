FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/*/package*.json ./packages/
COPY services/*/package*.json ./services/
RUN npm install --legacy-peer-deps

COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl curl

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/uploads /app/data

EXPOSE 3000

USER node

# Run startup secret validation before starting the app.
# Migrations should be executed as part of CI/CD, not automatically at container start.
CMD ["sh", "-c", "node scripts/startup-secret-check.js && npm start"]
