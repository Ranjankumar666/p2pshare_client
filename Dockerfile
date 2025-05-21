FROM node:22-alpine

WORKDIR  /app
ENV REACT_APP_RELAY_NODE_ADDRESS=/dns4/p2pshare-relay.onrender.com/tcp/443/wss/p2p/12D3KooWJsdceTSoGhdJfVVnnAkzA3tJGMfPMhcfZtcsUw9vwszn

COPY ./package*.json ./


RUN npm install --no-cache

COPY ./ ./

RUN npm run build

RUN npm i -g serve


EXPOSE 3000

CMD ["serve", "-s", "build"]
