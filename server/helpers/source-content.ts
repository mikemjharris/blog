import fs from 'node:fs';

/** Meta-data keys carried as `<!-- meta-data key: value -->` at the top of each post. */
const STRING_KEYS = [
  'title',
  'searchtitle',
  'date',
  'intro',
  'author',
  'category',
  'twitterimage',
  'twittercard',
  'twitterplayer',
] as const;

type StringKey = (typeof STRING_KEYS)[number];

const isStringKey = (key: string): key is StringKey =>
  (STRING_KEYS as readonly string[]).includes(key);

export interface Post extends Partial<Record<StringKey, string>> {
  /** Source filename, e.g. `three-key-keyboard.html`. */
  template: string;
  /** Raw HTML of the post. */
  body: string;
  /** Slug used in URLs — defaults to the filename until meta-data overrides it. */
  searchtitle: string;
  tags: string[];
}

const META_DATA = /<!--\smeta-data\s([A-z]+):\s(.+?(?=-->))/g;

/** Posts sort newest first; an unparseable date sorts last rather than throwing. */
const timestamp = (date: string | undefined): number => {
  const parsed = date ? new Date(date).getTime() : Number.NaN;
  return Number.isNaN(parsed) ? -Infinity : parsed;
};

export const sortPosts = (posts: Post[]): Post[] =>
  posts.sort((a, b) => timestamp(b.date) - timestamp(a.date));

const parsePost = (file: string, source: string): Post => {
  const post: Post = {
    template: file,
    body: source,
    searchtitle: file,
    tags: [],
  };

  // The regex is module-level and /g, so reset it rather than carry lastIndex between posts.
  META_DATA.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = META_DATA.exec(source)) !== null) {
    const key = match[1]?.trim();
    const value = match[2]?.trim();
    if (!key || value === undefined) continue;

    if (key === 'tags') {
      post.tags = value.split(',');
    } else if (key === 'date') {
      post.date = new Date(value).toLocaleDateString('en-UK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } else if (isStringKey(key)) {
      post[key] = value;
    }
  }

  return post;
};

export const getPostsFromPath = (path: string): Post[] => {
  const posts: Post[] = [];

  for (const file of fs.readdirSync(path)) {
    if (!/.\.html$/.test(file)) continue;
    posts.push(parsePost(file, fs.readFileSync(path + file, 'utf8')));
  }

  return sortPosts(posts);
};

export const getPosts = (): Post[] => getPostsFromPath('./server/content/posts/');
