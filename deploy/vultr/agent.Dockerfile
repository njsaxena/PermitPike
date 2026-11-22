FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json ./
RUN npm install --global "$(node -p 'require("./package.json").packageManager')"
COPY . .
RUN pnpm --filter '@permitpike/agent...' install --frozen-lockfile
RUN pnpm --filter @permitpike/agent build

FROM node:24-bookworm-slim

# Mastra can reference generated workspace modules by absolute path.
COPY --from=build --chown=node:node /app /app
WORKDIR /app/agent
USER node
ENV NODE_ENV=production
EXPOSE 4111
CMD ["node", ".mastra/output/index.mjs"]
