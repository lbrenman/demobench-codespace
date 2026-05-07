FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy built React client (built during image build or pre-built)
COPY client/dist ./client/dist

# Copy server source
COPY src ./src

EXPOSE 4500

CMD ["node", "src/server.js"]
