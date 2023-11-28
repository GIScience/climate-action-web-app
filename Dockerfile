FROM node:20 AS build
ARG BUILD_TARGET=prod

WORKDIR /ca-web-app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY angular.json ./angular.json
COPY tsconfig*.json ./
RUN npm run build:$BUILD_TARGET --omit=dev

FROM httpd:2.4 AS runtime
COPY ./conf/httpd.conf /usr/local/apache2/conf/httpd.conf

COPY --from=build /ca-web-app/dist/ /usr/local/apache2/htdocs/
