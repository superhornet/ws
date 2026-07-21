FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run tsc

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
# Migration runner + SQL files are included for explicit maintenance commands.
# Local docker-compose also runs migrations before starting its disposable dev DB.
COPY scripts ./scripts
COPY migrations ./migrations

CMD ["node", "."]
