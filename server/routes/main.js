var notFound = {
  title: '404',
  intro: 'the page you were looking for wasn\'t found'
};

module.exports = function ( app, posts ) {

  app.get('/', function( req, res ) {
    res.render('templates/home' , { posts: posts, latestPost: posts[ 0 ]  });
  });

  app.get('/posts', function( req, res ) {
    res.render('templates/posts' , { posts: posts });
  });

  app.get('/posts/top', function( req, res ) {
    res.render('templates/posts' , { posts: posts });
  });

  app.get('/category', function( req, res ) {
    res.render('templates/category' , { posts: posts });
  });

  app.get('/posts/:id', function( req, res ) {
    var postId = req.params.id;
    var postToShow = notFound;

    posts.forEach(function ( post ) {
      if ( post.searchtitle === postId ) {
        postToShow = post;
      }
    });
    res.render('templates/post' , { post: postToShow });
  });

  app.get('/contact', function( req, res ) {
    res.render('templates/contact');
  });

  app.get('/about', function( req, res ) {
    res.render('templates/about');
  });

  // API
  app.get('/api/posts', function( req, res ) {
    res.json(posts);
  });

};
