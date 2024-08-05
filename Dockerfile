FROM node:20
MAINTAINER Mike Harris "hello@mikemjharris.com"

RUN  npm --no-color install -g gulp

ADD package.json /tmp/package.json
RUN cd /tmp && npm --no-color install
RUN mkdir -p /var/www/ && cp -a /tmp/node_modules /var/www/


RUN mkdir -p /var/log/www/
VOLUME /var/log/www/

ADD . /var/www/

WORKDIR /var/www/

# was getting a weird errro around handle bars template.  Doing another npm instll here (it's fast) seems to fix
RUN npm install
RUN gulp --no-color 

CMD npm start

EXPOSE 8000

