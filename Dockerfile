FROM dockerfile/nodejs
MAINTAINER Mike Harris "mike.harris@mammal.io"

RUN npm --no-color install -g bower && \
    npm --no-color install -g gulp && \
    npm --no-color install gulp


ADD package.json /tmp/package.json
RUN cd /tmp && npm --no-color install
RUN mkdir -p /var/www/ && cp -a /tmp/node_modules /var/www/


ADD bower.json /tmp/bower.json
RUN cd /tmp && bower --no-color install --allow-root
RUN mkdir -p /var/www/bower_components/ && cp -a /tmp/bower_components/* /var/www/bower_components/
RUN ls -lah /tmp/bower_components/
RUN ls -lah /var/www/bower_components/

RUN mkdir -p /var/log/www/
VOLUME /var/log/www/

ADD . /var/www/

WORKDIR /var/www/

RUN gulp --no-color sass && \
    gulp --no-color js

CMD npm start

EXPOSE 8000

