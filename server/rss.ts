import { Builder } from 'xml2js';
import { BASE_URL } from './helpers/post-search.ts';
import type { Post } from './helpers/source-content.ts';

const FEED_URL = `${BASE_URL}/rss.xml`;

/**
 * Post bodies are written with site-root-relative links, which resolve against the
 * reader's own domain once the body is embedded in a feed. The negative lookahead
 * keeps protocol-relative URLs (`src="//codepen.io/..."`) intact — without it they
 * become `https://blog.mikemjharris.com//codepen.io/...`.
 */
export const absolutiseUrls = (html: string): string =>
  html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE_URL}/`);

/**
 * RSS 2.0 wants RFC-822 dates. Posts carry a display date like `21 Jul 2019`, which
 * readers are left to guess at. Returns undefined for a date that will not parse, so
 * the element is omitted rather than emitted as something unparseable.
 */
export const toRfc822 = (date: string | undefined): string | undefined => {
  if (!date) return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;

  // A post date is a calendar day, not an instant. Parsing gives local midnight, so
  // converting that straight to UTC moves the post back a day in any timezone ahead
  // of UTC — a post dated 4 May shows as 3 May to subscribers when the server runs
  // in BST. Rebuild it as UTC midnight so the day is the authored one everywhere.
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  ).toUTCString();
};

interface FeedItem {
  title: string | undefined;
  link: string;
  guid: { _: string; $: { isPermaLink: 'false' } };
  description: string;
  pubDate?: string;
}

const toItem = (post: Post): FeedItem => {
  const item: FeedItem = {
    title: post.title,
    link: `${BASE_URL}/posts/${post.searchtitle}`,
    // The slug is not a URL, and guid defaults to isPermaLink="true". The value is
    // deliberately unchanged: it is the identity readers dedupe on, so changing it
    // would resurface all 76 posts as new.
    guid: { _: post.searchtitle, $: { isPermaLink: 'false' } },
    description: absolutiseUrls(post.body),
  };

  const pubDate = toRfc822(post.date);
  if (pubDate) item.pubDate = pubDate;

  return item;
};

/** `now` is passed in rather than read here so the feed is testable and never stale. */
export const buildFeed = (posts: Post[], now: Date): string =>
  new Builder().buildObject({
    rss: {
      $: {
        'xmlns:atom': 'http://www.w3.org/2005/Atom',
        version: '2.0',
      },
      channel: {
        title: "MikeMJHarris' Blog",
        link: `${BASE_URL}/`,
        description: 'Tech, some creative bits and other thoughts',
        generator: "MikeMJHarris' custom generator",
        language: 'en-us',
        lastBuildDate: now.toUTCString(),
        'atom:link': {
          $: {
            href: FEED_URL,
            rel: 'self',
            type: 'application/rss+xml',
          },
        },
        item: posts.map(toItem),
      },
    },
  });
