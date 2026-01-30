// Prisma 7+ configuration for datasource URLs
// Connection URL is specified here instead of schema.prisma

export const defineConfig = () => ({
  db: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/aegis'
  }
});

export default defineConfig();
