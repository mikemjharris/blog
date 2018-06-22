const fs = require('fs');

const regex = /\<\!\-\-\smeta-data\s([A-z]+)\:\s(.+?(?=-->))/g;

const getPostsFromPath = (path) => {
  let posts = []
  fs.readdir(path, (err, files) => {
    files.forEach((file) => {
      if (file.match(/.html$/)) {
        let post ={};
        post.template = file;
        fs.readFile(path + file, (err, data) => {

          let str = data.toString('utf8');
          let match;

          post.body = str;
          post.searchtitle = file;
          while ( match = regex.exec(str) ) {
            post[ match[ 1 ].trim() ] = match [ 2 ].trim();
          }
          posts.push(post);
          posts = sortPosts(posts);
        });
      }
    });
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

module.exports =  { getPosts: getPosts};
