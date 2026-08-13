import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as search from '../helpers/post-search.ts';
import { getPosts } from '../helpers/source-content.ts';
import type { Post } from '../helpers/source-content.ts';

const kelpPost: Post = {
  template: 'farming-kelp.html',
  title: 'Farming Kelp',
  searchtitle: 'farming-kelp',
  date: '4 May 2021',
  category: 'tech',
  tags: ['kelp', ' seaweed '],
  intro: 'Growing kelp at Coral Bay',
  body: '<!-- meta-data title: Farming Kelp --><p>Kelp grows fast in Coral Bay.</p>',
};

const anemonePost: Post = {
  template: 'anemone-notes.html',
  title: 'Anemone Notes',
  searchtitle: 'anemone-notes',
  date: '7 Jun 2022',
  category: 'thoughts ',
  tags: [''],
  intro: 'On anemones',
  body: '<p>An aside about kelp.</p>',
};

const posts = [anemonePost, kelpPost];
const slugs = (results: search.PostSummary[]): string[] =>
  results.map((result) => result.searchtitle);

describe('toPlainText', () => {
  test('strips meta-data comments and tags', () => {
    assert.equal(search.toPlainText(kelpPost.body), 'Kelp grows fast in Coral Bay.');
  });

  test('drops embedded iframes entirely', () => {
    const html = '<p>Watch</p><iframe src="https://youtube.com/embed/abc"></iframe>';
    assert.equal(search.toPlainText(html), 'Watch');
  });

  test('keeps link destinations alongside their label', () => {
    const html = '<p>Bought a <a href="https://reef.example/kelp">kelp trimmer</a> today</p>';
    assert.equal(
      search.toPlainText(html),
      'Bought a kelp trimmer (https://reef.example/kelp) today',
    );
  });

  test('makes relative links absolute', () => {
    const html = '<a href="/posts/tuna-turner">earlier post</a>';
    assert.equal(
      search.toPlainText(html),
      'earlier post (https://blog.mikemjharris.com/posts/tuna-turner)',
    );
  });

  test('decodes html entities', () => {
    assert.equal(search.toPlainText('<p>Cod &amp; Salmon &lt;3</p>'), 'Cod & Salmon <3');
  });
});

describe('searchPosts', () => {
  test('ranks a title match above a passing body mention', () => {
    const results = search.searchPosts(posts, { query: 'kelp' });
    assert.deepEqual(slugs(results), ['farming-kelp', 'anemone-notes']);
  });

  test('excludes posts that match no term', () => {
    assert.deepEqual(search.searchPosts(posts, { query: 'dolphin' }), []);
  });

  test('respects the limit', () => {
    assert.equal(search.searchPosts(posts, { query: 'kelp', limit: 1 }).length, 1);
  });

  test('filters by category despite trailing whitespace in meta-data', () => {
    const results = search.searchPosts(posts, { query: 'kelp', category: 'thoughts' });
    assert.deepEqual(slugs(results), ['anemone-notes']);
  });

  test('filters by tag ignoring surrounding whitespace', () => {
    const results = search.searchPosts(posts, { query: 'kelp', tag: 'seaweed' });
    assert.deepEqual(slugs(results), ['farming-kelp']);
  });

  test('an empty query falls back to a filtered listing', () => {
    const results = search.searchPosts(posts, { query: '', category: 'tech' });
    assert.deepEqual(slugs(results), ['farming-kelp']);
  });
});

describe('listPosts', () => {
  test('since filter excludes older posts', () => {
    const results = search.listPosts(posts, { since: '1 Jan 2022' });
    assert.deepEqual(slugs(results), ['anemone-notes']);
  });

  test('summaries expose a public url and drop empty tags', () => {
    const [post] = search.listPosts(posts, { category: 'thoughts' });
    assert.ok(post);
    assert.equal(post.url, 'https://blog.mikemjharris.com/posts/anemone-notes');
    assert.deepEqual(post.tags, []);
  });
});

describe('categories', () => {
  test('counts posts per normalised category', () => {
    assert.deepEqual(search.categories(posts), { tech: 1, thoughts: 1 });
  });
});

describe('findPost', () => {
  test('finds by slug and returns undefined when absent', () => {
    assert.equal(search.findPost(posts, 'farming-kelp'), kelpPost);
    assert.equal(search.findPost(posts, 'no-such-post'), undefined);
  });
});

describe('production content', () => {
  test('every post has the meta-data the MCP tools depend on', () => {
    const incomplete = getPosts().filter(
      (post) => !post.title || !post.searchtitle || !post.date || !post.category,
    );
    assert.deepEqual(
      incomplete.map((post) => post.template),
      [],
    );
  });

  test('categories stay to a known set', () => {
    assert.deepEqual(Object.keys(search.categories(getPosts())).sort(), ['tech', 'thoughts']);
  });
});
