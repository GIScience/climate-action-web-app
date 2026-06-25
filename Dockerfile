FROM node:22-slim AS build

WORKDIR /ca-web-app

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY src/ ./src/
COPY angular.json ./angular.json
COPY tsconfig*.json ./
RUN pnpm run build:prod

FROM nginx:1.31-alpine AS runtime
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /ca-web-app/dist/browser/ /usr/share/nginx/html/

ENV ENVIRONMENT_TYPE=""
ENV CLIMATE_ACTION_API_URL=""
ENV GEOCODE_URL=""
ENV GEOCODE_API_KEY=""
ENV HEIGIT_MAPS_URL=""
ENV APPWRITE_PROJECT_ID=""
ENV APPWRITE_ENDPOINT=""
ENV APPWRITE_WEBSITE_URL=""
ENV CACHET_URL=""
ENV CACHET_WATCHED_COMPONENTS=""
ENV SCHEDULE_LOOKAHEAD_DAYS=""

EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]