FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-color

COPY public ./public
COPY server ./server
COPY scripts ./scripts

RUN npm run build


FROM node:24-slim

LABEL org.opencontainers.image.authors="Mike Harris <hello@mikemjharris.com>"

WORKDIR /var/www
ENV NODE_ENV=production

# Runtime dependencies only — the build toolchain stays in the build stage.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-color && npm cache clean --force

COPY server ./server
COPY public ./public
COPY --from=build /app/public/dist ./public/dist

RUN mkdir -p /var/log/www/
VOLUME /var/log/www/

EXPOSE 8000

CMD ["npm", "start"]
