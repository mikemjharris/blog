// Search and plain-text helpers used by the MCP server to make posts readable by agents.

import type { Post } from './source-content.ts';

export const BASE_URL = 'https://blog.mikemjharris.com';

/** A post reduced to the fields an agent needs to decide whether to read it. */
export interface PostSummary {
  title: string | undefined;
  searchtitle: string;
  date: string | undefined;
  category: string;
  tags: string[];
  intro: string | undefined;
  url: string;
}

export interface ScoredPostSummary extends PostSummary {
  score: number;
}

export interface Filters {
  category?: string | undefined;
  tag?: string | undefined;
}

export interface SearchOptions extends Filters {
  query?: string | undefined;
  limit?: number | undefined;
}

export interface ListOptions extends Filters {
  since?: string | undefined;
  limit?: number | undefined;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
};

const absoluteUrl = (href: string): string => (href.startsWith('/') ? BASE_URL + href : href);

// Keep the destination of links - the posts lean on them heavily and a bare
// anchor label tells a reader nothing about where it pointed.
const inlineLink = (label: string, href: string): string => {
  const text = label.replace(/<[^>]+>/g, '').trim();
  if (!href || href.startsWith('#')) return text;
  const url = absoluteUrl(href);
  return text && text !== url ? `${text} (${url})` : url;
};

// Posts are authored as HTML fragments - agents want the prose, not the markup.
export const toPlainText = (html: string | undefined): string => {
  if (!html) return '';

  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) =>
      inlineLink(String(label), String(href)),
    )
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|section)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const normaliseTags = (tags: string[] | undefined): string[] =>
  (tags ?? []).map((tag) => tag.trim()).filter(Boolean);

// The odd post has a typo or trailing whitespace in its meta-data - match forgivingly.
export const normaliseCategory = (category: string | undefined): string =>
  (category ?? '').trim().toLowerCase();

export const postUrl = (post: Post): string => `${BASE_URL}/posts/${post.searchtitle}`;

export const summarise = (post: Post): PostSummary => ({
  title: post.title,
  searchtitle: post.searchtitle,
  date: post.date,
  category: normaliseCategory(post.category),
  tags: normaliseTags(post.tags),
  intro: post.intro,
  url: postUrl(post),
});

const terms = (query: string | undefined): string[] =>
  (query ?? '')
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 1);

const countMatches = (haystack: string, term: string): number => {
  if (!haystack) return 0;
  return haystack.toLowerCase().split(term).length - 1;
};

// Weighted so a term in the title beats a passing mention in the body.
export const scorePost = (post: Post, queryTerms: string[]): number => {
  const title = post.title ?? '';
  const intro = post.intro ?? '';
  const body = toPlainText(post.body);
  const meta = [normaliseCategory(post.category), ...normaliseTags(post.tags)].join(' ');

  return queryTerms.reduce((score, term) => {
    const hits =
      countMatches(title, term) * 10 +
      countMatches(intro, term) * 5 +
      countMatches(meta, term) * 3 +
      countMatches(body, term);
    return score + hits;
  }, 0);
};

const matchesFilters = (post: Post, { category, tag }: Filters): boolean => {
  if (category && normaliseCategory(post.category) !== normaliseCategory(category)) return false;
  if (tag) {
    const wanted = tag.trim().toLowerCase();
    const has = normaliseTags(post.tags).some((postTag) => postTag.toLowerCase() === wanted);
    if (!has) return false;
  }
  return true;
};

/** Newest first, with unparseable dates sorting last rather than throwing. */
const timestamp = (date: string | undefined): number => {
  const parsed = date ? new Date(date).getTime() : Number.NaN;
  return Number.isNaN(parsed) ? -Infinity : parsed;
};

export const searchPosts = (
  posts: Post[],
  { query, category, tag, limit = 10 }: SearchOptions = {},
): PostSummary[] => {
  const queryTerms = terms(query);
  const filtered = posts.filter((post) => matchesFilters(post, { category, tag }));

  // With no query this degrades to a plain filtered listing, which is what callers expect.
  if (!queryTerms.length) return filtered.slice(0, limit).map(summarise);

  return filtered
    .map((post) => ({ post, score: scorePost(post, queryTerms) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || timestamp(b.post.date) - timestamp(a.post.date))
    .slice(0, limit)
    .map((result): ScoredPostSummary => ({ ...summarise(result.post), score: result.score }));
};

export const listPosts = (
  posts: Post[],
  { category, tag, since, limit = 20 }: ListOptions = {},
): PostSummary[] => {
  const sinceDate = since ? new Date(since).getTime() : null;

  return posts
    .filter((post) => matchesFilters(post, { category, tag }))
    .filter((post) => sinceDate === null || timestamp(post.date) >= sinceDate)
    .slice(0, limit)
    .map(summarise);
};

export const findPost = (posts: Post[], searchtitle: string): Post | undefined =>
  posts.find((post) => post.searchtitle === searchtitle);

export const categories = (posts: Post[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  posts.forEach((post) => {
    const category = normaliseCategory(post.category);
    if (category) counts[category] = (counts[category] ?? 0) + 1;
  });
  return counts;
};
