# Multi-stage Dockerfile for Northflank & Cloud Hosting
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @erp/database db:generate
RUN pnpm --filter @erp/shared build
RUN pnpm --filter @erp/api build

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV API_HOST=0.0.0.0
ENV DATABASE_URL="file:/app/packages/database/prisma/dev.db"

RUN npm install -g pnpm

RUN mkdir -p /app/packages/database/prisma

COPY --from=builder /app ./

EXPOSE 3000

# Push DB schema, run seed if not seeded, and start
CMD ["sh", "-c", "pnpm --filter @erp/database db:push && node -e \"const { PrismaClient } = require('./packages/database/src/generated/client'); const p = new PrismaClient(); p.user.count().then(c => { if(c === 0) { console.log('Seeding initial data...'); require('child_process').execSync('pnpm --filter @erp/database db:seed', { stdio: 'inherit' }); } process.exit(0); });\" && pnpm --filter @erp/api start"]
