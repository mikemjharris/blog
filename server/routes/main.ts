import type { Express } from 'express';
import { Builder } from 'xml2js';
import { mountMcp } from '../mcp/route.ts';
import type { Post } from '../helpers/source-content.ts';

const date = new Date();

export default (app: Express, posts: Post[]): void => {
  mountMcp(app, posts);

  app.get('/', (_req, res) => {
    res.render('templates/home', { posts: posts, latestPost: posts[0] });
  });

  app.get('/projects', (_req, res) => {
    res.render('templates/projects', { posts: posts });
  });

  app.get('/posts', (_req, res) => {
    res.render('templates/posts', { posts: posts });
  });

  app.get('/posts/top', (_req, res) => {
    res.render('templates/posts', { posts: posts });
  });

  app.get('/category', (_req, res) => {
    res.render('templates/category', { posts: posts });
  });

  app.get('/talks', (_req, res) => {
    res.render('templates/talks', { posts: posts });
  });

  app.get('/posts/:id', (req, res, next) => {
    const post = posts.find((candidate) => candidate.searchtitle === req.params.id);
    // Fall through to the 404 handler rather than rendering a page that says "not
    // found" while returning 200 — a soft 404 tells crawlers the page is fine.
    if (!post) {
      next();
      return;
    }

    res.render('templates/post', { post });
  });

  app.get('/contact', (_req, res) => {
    res.render('templates/contact');
  });

  app.get('/about', (_req, res) => {
    res.render('templates/about');
  });

  // API
  app.get('/api/posts', (_req, res) => {
    res.json(posts);
  });

  app.get('/rss.xml', (_req, res) => {
    const rss = {
      rss: {
        $: {
          'xmlns:atom': 'http://www.w3.org/2005/Atom',
          version: '2.0',
        },
        channel: {
          title: "MikeMJHarris' Blog",
          link: 'https://blog.mikemjharris.com/',
          description: 'Tech, some creative bits and other thoughts',
          generator: "MikeMJHarris' custom generator",
          language: 'en-us',
          lastBuildDate: date.toUTCString(),
          'atom:link': {
            $: {
              href: 'https://blog.mikemjharris.com/rss.xml',
              rel: 'self',
              type: 'application/rss+xml',
            },
          },
          item: posts.map((post) => ({
            title: post.title,
            link: 'https://blog.mikemjharris.com/posts/' + post.searchtitle,
            pubDate: post.date,
            guid: post.searchtitle,
            description: post.body.replace(/href="\//g, 'href="https://blog.mikemjharris.com/'),
          })),
        },
      },
    };

    const builder = new Builder();
    const xml = builder.buildObject(rss);

    res.set('Content-Type', 'text/xml');
    res.send(xml);
  });
};
