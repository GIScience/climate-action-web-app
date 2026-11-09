FROM node:24-slim AS build

ARG PNPM_VERSION=12.16.1

WORKDIR /ca-web-app

ENV CYPRESS_INSTALL_BINARY=0
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NG_BUILD_MAX_WORKERS=2
ENV GOMAXPROCS=2

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@${PNPM_VERSION}
RUN pnpm install --frozen-lockfile

COPY src/ ./src/
COPY angular.json ./angular.json
COPY tsconfig*.json ./
# TEMP diagnostic: probe the buildkit pod's memory limit by allocating 256MB chunks until killed; remove once known
RUN node -e 'const held=[];(async()=>{for(let i=1;i<=64;i++){held.push(Buffer.alloc(256<<20,1));console.log(`${i*256} MB held`);await new Promise(r=>setTimeout(r,150))}})()'
RUN pnpm run build:prod

RUN find dist/browser -type f \
        \( -name '*.js' -o -name '*.mjs' -o -name '*.css' -o -name '*.svg' \
        -o -name '*.html' -o -name '*.json' -o -name '*.ttf' \) \
        ! -name 'env.js' ! -name 'env.template.js' -size +1k \
        -exec gzip -9 -k {} +

FROM nginx:1.31-alpine-slim AS runtime
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /ca-web-app/dist/browser/ /usr/share/nginx/html/

ENV ENVIRONMENT_TYPE=""
ENV CLIMATE_ACTION_API_URL=""
ENV GEOCODE_URL=""
ENV GEOCODE_API_KEY=""
ENV HEIGIT_MAPS_URL=""
ENV VALID_COMPUTATIONS_TILES_URL=""
ENV APPWRITE_PROJECT_ID=""
ENV APPWRITE_ENDPOINT=""
ENV APPWRITE_WEBSITE_URL=""
ENV CACHET_URL=""
ENV CACHET_WATCHED_COMPONENTS=""
ENV SCHEDULE_LOOKAHEAD_DAYS=""
ENV FALLBACK_SCHEDULES_URL=""
ENV SUPPORT_EMAIL=""

EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]