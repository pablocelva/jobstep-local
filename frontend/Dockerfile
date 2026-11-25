FROM node:24-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.28.7 --activate

COPY package.json ./
RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
