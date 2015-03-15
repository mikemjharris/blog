var ObjectID = require('mongoskin').ObjectID;
var fs = require('fs');



module.exports = function ( app ) {

  // app.get('/posts/:title', function( req, res ) {
  //     var postTitle = req.params.title;

  //     // Is it a directory?
  //     fs.lstat('server/views/templates/posts/' +  postTitle + '.hbs', function(err, stats) {
  //         if (!err && stats.isFile()) {
  //           res.render('templates/posts/' +  postTitle); 
  //         } else {
  //           res.render('templates/posts', { error: 'Hmm - that blog doesn\'t exist. Try another' }); 
  //         }
  //     });
      
  // })

  app.get('/', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('templates/posts' , {posts: data});  
    });
  });

  app.get('/posts', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('templates/posts' , {posts: data});  
    });
  });

   app.get('/posts/new', function( req, res ) {
      res.render('templates/new' );  
 
  });

   app.post('/posts', function( req, res ) {
    var newPost = req.body.post;
    var db = req.db;

    if ( req.body.password === 'password') {
      console.log('ok!')
      db.collection("posts").insert(newPost, function(err, result) {
        res.render('templates/new' );  
      })
    } else {
       res.render('templates/new' );  
    }
  });

  app.get('/posts/:id', function( req, res ) {
    var db = req.db;
    var postId = req.params.id;
    console.log('post', postId)
    // db.collection("posts").find({"_id": new ObjectID(postId)}).toArray(function(err,data) {
    db.collection("posts").find({"searchtitle": postId}).toArray(function(err,data) {
      console.log('post', data)
       res.render('templates/post' , {post: data});
      })
    });  
  

  app.get('/api/posts', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      console.log(data)
      res.json(data)
    });
  });

 

  app.get('/contact', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('templates/contact' , {data: data, title: "Choose a Quiz", game_type: "multi"});  
    });
  });

    app.get('/about', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('templates/about' , {data: data, title: "Choose a Quiz", game_type: "multi"});  
    });
  });

};
