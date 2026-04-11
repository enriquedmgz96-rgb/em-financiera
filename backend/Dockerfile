FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

ENV NODE_ENV=production
ENV TZ=America/Argentina/Cordoba

EXPOSE 3001

CMD ["node", "src/app.js"]
