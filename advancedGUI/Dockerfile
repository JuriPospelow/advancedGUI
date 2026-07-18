FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache tini

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install tsx

COPY src/ ./src/
COPY .auth.json ./

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "src/main/index.ts"]
