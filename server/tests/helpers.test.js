const postHelpers = require('../helpers/source-content');

test('only gets html files from path', () => {
    const posts = postHelpers.getPostsFromPath('./server/tests/fixtures/test-posts/');
    expect(posts.length).toBe(1);
});

test('meta data is parsed correctly', () => {
    const posts = postHelpers.getPostsFromPath('./server/tests/fixtures/test-posts/');
    expect(posts[0].title).toEqual('Test post');
    expect(posts[0].searchtitle).toEqual('test-post');
    expect(posts[0].date).toEqual('24 Dec 2015');
    expect(posts[0].intro).toEqual('Test post intro');
    expect(posts[0].author).toEqual('Mike Harris');
    expect(posts[0].category).toEqual('thoughts');
});
