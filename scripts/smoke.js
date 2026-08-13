// Boots the real server and checks it serves the pages, the built assets and the
// MCP endpoint. Run in CI so a broken boot fails the build rather than the deploy.
const { spawn } = require('child_process');
const path = require('path');

const port = process.env.SMOKE_PORT || 8123;
const base = `http://localhost:${port}`;
const bootTimeoutMs = 30000;

const pages = ['/', '/posts', '/about', '/projects', '/talks', '/category', '/contact'];
const assets = [
  '/dist/style.css',
  '/dist/main.js',
  '/dist/templates.js',
  '/dist/vendor/jquery.min.js',
  '/dist/vendor/handlebars.min.js',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForBoot = async () => {
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

const checks = [];
const check = async (name, fn) => {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (err) {
    checks.push({ name, ok: false, error: err.message });
  }
};

const expectStatus = (res, status) => {
  if (res.status !== status) throw new Error(`expected ${status}, got ${res.status}`);
};

// Never follow redirects: the catch-all route sends anything unmatched to the homepage,
// so a followed redirect turns a missing route or asset into a passing 200.
const get = (url, options) => fetch(url, { redirect: 'manual', ...options });

const run = async () => {
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
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) throw new Error('no posts returned');
    if (!posts[0].title) throw new Error('posts are missing meta-data');
  });

  await check('GET /posts/:id renders a post', async () => {
    const posts = await (await get(`${base}/api/posts`)).json();
    const res = await get(`${base}/posts/${posts[0].searchtitle}`);
    expectStatus(res, 200);
    if (!(await res.text()).includes(posts[0].title)) throw new Error('post title not rendered');
  });

  await check('GET /rss.xml is valid feed', async () => {
    const res = await get(`${base}/rss.xml`);
    expectStatus(res, 200);
    const xml = await res.text();
    if (!xml.includes('<rss') || !xml.includes('<item>')) throw new Error('not an rss feed');
  });

  await check('POST /mcp lists tools', async () => {
    const res = await get(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expectStatus(res, 200);
    if (!(await res.text()).includes('search_posts')) throw new Error('mcp tools not listed');
  });

  await check('node_modules is not served', async () => {
    const res = await get(`${base}/express/package.json`);
    if (res.status === 200) throw new Error('node_modules is exposed over HTTP');
  });
};

const main = async () => {
  const server = spawn('node', [path.join(__dirname, '../server/server.js')], {
    env: { ...process.env, PORT: port },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  let output = '';
  server.stdout.on('data', (chunk) => {
    output += chunk;
  });

  const exited = new Promise((resolve, reject) => {
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

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
