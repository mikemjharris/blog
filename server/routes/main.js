module.exports = function ( app ) {

  app.get('/', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('home' , {data: data, title: "Choose a Quiz", game_type: "multi"});  
    });
  });

    app.get('/contact', function( req, res ) {
    var db = req.db;
    db.collection('posts').find().toArray(function (err, data) {
      res.render('contact' , {data: data, title: "Choose a Quiz", game_type: "multi"});  
    });
  });


};
