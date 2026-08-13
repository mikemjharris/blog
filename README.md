Blog
========================

Base for my online blog - view it here [blog.mikemjharis.com](http://blog.mikemjharris.com) To run pull this repository then run the following commands.

Requires Node 24 (see `.nvmrc`).

```
    npm install
    npm run dev
```

or for prod

```
    npm run build
    npm start
```

`npm run dev` runs the server under nodemon alongside an asset watcher. `npm run build`
compiles the Sass, concatenates and minifies the client JS, precompiles the Handlebars
templates and copies the browser libraries into `public/dist`.

TypeScript
==========

The server, build scripts and tests are TypeScript. There is no compile step — Node 24
strips the types at runtime, so `node server/server.ts` just works. `npm run typecheck`
runs `tsc --noEmit` to check them, and CI runs it on every push.

That means `tsconfig.json` sets `erasableSyntaxOnly`, which keeps the code to syntax Node
can strip: no enums, no namespaces, no parameter properties.

The browser code in `public/javascripts` stays JavaScript. `helpers.cjs` is shared by the
server and the browser, so it keeps a hand-written `helpers.d.cts` alongside it.

Posts are in the server/content folder. All the data such as title and date of published is inside meta tags at the top of each post. These are used to order the posts, put them in different cataegories etc.

This project runs mainly using js technologies. It has a bunch of funky css and svg animations - probably a few too many for a normal blog but I was playing around.

Although using JS all through it also has server side rendering so can work without js in the browser.

If you like the structure of the project feel free to use - it's a side project and probably not that stable but feel free to use as you wish. If you find it helpful would be great to hear from you.

Deployment
===========================

The project runs in a docker container. All you need as a dependency is docker.

#### Build the docker file

```
docker build -t mikemjharris/blog .
```

#### Running the project

The project exposes port 8000 so map that to whichevere port you need.

```
docker run -d -p 8000:8000 --name blog mikemjharris/blog
```

Git hooks
==========

[lefthook](https://lefthook.dev) runs the same checks CI does, earlier. `npm install`
installs the hooks via the `prepare` script; run `npx lefthook install` by hand if they
ever go missing.

| hook         | does                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| `pre-commit` | prettier on staged files (fixes and restages them), then `typecheck` and `test` |
| `pre-push`   | `build` then `smoke`                                                            |

Pass `--no-verify` to skip them for one command. CI runs the same checks regardless, so
skipping locally only defers the failure.

Every job runs through `scripts/hook-run.sh`, which executes it in a `node:24-slim`
container against the mounted working tree. The hooks therefore work whatever node is on
`PATH`. Set `HOOKS_NO_DOCKER=1` to run on the host i
