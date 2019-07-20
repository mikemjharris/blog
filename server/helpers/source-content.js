const fs = require('fs');

const regex = /\<\!\-\-\smeta-data\s([A-z]+)\:\s(.+?(?=-->))/g;

const getPostsFromPath = (path) => {
  let posts = []
  const files = fs.readdirSync(path);
  files.forEach((file) => {
    if (file.match(/.\.html$/)) {
      let post ={ tags: []};
      post.template = file;
      let data = fs.readFileSync(path + file);
      let str = data.toString('utf8');
      let match;

      post.body = str;
      post.searchtitle = file;
      while ( match = regex.exec(str) ) {
        if (match[1].trim() == 'tags') {
          post[ match[ 1 ].trim() ] = match [ 2 ].trim().split(',');
        } else {
          post[ match[ 1 ].trim() ] = match [ 2 ].trim();
        }
      }
      posts.push(post);
      posts = sortPosts(posts);
    }
  })
  return posts;
}


// helper functions
const sortPosts = (posts) =>  {
  return posts.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
}

const getPosts = () => {
  const postsPath = './server/content/posts/';
  return getPostsFromPath(postsPath);
}

module.exports =  { getPosts, getPostsFromPath, sortPosts };
