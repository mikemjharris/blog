var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var moment = require('moment');
var express     = require('express')
var compression = require('compression')

var handlebars = require('handlebars');

var app = express();
app.use(compression())

var exphbs  = require('express-handlebars');

var regex = /\<\!\-\-\smeta-data\s([A-z]+)\:\s(.+?(?=-->))/g;
var posts = [];

fs.readdir('./server/content/posts' , function ( err, files ) {
  files.forEach(function( file ) {
    var post ={};
    post.template = file;
    fs.readFile('./server/content/posts/' + file, function ( err, data ) {

      var str = data.toString('utf8');
      var match;

      post.body = str;
      post.searchtitle = file;
      while ( match = regex.exec(str) ) {
        post[ match[ 1 ].trim() ] = match [ 2 ].trim();
      }
      posts.push(post);
      posts = sortPosts(posts);
    });
  });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('layouts', path.join(__dirname, 'views/layouts/'));

app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: require('../public/javascripts/helpers.js').helpers, // same file that gets used on our client
  layoutsDir: 'server/views/layouts/',
  partialsDir: 'server/views/templates/partials'
}));

app.set('view engine', '.hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../node_modules')));

require('./routes/main')(app, posts);

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

// helper functions
function sortPosts( posts ) {
  return posts.sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });
}
