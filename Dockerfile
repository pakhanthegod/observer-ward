FROM node:12-slim

COPY package.json package-lock.json /app/

WORKDIR /app

RUN npm install

CMD ["node", "app.js"]

