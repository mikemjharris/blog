// Search and plain-text helpers used by the MCP server to make posts readable by agents.

const BASE_URL = 'https://blog.mikemjharris.com';

const ENTITIES = {
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

const absoluteUrl = (href) => (href.startsWith('/') ? BASE_URL + href : href);

// Keep the destination of links - the posts lean on them heavily and a bare
// anchor label tells a reader nothing about where it pointed.
const inlineLink = (label, href) => {
  const text = label.replace(/<[^>]+>/g, '').trim();
  if (!href || href.startsWith('#')) return text;
  const url = absoluteUrl(href);
  return text && text !== url ? `${text} (${url})` : url;
};

// Posts are authored as HTML fragments - agents want the prose, not the markup.
const toPlainText = (html) => {
  if (!html) return '';

  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, label) =>
      inlineLink(label, href),
    )
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|section)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] || entity)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const normaliseTags = (tags) => (tags || []).map((tag) => tag.trim()).filter(Boolean);

// The odd post has a typo or trailing whitespace in its meta-data - match forgivingly.
const normaliseCategory = (category) => (category || '').trim().toLowerCase();

const postUrl = (post) => `${BASE_URL}/posts/${post.searchtitle}`;

const summarise = (post) => ({
  title: post.title,
  searchtitle: post.searchtitle,
  date: post.date,
  category: normaliseCategory(post.category),
  tags: normaliseTags(post.tags),
  intro: post.intro,
  url: postUrl(post),
});

const terms = (query) =>
  (query || '')
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 1);

const countMatches = (haystack, term) => {
  if (!haystack) return 0;
  return haystack.toLowerCase().split(term).length - 1;
};

// Weighted so a term in the title beats a passing mention in the body.
const scorePost = (post, queryTerms) => {
  const title = post.title || '';
  const intro = post.intro || '';
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

const matchesFilters = (post, { category, tag }) => {
  if (category && normaliseCategory(post.category) !== normaliseCategory(category)) return false;
  if (tag) {
    const wanted = tag.trim().toLowerCase();
    const has = normaliseTags(post.tags).some((postTag) => postTag.toLowerCase() === wanted);
    if (!has) return false;
  }
  return true;
};

const searchPosts = (posts, { query, category, tag, limit = 10 } = {}) => {
  const queryTerms = terms(query);
  const filtered = posts.filter((post) => matchesFilters(post, { category, tag }));

  // With no query this degrades to a plain filtered listing, which is what callers expect.
  if (!queryTerms.length) return filtered.slice(0, limit).map(summarise);

  return filtered
    .map((post) => ({ post, score: scorePost(post, queryTerms) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.post.date) - new Date(a.post.date))
    .slice(0, limit)
    .map((result) => Object.assign(summarise(result.post), { score: result.score }));
};

const listPosts = (posts, { category, tag, since, limit = 20 } = {}) => {
  const sinceDate = since ? new Date(since) : null;

  return posts
    .filter((post) => matchesFilters(post, { category, tag }))
    .filter((post) => !sinceDate || new Date(post.date) >= sinceDate)
    .slice(0, limit)
    .map(summarise);
};

const findPost = (posts, searchtitle) => posts.find((post) => post.searchtitle === searchtitle);

const categories = (posts) => {
  const counts = {};
  posts.forEach((post) => {
    const category = normaliseCategory(post.category);
    if (category) counts[category] = (counts[category] || 0) + 1;
  });
  return counts;
};

module.exports = {
  BASE_URL,
  toPlainText,
  normaliseTags,
  normaliseCategory,
  postUrl,
  summarise,
  scorePost,
  searchPosts,
  listPosts,
  findPost,
  categories,
};
