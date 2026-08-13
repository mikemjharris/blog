import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed, absolutiseUrls, toRfc822 } from '../rss.ts';
import { getPosts } from '../helpers/source-content.ts';
import type { Post } from '../helpers/source-content.ts';

const BASE = 'https://blog.mikemjharris.com';

const post = (overrides: Partial<Post> = {}): Post => ({
  template: 'farming-kelp.html',
  title: 'Farming Kelp',
  searchtitle: 'farming-kelp',
  date: '4 May 2021',
  category: 'tech',
  intro: 'Growing kelp at Coral Bay',
  tags: [],
  body: '<p>Kelp.</p>',
  ...overrides,
});

const NOW = new Date('2026-05-16T10:00:00Z');

describe('absolutiseUrls', () => {
  test('rewrites root-relative image sources', () => {
    assert.equal(
      absolutiseUrls('<img src="/images/kelp.jpg" />'),
      `<img src="${BASE}/images/kelp.jpg" />`,
    );
  });

  test('rewrites root-relative links', () => {
    assert.equal(
      absolutiseUrls('<a href="/posts/anemone">anemone</a>'),
      `<a href="${BASE}/posts/anemone">anemone</a>`,
    );
  });

  test('leaves protocol-relative urls alone', () => {
    // Without a lookahead these become https://blog.mikemjharris.com//codepen.io/...
    const html = '<script src="//codepen.io/embed/ei.js"></script>';
    assert.equal(absolutiseUrls(html), html);
  });

  test('leaves absolute urls alone', () => {
    const html = '<a href="https://example.com/reef">reef</a>';
    assert.equal(absolutiseUrls(html), html);
  });

  test('leaves anchors and relative paths alone', () => {
    const html = '<a href="#summary">jump</a><a href="other.html">other</a>';
    assert.equal(absolutiseUrls(html), html);
  });
});

describe('toRfc822', () => {
  test('converts a display date to the format the spec requires', () => {
    assert.equal(toRfc822('4 May 2021'), 'Tue, 04 May 2021 00:00:00 GMT');
  });

  test('returns undefined for a date that will not parse', () => {
    assert.equal(toRfc822('not a date'), undefined);
    assert.equal(toRfc822(undefined), undefined);
  });
});

describe('buildFeed', () => {
  const feed = (posts: Post[]): string => buildFeed(posts, NOW);

  test('emits pubDate in RFC-822, not the display format', () => {
    const xml = feed([post()]);
    assert.match(xml, /<pubDate>Tue, 04 May 2021 00:00:00 GMT<\/pubDate>/);
    assert.doesNotMatch(xml, /<pubDate>4 May 2021<\/pubDate>/);
  });

  test('omits pubDate rather than emitting something unparseable', () => {
    const xml = feed([post({ date: 'sometime last spring' })]);
    assert.doesNotMatch(xml, /<pubDate>/);
    // The item itself still makes it into the feed.
    assert.match(xml, /<title>Farming Kelp<\/title>/);
  });

  test('marks the guid as not a permalink, keeping the value stable', () => {
    const xml = feed([post()]);
    assert.match(xml, /<guid isPermaLink="false">farming-kelp<\/guid>/);
  });

  test('absolutises image sources inside the description', () => {
    const xml = feed([post({ body: '<img src="/images/kelp.jpg" />' })]);
    assert.match(xml, /src="https:\/\/blog\.mikemjharris\.com\/images\/kelp\.jpg"/);
  });

  test('lastBuildDate reflects the moment asked for, not process start', () => {
    assert.match(feed([post()]), /<lastBuildDate>Sat, 16 May 2026 10:00:00 GMT<\/lastBuildDate>/);
    const later = buildFeed([post()], new Date('2026-06-01T00:00:00Z'));
    assert.match(later, /<lastBuildDate>Mon, 01 Jun 2026 00:00:00 GMT<\/lastBuildDate>/);
  });

  test('links to the canonical post url', () => {
    assert.match(
      feed([post()]),
      /<link>https:\/\/blog\.mikemjharris\.com\/posts\/farming-kelp<\/link>/,
    );
  });

  test('declares itself as the feed via atom:link', () => {
    assert.match(feed([post()]), /rel="self"/);
    assert.match(feed([post()]), /href="https:\/\/blog\.mikemjharris\.com\/rss\.xml"/);
  });
});

describe('the real feed', () => {
  const xml = buildFeed(getPosts(), NOW);

  test('every item carries a pubDate', () => {
    const items = (xml.match(/<item>/g) ?? []).length;
    const dates = (xml.match(/<pubDate>/g) ?? []).length;
    assert.ok(items > 20, `expected a real feed, got ${items} items`);
    assert.equal(dates, items, 'every post should have a parseable date');
  });

  test('no root-relative urls survive into the feed', () => {
    // This is the bug that broke every image for subscribers.
    assert.doesNotMatch(xml, /(href|src)="\/(?!\/)/);
  });

  test('protocol-relative embeds survive the rewrite', () => {
    // The codepen embeds are written `src="//codepen.io/..."`. A rewrite without a
    // lookahead turns them into https://blog.mikemjharris.com//codepen.io/...
    assert.match(xml, /src="\/\/codepen\.io/);
    assert.doesNotMatch(xml, /blog\.mikemjharris\.com\/\/codepen/);
  });
});
