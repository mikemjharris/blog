import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPosts, getPostsFromPath, sortPosts } from '../helpers/source-content.ts';
import type { Post } from '../helpers/source-content.ts';

const FIXTURES = './server/tests/fixtures/test-posts/';

const post = (overrides: Partial<Post> = {}): Post => ({
  template: 'test.html',
  body: '',
  searchtitle: 'test',
  tags: [],
  ...overrides,
});

test('only gets html files from path', () => {
  const posts = getPostsFromPath(FIXTURES);
  assert.equal(posts.length, 1);
});

test('meta data is parsed correctly', () => {
  const [parsed] = getPostsFromPath(FIXTURES);
  assert.ok(parsed);
  assert.equal(parsed.title, 'Test post');
  assert.equal(parsed.searchtitle, 'test-post');
  assert.equal(parsed.date, '24 Dec 2015');
  assert.equal(parsed.intro, 'Test post intro');
  assert.equal(parsed.author, 'Mike Harris');
  assert.equal(parsed.category, 'thoughts');
});

test('sort posts puts the newest first regardless of input order', () => {
  const older = post({ searchtitle: 'older', date: '1 Jan 2020' });
  const newer = post({ searchtitle: 'newer', date: '1 Jan 2024' });

  assert.deepEqual(
    sortPosts([older, newer]).map((p) => p.searchtitle),
    ['newer', 'older'],
  );
  assert.deepEqual(
    sortPosts([newer, older]).map((p) => p.searchtitle),
    ['newer', 'older'],
  );
});

test('sort posts puts an unparseable date last rather than throwing', () => {
  const dated = post({ searchtitle: 'dated', date: '1 Jan 2020' });
  const undated = post({ searchtitle: 'undated' });

  assert.deepEqual(
    sortPosts([undated, dated]).map((p) => p.searchtitle),
    ['dated', 'undated'],
  );
});

test('check getPosts returns production posts', () => {
  assert.ok(getPosts().length > 20);
});
