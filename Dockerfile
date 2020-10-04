FROM node:14-alpine

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY ./src/ src/

RUN npm ci
RUN npm run build

CMD ["npm", "run", "production"]
