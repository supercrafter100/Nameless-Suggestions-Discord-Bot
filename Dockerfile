FROM node:22-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install -D
COPY . .

RUN npx tsc

CMD ["npm", "run", "start"]
