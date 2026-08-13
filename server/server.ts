import path from 'node:path';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { engine } from 'express-handlebars';
import { getPosts } from './helpers/source-content.ts';
import registerRoutes from './routes/main.ts';
import blogHelpers from '../public/javascripts/helpers.cjs';

const app = express();
app.use(compression());

const posts = getPosts();

// view engine setup
app.set('views', path.join(import.meta.dirname, 'views'));

app.engine(
  '.hbs',
  engine({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: blogHelpers.helpers, // same file that gets used on our client
    layoutsDir: path.join(import.meta.dirname, 'views/layouts'),
    partialsDir: path.join(import.meta.dirname, 'views/templates/partials'),
  }),
);

app.set('view engine', '.hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(import.meta.dirname, '../public')));

registerRoutes(app, posts);

app.get('/{*splat}', (_req, res) => {
  res.redirect('../');
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = err instanceof Error && 'status' in err ? Number(err.status) : 500;
  res
    .status(Number.isInteger(status) ? status : 500)
    .type('text')
    .send('Something went wrong');
};

app.use(errorHandler);

app.set('port', process.env.PORT ?? 8000);

const server = app.listen(app.get('port'), () => {
  const address = server.address();
  const port = typeof address === 'string' ? address : address?.port;
  console.log('Express server listening on port ' + port);
});
