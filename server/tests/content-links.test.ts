// Every local link and asset reference in a post should resolve to something real.
// A broken one is invisible in the browser because the catch-all route redirects
// anything unmatched to the homepage, so it looks like it worked.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import registerRoutes from '../routes/main.ts';
import { getPosts } from '../helpers/source-content.ts';

const POSTS_DIR = 'server/content/posts/';
const PUBLIC_DIR = 'public';

const posts = getPosts();
const slugs = new Set(posts.map((post) => post.searchtitle));

interface Ref {
  file: string;
  url: string;
}

/** Route paths the app actually registers, rather than a hardcoded list that would drift. */
const registeredRoutes = (): Set<string> => {
  const app = express();
  registerRoutes(app, posts);
  const stack = (app as unknown as { router: { stack: { route?: { path: string } }[] } }).router
    .stack;
  return new Set(stack.flatMap((layer) => (layer.route ? [layer.route.path] : [])));
};

/**
 * Case-sensitive existence check. macOS would happily resolve `/images/Foo.png`
 * against `foo.png`; the Linux box CI runs on would not.
 */
const fileExists = (relative: string): boolean => {
  const full = path.join(PUBLIC_DIR, relative);
  const dir = path.dirname(full);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).includes(path.basename(full));
};

const localRefs = (): Ref[] => {
  const refs: Ref[] = [];

  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!file.endsWith('.html')) continue;
    const source = fs.readFileSync(POSTS_DIR + file, 'utf8');

    for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const raw = match[1];
      if (!raw) continue;
      // Skip absolute and protocol-relative URLs, anchors and mailto:.
      if (!raw.startsWith('/') || raw.startsWith('//')) continue;
      const url = raw.replace(/&amp;/g, '&').split(/[?#]/)[0];
      if (url) refs.push({ file, url });
    }
  }

  return refs;
};

test('every local reference in a post resolves to a file, a route or a real post', () => {
  const routes = registeredRoutes();
  const refs = localRefs();

  // Guard against the matcher silently finding nothing and the test passing vacuously.
  assert.ok(refs.length > 50, `expected plenty of local refs, found ${refs.length}`);

  const broken = refs.filter(({ url }) => {
    if (fileExists(url)) return false;
    if (routes.has(url)) return false;
    // `/posts/:id` is a real route, but the slug still has to exist.
    const post = /^\/posts\/([^/]+)$/.exec(url);
    if (post?.[1] && slugs.has(post[1])) return false;
    return true;
  });

  assert.deepEqual(
    broken.map(({ file, url }) => `${file} -> ${url}`),
    [],
  );
});

test('post links point at slugs rather than source filenames', () => {
  // `/posts/adding-tags.html` would 302 to the homepage rather than 404, so it is
  // worth calling out separately from a plain missing slug.
  const filenameLinks = localRefs().filter(({ url }) => /^\/posts\/.+\.html$/.test(url));

  assert.deepEqual(
    filenameLinks.map(({ file, url }) => `${file} -> ${url}`),
    [],
  );
});
