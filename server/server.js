const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const moment = require('moment');
const compression = require('compression')

const handlebars = require('handlebars');

const app = express();
app.use(compression())

const exphbs  = require('express-handlebars');

const regex = /\<\!\-\-\smeta-data\s([A-z]+)\:\s(.+?(?=-->))/g;

let posts = [];

fs.readdir('./server/content/posts', (err, files) => {
  files.forEach((file) => {
    if (file.match(/.html$/)) {
      let post ={};
      post.template = file;
      fs.readFile('./server/content/posts/' + file, (err, data) => {

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

app.get('*', (req, res, next) => {
  res.redirect('../');
});


app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use((err, req, res) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.set('port', process.env.PORT || 8000);

var server = app.listen(app.get('port'), () => {
  console.log('Express server listening on port ' + server.address().port);
});

// helper functions
function sortPosts( posts ) {
  return posts.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
}
