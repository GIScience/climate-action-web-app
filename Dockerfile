FROM node:20 AS build

WORKDIR /ca-web-app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY angular.json ./angular.json
COPY tsconfig*.json ./
RUN npm run build:prod --omit=dev

FROM httpd:2.4 AS runtime

COPY --from=build /ca-web-app/dist/ /usr/local/apache2/htdocs/
