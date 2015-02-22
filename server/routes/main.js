var ObjectID = require('mongoskin').ObjectID;

module.exports = function ( app ) {

  app.get('/', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('home' , {data: data, title: "Choose a Quiz", game_type: "multi"});  
    });
  });

  app.get('/posts', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('templates/posts' , {posts: data});  
    });
  });

  app.get('/posts/:id', function( req, res ) {
    var db = req.db;
    var postId = req.params.id;
    console.log('post', postId)
    // db.collection("posts").find({"_id": new ObjectID(postId)}).toArray(function(err,data) {
    db.collection("posts").find({"searchtitle": postId}).toArray(function(err,data) {
      console.log('post', data)
       res.render('templates/post' , {
        post: data, 
        helpers: {
          test: function() {
            return data;
            }
        }
      })
    });  
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
