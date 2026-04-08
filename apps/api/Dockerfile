FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN yarn install
COPY tsconfig.json ./
COPY src ./src
RUN yarn build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package.json ./
RUN yarn install --production
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
