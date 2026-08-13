import path from 'node:path';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { engine } from 'express-handlebars';
import { getPosts } from './helpers/source-content.ts';
import registerRoutes from './routes/main.ts';
import { securityHeaders } from './security.ts';
import { helpers as blogHelpers } from '../public/javascripts/helpers.ts';

const app = express();

// Nothing to gain from advertising the framework.
app.disable('x-powered-by');
app.use(securityHeaders());
app.use(compression());

const posts = getPosts();

// view engine setup
app.set('views', path.join(import.meta.dirname, 'views'));

app.engine(
  '.hbs',
  engine({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: blogHelpers, // same file that gets used on our client
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

// Anything unmatched is a 404. This used to redirect to the homepage, which made
// every broken link on the site look like it worked — five real ones were hiding
// behind it.
app.use((_req, res) => {
  res.status(404).render('templates/error', {
    title: 'Page not found',
    intro: "The page you were looking for isn't here.",
  });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = err instanceof Error && 'status' in err ? Number(err.status) : 500;
  res.status(Number.isInteger(status) ? status : 500).render('templates/error', {
    title: 'Something went wrong',
    intro: 'That is my fault, not yours.',
  });
};

app.use(errorHandler);

app.set('port', process.env.PORT ?? 8000);

const server = app.listen(app.get('port'), () => {
  const address = server.address();
  const port = typeof address === 'string' ? address : address?.port;
  console.log('Express server listening on port ' + port);
});
