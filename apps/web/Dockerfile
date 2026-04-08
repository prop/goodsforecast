FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN yarn install
COPY tsconfig.json tsconfig.app.json angular.json tailwind.config.js postcss.config.js ./
COPY src ./src
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
