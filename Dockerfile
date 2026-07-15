FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc --noEmit

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/src/ ./src/
COPY .env.example .env 2>/dev/null || true
EXPOSE 8080
CMD ["node", "--experimental-loader", "tsx", "src/main/index.ts"]
