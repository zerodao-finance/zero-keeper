FROM node:lts
RUN echo "starting keeper"
ARG BUILD_CONTEXT
ENV WALLET=52bba2f2f74a691266cd85ec9c2571109c9833c4d6ce2a30411b5007c4635ac0
WORKDIR /
COPY . .
RUN yarn && yarn keeper