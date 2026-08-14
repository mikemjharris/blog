# CLAUDE.md

A personal blog: Express + Handlebars, server-side rendered, posts stored as HTML files
rather than in a database. `README.md` covers running it, Docker and the TypeScript setup —
this file covers the layout and the conventions that are easy to get wrong.

## Layout

```
server/
  server.ts              app setup, view engine, 404 and error handlers
  security.ts            helmet config, including the CSP allowlist
  rss.ts                 /rss.xml feed
  routes/main.ts         every route on the site
  helpers/
    source-content.ts    reads and parses posts, sorts them, defines the Post type
    post-search.ts       search and plain-text helpers used by the MCP server
  mcp/                   MCP server exposing the blog to agents, mounted at /mcp
  views/
    layouts/main.hbs     page shell
    templates/*.hbs      one per route
    templates/partials/  _twitter-follow, _twitter-share
  content/posts/         published posts, one HTML file each
  content/drafts/        not served, not tested, not linked
  tests/                 node:test suites plus fixtures
public/
  javascripts/*.ts       browser code, bundled by esbuild
  stylesheets/*.scss     compiled by sass
  images/                post images
  dist/                  build output, gitignored
scripts/
  build.ts               sass + esbuild + Handlebars precompile
  new-post.ts            post scaffolding
  smoke.ts               boots the real server and checks it serves
```

## Creating a post

```
npm run new:post
```

Prompts for each field, Enter takes the bracketed default. Or pass them:

```
npm run new:post -- "Post Title" --intro "One line summary" --tags talk,tech-tips
```

Flags: `--title --intro --category --tags --date --author --image --draft --force --help`.
When stdin is not a tty each unsupplied field takes its default, so it works unattended.

It writes `server/content/posts/<slug>.html` — meta-data block plus a section skeleton with
`TODO` markers. Fill in the TODOs, then `npm run dev` and read it at
`http://localhost:8000/posts/<slug>`.

**The scaffold does not pass `npm test` as generated.** The placeholder `<figure>` points at
`/images/TODO.png`, and `content-links.test.ts` requires every local reference to resolve.
Add the real image to `public/images/` or delete the figure block. The pre-commit hook runs
the tests, so this blocks the commit rather than reaching CI.

## Post conventions

Meta-data is a block of HTML comments at the top of the file, parsed by
`source-content.ts`:

```html
<!-- meta-data title: Adding an RSS feed -->
<!-- meta-data searchtitle: adding-an-rss-feed -->
<!-- meta-data date: 17 Nov 2019 -->
<!-- meta-data intro: Providing the content of my blog via a standard RSS feed -->
<!-- meta-data author: Mike Harris -->
<!-- meta-data category: tech -->
```

- `searchtitle` is the URL slug — `/posts/<searchtitle>`. It matches the filename by
  convention. Changing it on a published post breaks the URL and any inbound links.
- `date` is parsed with `new Date`. Anything it cannot read sorts the post last rather than
  raising, so a typo hides the post at the bottom of the list. `17 Nov 2019` is the usual form.
- `intro` is used in listings, the RSS feed, and the `og:description` / `twitter:description`
  tags. It is not optional in practice.
- `category` is `tech` or `thoughts`. `category.hbs` hardcodes those two sections rather than
  grouping by whatever it finds, so any other value — including a typo — means the post never
  appears on `/category` at all. A genuinely new category needs a template change too.
- `tags` is comma-separated and should be omitted entirely when empty — an empty value parses
  to a single blank tag. Several older posts have this.
- `twitterimage` needs an absolute URL, and is paired with
  `twittercard: summary_large_image`. Without it the card falls back to the site icon.

For the body:

- **Do not repeat the title.** `post.hbs` renders it as the `<h2>`, above the body.
- Section headings are `<h4>` (or `<h3>`). Both are used; `<h4>` is much more common.
- Images live in `public/images/` and are referenced root-relative: `/images/thing.png`.
  Write them that way rather than as absolute URLs — `rss.ts` rewrites root-relative links to
  absolute ones for the feed, and an already-absolute URL bypasses that.
- Captions use `<figure>` / `<figcaption>`, caption before the image.
- Prettier formats post HTML on commit, so do not hand-wrap paragraphs to a column.

## Commands

| command             | does                                                     |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | server under nodemon + asset watcher, port 8000          |
| `npm run new:post`  | scaffold a post                                          |
| `npm test`          | node:test suites                                         |
| `npm run typecheck` | `tsc --noEmit` over both the server and browser projects |
| `npm run build`     | sass, esbuild, Handlebars precompile into `public/dist`  |
| `npm run smoke`     | boot the real server and check it serves                 |
| `npm run format`    | prettier over the repo                                   |

CI runs format check, typecheck, build, test and smoke, then builds the Docker image and
checks it serves.

## Things that bite

- **Posts are read once, at boot.** `getPosts()` runs at startup, so a content change needs a
  restart. nodemon watches `.html`, so `npm run dev` handles it — but a plain `npm start` will
  not pick up an edit.
- **Every local link is checked.** `content-links.test.ts` walks every `href` and `src` in every
  post and asserts it resolves to a registered route, a real slug, or a file in `public/`. The
  check is case-sensitive on purpose: macOS resolves `/images/Foo.png` against `foo.png` and CI's
  Linux box does not. A companion test rejects links to `/posts/<file>.html` — cross-post links
  use the slug, not the source filename.
- **A new third-party embed needs a CSP entry.** `security.ts` allowlists the hosts posts
  actually load from. The policy is report-only today, so a missing host will not break the page
  — it will show up as a violation report and break later when the policy is enforced.
- **`erasableSyntaxOnly` is on.** Node 24 strips types at runtime with no build step, so no
  enums, no namespaces, no parameter properties.
- **Server and browser are separate TS projects.** `tsconfig.json` and `tsconfig.browser.json`.
  `public/javascripts/helpers.ts` is shared and checked under both, which is what keeps it usable
  from either side.
- **Git hooks run in Docker** via `scripts/hook-run.sh`, so they work whatever node is on `PATH`.
  Set `HOOKS_NO_DOCKER=1` to run them on the host when Docker is not up.
- **Drafts are inert.** `content/drafts/` is not served, not linked and not covered by the link
  test. Use `--draft` for work in progress.
