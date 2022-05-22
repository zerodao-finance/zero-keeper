FROM node:lts as build
ARG BUILD_CONTEXT
WORKDIR /
COPY . .
RUN yarn
RUN yarn watcher
