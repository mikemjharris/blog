const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { engine } = require('express-handlebars');
const postHelpers = require('./helpers/source-content');

const app = express();
app.use(compression());

const postsPath = './server/content/posts/';
const posts = postHelpers.getPosts(postsPath);

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.engine(
  '.hbs',
  engine({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: require('../public/javascripts/helpers.js').helpers, // same file that gets used on our client
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/templates/partials'),
  }),
);

app.set('view engine', '.hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

require('./routes/main')(app, posts);

app.get('/{*splat}', (req, res) => {
  res.redirect('../');
});

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .type('text')
    .send('Something went wrong');
});

app.set('port', process.env.PORT || 8000);

const server = app.listen(app.get('port'), () => {
  console.log('Express server listening on port ' + server.address().port);
});
