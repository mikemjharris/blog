var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

var mongo = require('mongoskin');
var mongoUri = process.env.MONGOLAB_URI || "mongodb://localhost:27017/blog";
var db = mongo.db( mongoUri, {native_parser:true} );

var exphbs  = require('express-handlebars');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('layouts', path.join(__dirname, 'views/layouts/'));
// app.set('view engine', 'jade');

app.engine('handlebars', exphbs({
  defaultLayout: 'main', 
  layoutsDir: "server/views/layouts/",
  partialsDir: "server/views/partials/"
}));
app.set('view engine', 'handlebars');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../bower_components')));

app.use(function(req,res,next){
  req.db = db;
  next();
});

require('./routes/main')(app);



app.get('*', function ( req, res, next ) {
  res.redirect('../');
});

app.use(function (req, res, next ) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
  app.use(function ( err, req, res ) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function ( err, req, res ) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.set('port', process.env.PORT || 8000);

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
