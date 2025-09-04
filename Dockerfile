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

FROM nginx:1.29-alpine AS runtime
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /ca-web-app/dist/browser/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]