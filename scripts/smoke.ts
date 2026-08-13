// Boots the real server and checks it serves the pages, the built assets and the
// MCP endpoint. Run in CI so a broken boot fails the build rather than the deploy.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';

/**
 * Ask the OS for a spare port rather than hardcoding one. A fixed port makes this
 * fail spuriously whenever anything else is already listening — including a previous
 * run of this script that has not fully released it yet.
 */
const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, () => {
      const address = probe.address();
      if (address === null || typeof address === 'string') {
        probe.close(() => reject(new Error('could not determine a free port')));
        return;
      }
      const { port } = address;
      probe.close(() => resolve(port));
    });
  });

const port = process.env.SMOKE_PORT ?? String(await freePort());
const base = `http://localhost:${port}`;
const bootTimeoutMs = 30000;

const pages = ['/', '/posts', '/about', '/projects', '/talks', '/category', '/contact'];
const assets = [
  '/dist/style.css',
  '/dist/main.js',
  '/dist/templates.js',
  '/dist/vendor/jquery.min.js',
  '/dist/vendor/handlebars.min.js',
  '/dist/vendor/d3.min.js',
];

interface Check {
  name: string;
  ok: boolean;
  error?: string;
}

interface PostSummaryResponse {
  title?: string;
  searchtitle: string;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForBoot = async (): Promise<void> => {
  const deadline = Date.now() + bootTimeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(base);
      return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`server did not respond on ${base} within ${bootTimeoutMs}ms`);
};

const checks: Check[] = [];
const check = async (name: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (err) {
    checks.push({ name, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};

const expectStatus = (res: Response, status: number): void => {
  if (res.status !== status) throw new Error(`expected ${status}, got ${res.status}`);
};

// Never follow redirects: a followed redirect would turn a route that has quietly
// started redirecting into a passing 200.
const get = (url: string, options?: RequestInit): Promise<Response> =>
  fetch(url, { redirect: 'manual', ...options });

const run = async (): Promise<void> => {
  for (const page of pages) {
    await check(`GET ${page}`, async () => {
      const res = await get(`${base}${page}`);
      expectStatus(res, 200);
      const html = await res.text();
      // Server-side rendering is the point of the app, so an empty shell is a failure.
      if (!html.includes('<article')) throw new Error('no rendered article in response');
    });
  }

  for (const asset of assets) {
    await check(`GET ${asset}`, async () => {
      const res = await get(`${base}${asset}`);
      expectStatus(res, 200);
      if ((await res.text()).length === 0) throw new Error('asset is empty');
    });
  }

  await check('GET /api/posts returns posts', async () => {
    const res = await get(`${base}/api/posts`);
    expectStatus(res, 200);
    const posts = (await res.json()) as PostSummaryResponse[];
    if (!Array.isArray(posts) || posts.length === 0) throw new Error('no posts returned');
    if (!posts[0]?.title) throw new Error('posts are missing meta-data');
  });

  await check('GET /posts/:id renders a post', async () => {
    const posts = (await (await get(`${base}/api/posts`)).json()) as PostSummaryResponse[];
    const first = posts[0];
    if (!first) throw new Error('no posts to render');
    const res = await get(`${base}/posts/${first.searchtitle}`);
    expectStatus(res, 200);
    if (!(await res.text()).includes(first.title ?? '')) {
      throw new Error('post title not rendered');
    }
  });

  await check('GET /rss.xml is valid feed', async () => {
    const res = await get(`${base}/rss.xml`);
    expectStatus(res, 200);
    const xml = await res.text();
    if (!xml.includes('<rss') || !xml.includes('<item>')) throw new Error('not an rss feed');
  });

  const mcp = (body: unknown): Promise<Response> =>
    get(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
    });

  await check('POST /mcp lists tools', async () => {
    const res = await mcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expectStatus(res, 200);
    if (!(await res.text()).includes('search_posts')) throw new Error('mcp tools not listed');
  });

  // Listing tools only proves the server mounted. Call one so the whole path —
  // parse the posts, search them, format the reply — is exercised over HTTP.
  await check('POST /mcp runs a tool against real posts', async () => {
    const res = await mcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'search_posts', arguments: { query: 'keyboard', limit: 3 } },
    });
    expectStatus(res, 200);
    const body = await res.text();
    if (body.includes('"isError":true'))
      throw new Error(`tool call errored: ${body.slice(0, 200)}`);
    if (!/Found \d+ post\(s\)/.test(body)) throw new Error('tool returned no search results');
  });

  await check('node_modules is not served', async () => {
    const res = await get(`${base}/express/package.json`);
    if (res.status === 200) throw new Error('node_modules is exposed over HTTP');
  });

  await check('an unknown path 404s with a real page', async () => {
    const res = await get(`${base}/no-such-page`);
    expectStatus(res, 404);
    const html = await res.text();
    if (!html.includes('Page not found')) throw new Error('404 did not render the error page');
    if (!html.includes('<article')) throw new Error('404 is not wrapped in the site layout');
  });

  await check('an unknown post slug 404s rather than soft-404ing', async () => {
    const res = await get(`${base}/posts/no-such-post`);
    expectStatus(res, 404);
  });

  await check('security headers are set', async () => {
    const res = await get(`${base}/`);
    const required = [
      'x-content-type-options',
      'referrer-policy',
      'strict-transport-security',
      'x-frame-options',
      'content-security-policy-report-only',
    ];
    const missing = required.filter((header) => !res.headers.get(header));
    if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
    if (res.headers.get('x-powered-by')) throw new Error('x-powered-by is still advertised');
  });

  await check('the csp still covers the libraries the layout loads', async () => {
    const csp = (await get(`${base}/`)).headers.get('content-security-policy-report-only') ?? '';
    // Loosely pinned: enough that dropping an origin the pages depend on is caught,
    // without re-encoding the whole policy here.
    for (const origin of ['cdnjs.cloudflare.com', 'platform.twitter.com', 'codepen.io']) {
      if (!csp.includes(origin)) throw new Error(`csp no longer allows ${origin}`);
    }
  });
};

const main = async (): Promise<void> => {
  const server = spawn('node', [path.join(import.meta.dirname, '../server/server.ts')], {
    env: { ...process.env, PORT: port },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  let output = '';
  server.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });

  const exited = new Promise<never>((_resolve, reject) => {
    server.on('exit', (code) =>
      reject(new Error(`server exited early with code ${code}\n${output}`)),
    );
    server.on('error', reject);
  });

  try {
    await Promise.race([waitForBoot(), exited]);
    await run();
  } finally {
    server.kill();
  }

  checks.forEach(({ name, ok, error }) =>
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${error ? ` — ${error}` : ''}`),
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} smoke checks passed`);
  if (failed.length) process.exit(1);
};

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
