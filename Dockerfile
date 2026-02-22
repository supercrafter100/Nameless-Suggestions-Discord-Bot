FROM node:22-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install -D
COPY . .

RUN npm run build

CMD ["npm", "run", "start"]
