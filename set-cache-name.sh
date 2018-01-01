#!/bin/bash

COMMIT=`git rev-parse --short head`

less ./public/compile/service-worker.js | sed -e s/mikemjharris-blog-.*/mikemjharris-blog-$COMMIT\'/g > ./public/service-worker.js


