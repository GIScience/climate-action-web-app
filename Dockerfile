FROM nginx:1.31-alpine-slim
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/browser/ /usr/share/nginx/html/

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