FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# We need to run migrations before starting the app in a real setup, usually via an entrypoint script.
# For simplicity here, we assume migrations are handled separately or we add a pre-start command.
# Adding npx prisma migrate deploy to ensure DB is ready.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
