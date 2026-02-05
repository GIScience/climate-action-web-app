FROM nginx:1.29-alpine

COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/browser/ /usr/share/nginx/html/

ENV ENVIRONMENT_TYPE=""
ENV CLIMATE_ACTION_API_URL=""
ENV ORS_API_KEY=""
ENV APPWRITE_PROJECT_ID=""
ENV APPWRITE_ENDPOINT=""
ENV APPWRITE_WEBSITE_URL=""

EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]