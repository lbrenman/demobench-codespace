# ── Stage 1: Build React client ──────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY package.json ./
RUN npm install --production

# Copy built React client from stage 1
COPY --from=client-builder /client/dist ./client/dist

# Copy server source
COPY src ./src

EXPOSE 4500

CMD ["node", "src/server.js"]
