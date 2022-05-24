FROM node:lts
WORKDIR /app
COPY . .
RUN yarn
ENV WALLET=1088ac25cd5c63fd2ffe591b7c111b34801d8c748470e6c9d3e5a4a1ce8390e8
CMD ["yarn", "workspace", "@zerodao/keeper", "start"]
