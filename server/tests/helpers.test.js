const postHelpers = require('../helpers/source-content');

test('only gets html files from path', () => {
    const posts = postHelpers.getPostsFromPath('./server/tests/fixtures/test-posts/');
    expect(posts.length).toBe(1);
});
