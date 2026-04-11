FROM node:22-alpine

WORKDIR /app

COPY apps/bot/package.json package.json
RUN npm install --omit=dev

COPY apps/bot/src ./src

CMD ["node", "src/bot.js"]
