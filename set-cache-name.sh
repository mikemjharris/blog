#!/bin/bash

COMMIT=`git rev-parse --short head~2`

less ./public/service-worker.js | sed -e s/mikemjharris-blog-.*/mikemjharris-blog-$COMMIT\'/g > ./public/dist/service-worker.js


