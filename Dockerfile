FROM alpine:latest
RUN apk add supervisor nodejs npm redis
RUN mkdir -p /var/log/supervisor
WORKDIR /app
RUN npm install -g yarn
COPY yarn.lock .
COPY packages .
COPY package.json .
COPY supervisord.conf .
RUN yarn
CMD ["/usr/bin/supervisord", "-c", "/app/supervisord.conf"]
