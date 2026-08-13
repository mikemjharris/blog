#!/usr/bin/env sh
# Runs a hook command inside a Node 24 container so the git hooks do not depend on
# whatever node happens to be on PATH. Falls back to the host when docker is not
# available, and can be turned off entirely with HOOKS_NO_DOCKER=1.
#
# The container gets its own node_modules in a named volume: the host's is built for
# the host's platform, and esbuild ships a platform-specific binary, so the two
# cannot be shared.
set -eu

IMAGE=node:24-slim
VOLUME=blog-node-modules

# Set HOOKS_NO_DOCKER=1 to run on the host instead — needed if docker is not
# running. Deliberately not probing the daemon first: `docker info` costs about
# half a second, which is most of the overhead when three jobs each pay it, and
# silently falling back would hide a failing check behind a different node.
if [ "${HOOKS_NO_DOCKER:-0}" = "1" ] || ! command -v docker >/dev/null 2>&1; then
  exec "$@"
fi

exec docker run --rm --init \
  -v "$(pwd):/app" \
  -v "$VOLUME:/app/node_modules" \
  -w /app \
  "$IMAGE" \
  sh -c '
    # Reinstall only when the lockfile has moved since the volume was last filled.
    if ! cmp -s package-lock.json node_modules/.lock-stamp; then
      echo "hook-run: lockfile changed, installing dependencies in the container"
      npm ci --no-audit --no-fund --silent
      cp package-lock.json node_modules/.lock-stamp
    fi
    exec "$@"
  ' hook-run "$@"
