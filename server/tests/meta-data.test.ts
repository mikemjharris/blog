// Parsing of the `<!-- meta-data key: value -->` headers. The older fixture only
// covered the six always-present string keys, and its date happened to be written
// in the same format the parser outputs — so the date assertion passed whether or
// not the conversion ran at all.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getPostsFromPath } from '../helpers/source-content.ts';
import type { Post } from '../helpers/source-content.ts';

const FIXTURES = './server/tests/fixtures/meta-data/';

const load = (template: string): Post => {
  const post = getPostsFromPath(FIXTURES).find((candidate) => candidate.template === template);
  assert.ok(post, `fixture ${template} not found`);
  return post;
};

describe('dates', () => {
  test('reformats the authored date rather than passing it through', () => {
    // `21 July 2019` -> `21 Jul 2019`: input and output genuinely differ, so this
    // fails if the toLocaleDateString call is removed.
    assert.equal(load('full-meta.html').date, '21 Jul 2019');
  });

  test('leaves a date already in the output format alone', () => {
    assert.equal(load('sparse-meta.html').date, '4 May 2021');
  });

  test('a long month name is shortened', () => {
    assert.equal(load('untidy-meta.html').date, '3 Mar 2020');
  });
});

describe('tags', () => {
  test('splits on commas into an array', () => {
    const { tags } = load('full-meta.html');
    assert.equal(tags.length, 3);
    assert.deepEqual(tags, ['kelp', ' seaweed ', ' coral']);
  });

  test('surrounding whitespace survives parsing and is normalised downstream', () => {
    // Deliberate: the parser splits only, and normaliseTags in post-search trims.
    // Pinning it here so a change to either side is a visible decision.
    const { tags } = load('full-meta.html');
    assert.ok(
      tags.some((tag) => tag !== tag.trim()),
      'expected the raw split to preserve whitespace',
    );
  });

  test('a post with no tags key gets an empty array, not undefined', () => {
    assert.deepEqual(load('sparse-meta.html').tags, []);
  });
});

describe('optional twitter keys', () => {
  test('are parsed when present', () => {
    const post = load('full-meta.html');
    assert.equal(post.twitterimage, 'https://blog.example.com/images/kelp.png');
    assert.equal(post.twittercard, 'summary_large_image');
    assert.equal(post.twitterplayer, 'https://blog.example.com/player/kelp');
  });

  test('are absent rather than empty when the post omits them', () => {
    const post = load('sparse-meta.html');
    assert.equal(post.twitterimage, undefined);
    assert.equal(post.twittercard, undefined);
    assert.equal(post.twitterplayer, undefined);
  });
});

describe('whitespace and unknown keys', () => {
  test('trims surrounding whitespace from values', () => {
    const post = load('untidy-meta.html');
    assert.equal(post.title, 'Salmon Rushdie on Deep Blue');
    assert.equal(post.searchtitle, 'salmon-rushdie');
    assert.equal(post.intro, 'Trailing whitespace everywhere');
  });

  test('drops an unrecognised key instead of attaching it to the post', () => {
    const post = load('untidy-meta.html');
    assert.ok(!Object.keys(post).includes('titel'), 'a typo’d key should not become a field');
    // The real title is still parsed, so a typo costs that one field and nothing else.
    assert.equal(post.title, 'Salmon Rushdie on Deep Blue');
  });
});

describe('defaults', () => {
  test('searchtitle falls back to the filename until meta-data overrides it', () => {
    // Every fixture sets searchtitle, so assert the override actually happened
    // rather than the filename leaking through.
    assert.equal(load('full-meta.html').searchtitle, 'farming-kelp');
    assert.notEqual(load('full-meta.html').searchtitle, 'full-meta.html');
  });

  test('body keeps the full source including the meta-data comments', () => {
    const { body } = load('sparse-meta.html');
    assert.match(body, /<!-- meta-data title: Anemone Notes -->/);
    assert.match(body, /<p>An aside about anemones\.<\/p>/);
  });

  test('template records the source filename', () => {
    assert.equal(load('full-meta.html').template, 'full-meta.html');
  });
});

describe('parsing across files', () => {
  test('parses every fixture in the directory, newest first', () => {
    const posts = getPostsFromPath(FIXTURES);
    assert.deepEqual(
      posts.map((post) => post.searchtitle),
      ['anemone-notes', 'salmon-rushdie', 'farming-kelp'],
    );
  });

  test('the regex does not leak state between files', () => {
    // The meta-data regex is module-level and /g, so a stale lastIndex would make
    // the second and third posts parse partially.
    const posts = getPostsFromPath(FIXTURES);
    for (const post of posts) {
      assert.ok(post.title, `${post.template} lost its title`);
      assert.ok(post.category, `${post.template} lost its category`);
    }
  });
});
