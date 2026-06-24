FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/

RUN npm install && cd client && npm install && cd ..

COPY . .

RUN npm run build

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/index.js"]
