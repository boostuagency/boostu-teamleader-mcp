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
# Provide TEAMLEADER_CLIENT_ID / TEAMLEADER_CLIENT_SECRET / TEAMLEADER_REFRESH_TOKEN
# at runtime to actually call the Teamleader Focus API.
ENTRYPOINT ["node", "dist/index.js"]
