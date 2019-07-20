const notFound = {
  title: '404',
  intro: 'the page you were looking for wasn\'t found'
};

module.exports = (app, posts) => {

  app.get('/', ( req, res ) => {
    res.render('templates/home' , { posts: posts, latestPost: posts[ 0 ]  });
  });

  app.get('/projects', ( req, res ) => {
    res.render('templates/projects' , { posts: posts });
  });

  app.get('/posts', ( req, res ) => {
    res.render('templates/posts' , { posts: posts });
  });

  app.get('/posts/top', ( req, res ) => {
    res.render('templates/posts' , { posts: posts });
  });

  app.get('/category', ( req, res ) => {
    res.render('templates/category' , { posts: posts });
  });

  app.get('/talks', ( req, res ) => {
    res.render('templates/talks' , { posts: posts });
  });

  app.get('/posts/:id', ( req, res ) => {
    const postId = req.params.id;
    let postToShow = notFound;

    posts.forEach(function ( post ) {
      if ( post.searchtitle === postId ) {
        postToShow = post;
      }
    });
    res.render('templates/post' , { post: postToShow });
  });

  app.get('/contact', ( req, res ) => {
    res.render('templates/contact');
  });

  app.get('/about', ( req, res ) => {
    res.render('templates/about');
  });

  // API
  app.get('/api/posts', ( req, res ) => {
    res.json(posts);
  });

};
