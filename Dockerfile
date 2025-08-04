FROM node:20 AS build
ARG BUILD_TARGET=prod

WORKDIR /ca-web-app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY src/ ./src/
COPY angular.json ./angular.json
COPY tsconfig*.json ./
RUN pnpm run build:$BUILD_TARGET

FROM httpd:2.4 AS runtime
COPY ./conf/httpd.conf /usr/local/apache2/conf/httpd.conf

COPY --from=build /ca-web-app/dist/browser/ /usr/local/apache2/htdocs/
