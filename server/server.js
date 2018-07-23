const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const moment = require('moment');
const compression = require('compression')
const postHelpers = require('./helpers/source-content');
const handlebars = require('handlebars');
const graphqlHTTP = require('express-graphql');
const { buildSchema, GraphQLObjectType, GraphQLString, GraphQLDateTime } = require('graphql');

const app = express();
app.use(compression())

const exphbs  = require('express-handlebars');


const postsPath = './server/content/posts/';
const posts = postHelpers.getPosts(postsPath);

const getPosts = () => { return posts; };

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

const schema = buildSchema(`
    type Query {
      posts: [Post]
    },
    type Post {
      title: String,
      searchtitle: String,
      date: String
      intro: String,
      author: String,
      category: String
      }
  `);

const postType = new GraphQLObjectType({
    name: 'post',
      fields: () => ({
        title: { type: GraphQLString },
        date: { type: GraphQLDateTime }
      })
});

const root = {
  posts: getPosts,
};

app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));

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
