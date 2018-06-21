FROM node:9.10
MAINTAINER Mike Harris "hello@mikemjharris.com"

RUN  npm --no-color install -g gulp


ADD package.json /tmp/package.json
RUN cd /tmp && npm --no-color install
RUN mkdir -p /var/www/ && cp -a /tmp/node_modules /var/www/


RUN mkdir -p /var/log/www/
VOLUME /var/log/www/

ADD . /var/www/

WORKDIR /var/www/

RUN gulp --no-color 

CMD npm start

EXPOSE 8000

