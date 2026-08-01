# Use Node.js LTS
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY app/package.json app/package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY app/ ./

# Build the Next.js application
RUN npm run build

# Production image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/models ./models

EXPOSE 3000

ENV PORT 3000

# Start the application
CMD ["npm", "start"]
