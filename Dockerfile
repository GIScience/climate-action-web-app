FROM node:22-alpine AS build

WORKDIR /ca-web-app

COPY package*.json pnpm-lock.yaml ./
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

COPY src/ ./src/
COPY angular.json ./angular.json
COPY tsconfig*.json ./
RUN pnpm run build:prod

FROM nginx:1.29-alpine AS runtime
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /ca-web-app/dist/browser/ /usr/share/nginx/html/

ENV ENVIRONMENT_TYPE=""
ENV CLIMATE_ACTION_API_URL=""
ENV ORS_API_KEY=""
ENV APPWRITE_PROJECT_ID=""
ENV APPWRITE_ENDPOINT=""
ENV APPWRITE_WEBSITE_URL=""

EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]