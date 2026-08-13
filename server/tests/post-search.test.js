const search = require('../helpers/post-search');

const kelpPost = {
  title: 'Farming Kelp',
  searchtitle: 'farming-kelp',
  date: '4 May 2021',
  category: 'tech',
  tags: ['kelp', ' seaweed '],
  intro: 'Growing kelp at Coral Bay',
  body: '<!-- meta-data title: Farming Kelp --><p>Kelp grows fast in Coral Bay.</p>',
};

const anemonePost = {
  title: 'Anemone Notes',
  searchtitle: 'anemone-notes',
  date: '7 Jun 2022',
  category: 'thoughts ',
  tags: [''],
  intro: 'On anemones',
  body: '<p>An aside about kelp.</p>',
};

const posts = [anemonePost, kelpPost];

describe('toPlainText', () => {
  test('strips meta-data comments and tags', () => {
    expect(search.toPlainText(kelpPost.body)).toEqual('Kelp grows fast in Coral Bay.');
  });

  test('drops embedded iframes entirely', () => {
    const html = '<p>Watch</p><iframe src="https://youtube.com/embed/abc"></iframe>';
    expect(search.toPlainText(html)).toEqual('Watch');
  });

  test('keeps link destinations alongside their label', () => {
    const html = '<p>Bought a <a href="https://reef.example/kelp">kelp trimmer</a> today</p>';
    expect(search.toPlainText(html)).toEqual(
      'Bought a kelp trimmer (https://reef.example/kelp) today',
    );
  });

  test('makes relative links absolute', () => {
    const html = '<a href="/posts/tuna-turner">earlier post</a>';
    expect(search.toPlainText(html)).toEqual(
      'earlier post (https://blog.mikemjharris.com/posts/tuna-turner)',
    );
  });

  test('decodes html entities', () => {
    expect(search.toPlainText('<p>Cod &amp; Salmon &lt;3</p>')).toEqual('Cod & Salmon <3');
  });
});

describe('searchPosts', () => {
  test('ranks a title match above a passing body mention', () => {
    const results = search.searchPosts(posts, { query: 'kelp' });
    expect(results.map((post) => post.searchtitle)).toEqual(['farming-kelp', 'anemone-notes']);
  });

  test('excludes posts that match no term', () => {
    const results = search.searchPosts(posts, { query: 'dolphin' });
    expect(results).toEqual([]);
  });

  test('respects the limit', () => {
    expect(search.searchPosts(posts, { query: 'kelp', limit: 1 }).length).toBe(1);
  });

  test('filters by category despite trailing whitespace in meta-data', () => {
    const results = search.searchPosts(posts, { query: 'kelp', category: 'thoughts' });
    expect(results.map((post) => post.searchtitle)).toEqual(['anemone-notes']);
  });

  test('filters by tag ignoring surrounding whitespace', () => {
    const results = search.searchPosts(posts, { query: 'kelp', tag: 'seaweed' });
    expect(results.map((post) => post.searchtitle)).toEqual(['farming-kelp']);
  });

  test('an empty query falls back to a filtered listing', () => {
    const results = search.searchPosts(posts, { query: '', category: 'tech' });
    expect(results.map((post) => post.searchtitle)).toEqual(['farming-kelp']);
  });
});

describe('listPosts', () => {
  test('since filter excludes older posts', () => {
    const results = search.listPosts(posts, { since: '1 Jan 2022' });
    expect(results.map((post) => post.searchtitle)).toEqual(['anemone-notes']);
  });

  test('summaries expose a public url and drop empty tags', () => {
    const [post] = search.listPosts(posts, { category: 'thoughts' });
    expect(post.url).toEqual('https://blog.mikemjharris.com/posts/anemone-notes');
    expect(post.tags).toEqual([]);
  });
});

describe('categories', () => {
  test('counts posts per normalised category', () => {
    expect(search.categories(posts)).toEqual({ tech: 1, thoughts: 1 });
  });
});

describe('findPost', () => {
  test('finds by slug and returns undefined when absent', () => {
    expect(search.findPost(posts, 'farming-kelp')).toBe(kelpPost);
    expect(search.findPost(posts, 'no-such-post')).toBeUndefined();
  });
});

describe('production content', () => {
  test('every post has the meta-data the MCP tools depend on', () => {
    const realPosts = require('../helpers/source-content').getPosts();
    const incomplete = realPosts.filter(
      (post) => !post.title || !post.searchtitle || !post.date || !post.category,
    );
    expect(incomplete.map((post) => post.template)).toEqual([]);
  });

  test('categories stay to a known set', () => {
    const realPosts = require('../helpers/source-content').getPosts();
    expect(Object.keys(search.categories(realPosts)).sort()).toEqual(['tech', 'thoughts']);
  });
});
