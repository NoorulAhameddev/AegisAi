// Prisma 7+ configuration for datasource URLs
// Connection URL is specified here instead of schema.prisma

import { env } from "./src/lib/env";

export const defineConfig = () => ({
  db: {
    url: env.DATABASE_URL,
  }
});

export default defineConfig();
