import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import { parseArgs } from 'node:util';

const root = path.join(import.meta.dirname, '..');

const CATEGORIES = ['tech', 'thoughts'];
const DEFAULT_AUTHOR = 'Mike Harris';

const usage = `Usage: npm run new:post -- [title] [options]

Options:
  --title <text>      Post title. Also accepted as the first positional argument.
  --intro <text>      One-line summary used in listings, the RSS feed and meta tags.
  --category <name>   ${CATEGORIES.join(' | ')}  (default: tech)
  --tags <a,b,c>      Comma-separated tags. Omitted from the file when empty.
  --date <date>       Publication date (default: today).
  --author <name>     (default: ${DEFAULT_AUTHOR})
  --image <url>       Absolute URL for the Twitter card image.
  --draft             Write to server/content/drafts/ instead of posts/.
  --force             Overwrite an existing file.
  --help              Show this message.
`;

const { values, positionals } = parseArgs({
  options: {
    title: { type: 'string' },
    intro: { type: 'string' },
    category: { type: 'string' },
    tags: { type: 'string' },
    date: { type: 'string' },
    author: { type: 'string' },
    image: { type: 'string' },
    draft: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(usage);
  process.exit(0);
}

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

/** Matches the `d Mmm yyyy` most posts use, and parses cleanly via `new Date`. */
const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const slugify = (title: string): string =>
  title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** A `--` inside a meta-data value would close the HTML comment early. */
const safeMeta = (value: string): string => value.replace(/-{2,}/g, '-').trim();

let input: readline.Interface | undefined;

/** Piped or scripted runs take the default rather than blocking on a prompt nobody can answer. */
const ask = async (question: string, fallback = ''): Promise<string> => {
  if (!process.stdin.isTTY) return fallback;
  input ??= readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await input.question(fallback ? `${question} [${fallback}]: ` : `${question}: `);
    return answer.trim() || fallback;
  } catch {
    // Ctrl+C / Ctrl+D at a prompt rejects the question — bail out without a stack trace.
    input.close();
    console.error('\n✗ cancelled');
    process.exit(1);
  }
};

const title = values.title ?? positionals[0] ?? (await ask('Title'));
if (!title) fail('a title is required — pass --title');

const intro = values.intro ?? (await ask('Intro (one line summary)'));
if (!intro) fail('an intro is required — pass --intro. It is used in listings, RSS and meta tags');

const category = values.category ?? (await ask(`Category (${CATEGORIES.join('/')})`, 'tech'));
if (!CATEGORIES.includes(category)) {
  console.warn(`! "${category}" is a new category — existing posts use ${CATEGORIES.join(' or ')}`);
}

const tags = values.tags ?? (await ask('Tags (comma separated, optional)'));
const date = values.date ?? (await ask('Date', formatDate(new Date())));
if (Number.isNaN(new Date(date).getTime())) {
  fail(`"${date}" is not a parseable date — posts with an unreadable date sort last`);
}

const author = values.author ?? DEFAULT_AUTHOR;
const image = values.image ?? '';

input?.close();

const slug = slugify(title);
if (!slug) fail(`"${title}" does not reduce to a usable slug`);

const dir = path.join(root, 'server/content', values.draft ? 'drafts' : 'posts');
const file = path.join(dir, `${slug}.html`);

if (fs.existsSync(file) && !values.force) {
  fail(`${path.relative(root, file)} already exists — pass --force to overwrite`);
}

const meta = [
  `<!-- meta-data title: ${safeMeta(title)} -->`,
  `<!-- meta-data searchtitle: ${slug} -->`,
  `<!-- meta-data date: ${safeMeta(date)} -->`,
  `<!-- meta-data intro: ${safeMeta(intro)} -->`,
  `<!-- meta-data author: ${safeMeta(author)} -->`,
  `<!-- meta-data category: ${safeMeta(category)} -->`,
];

// An empty tags value still parses into a single blank tag, so leave the line out entirely.
if (tags.trim()) {
  const cleaned = tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (cleaned.length) meta.push(`<!-- meta-data tags: ${safeMeta(cleaned.join(','))} -->`);
}

if (image.trim()) {
  meta.push(`<!-- meta-data twitterimage: ${safeMeta(image)} -->`);
  meta.push('<!-- meta-data twittercard: summary_large_image -->');
}

const body = `<p>TODO — open with the hook: what this post is about and why it is worth reading.</p>

<h4>TODO first section</h4>
<p>TODO</p>

<figure>
  <figcaption>TODO caption:</figcaption>
  <img alt="TODO alt text" src="/images/TODO.png" />
</figure>

<h4>TODO second section</h4>
<p>TODO</p>

<h4>Conclusion</h4>
<p>TODO — what you took away from it.</p>
`;

fs.writeFileSync(file, `${meta.join('\n')}\n\n${body}`);

console.log(`✓ ${path.relative(root, file)}`);
if (!values.draft) console.log(`  http://localhost:8000/posts/${slug}`);
console.log('  npm run dev');
