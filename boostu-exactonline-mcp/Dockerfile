# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
# The server starts and answers MCP introspection without credentials.
# Provide EXACT_CLIENT_ID / EXACT_CLIENT_SECRET / EXACT_REFRESH_TOKEN at runtime
# to actually call the Exact Online API. Mount a volume for EXACT_TOKEN_STORE so
# the rotated refresh token survives container restarts.
ENTRYPOINT ["node", "dist/index.js"]
