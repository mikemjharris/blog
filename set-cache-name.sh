#!/bin/bash

# TODO don't commit the change and run this on build time.# TODO don't commit the change and run this on build time.# TODO don't commit the change and run this on build time.

COMMIT=`git rev-parse --short HEAD`

sed -ie.bak s/mikemjharris-blog-.*/mikemjharris-blog-$COMMIT\'/g  ./public/service-worker.js

git add ./public/service-worker.js

git commit -m 'Bump cache version'
