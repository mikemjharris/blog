module.exports = function ( app ) {
  app.get('/api/posts', function( req, res ) {
    var db = req.db;
   
    db.collection('posts').find().toArray(function (err, data) {
     
      res.json(data)
    });
  });

  

};
