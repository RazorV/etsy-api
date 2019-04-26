FROM node:11.14.0-alpine

MAINTAINER Wetelo, Inc. <i@wetelo.com>

WORKDIR /app

COPY . /app

COPY package.json /app/package.json

RUN npm install

VOLUME /token

EXPOSE 4444 4444

CMD npm start