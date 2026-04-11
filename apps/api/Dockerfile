FROM node:22-alpine

WORKDIR /app

COPY apps/api/package.json package.json
RUN npm install --omit=dev

COPY apps/api/src ./src

EXPOSE 3000

CMD ["node", "src/server.js"]
