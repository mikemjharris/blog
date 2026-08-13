// Drives the MCP server through a real client over an in-memory transport, so the
// tools are exercised the way an agent would call them rather than by poking at
// internals. The HTTP layer is covered separately by the smoke test.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createBlogMcpServer, formatPost, formatSummary } from '../mcp/blog-mcp-server.ts';
import { summarise } from '../helpers/post-search.ts';
import type { Post } from '../helpers/source-content.ts';

const kelpPost: Post = {
  template: 'farming-kelp.html',
  title: 'Farming Kelp',
  searchtitle: 'farming-kelp',
  date: '4 May 2021',
  category: 'tech',
  tags: ['kelp', 'seaweed'],
  intro: 'Growing kelp at Coral Bay',
  body: '<!-- meta-data title: Farming Kelp --><p>Kelp grows fast in Coral Bay.</p>',
};

const anemonePost: Post = {
  template: 'anemone-notes.html',
  title: 'Anemone Notes',
  searchtitle: 'anemone-notes',
  date: '7 Jun 2022',
  category: 'thoughts',
  tags: [],
  intro: 'On anemones',
  body: '<p>An aside about kelp.</p>',
};

const posts = [anemonePost, kelpPost];

const connect = async (): Promise<Client> => {
  const server = createBlogMcpServer(posts);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
};

type ToolResult = Awaited<ReturnType<Client['callTool']>>;

/**
 * callTool's result is a union that still includes the legacy `toolResult` shape,
 * and content itself is a union of text/image/resource parts. The blog only ever
 * returns text, so narrow to that and fail loudly if it ever does not.
 */
const textOf = (result: ToolResult): string => {
  const content = 'content' in result ? result.content : undefined;
  assert.ok(Array.isArray(content), 'expected a content array');
  return content
    .map((part) => (typeof part === 'object' && part && 'text' in part ? String(part.text) : ''))
    .join('\n');
};

describe('tool registration', () => {
  test('exposes exactly the four blog tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      'get_post',
      'list_categories',
      'list_posts',
      'search_posts',
    ]);
  });

  test('every tool is marked read-only so agents know it is safe', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    for (const tool of tools) {
      assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} is not read-only`);
    }
  });
});

describe('search_posts', () => {
  test('ranks a title match above a passing body mention', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'search_posts', arguments: { query: 'kelp' } });
    const text = textOf(result);
    assert.match(text, /Found 2 post\(s\)/);
    assert.ok(
      text.indexOf('Farming Kelp') < text.indexOf('Anemone Notes'),
      'title match should rank first',
    );
  });

  test('says so rather than erroring when nothing matches', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'search_posts', arguments: { query: 'dolphin' } });
    assert.match(textOf(result), /No posts found matching "dolphin"/);
    assert.notEqual(result.isError, true);
  });

  test('honours the limit', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'search_posts',
      arguments: { query: 'kelp', limit: 1 },
    });
    assert.match(textOf(result), /Found 1 post\(s\)/);
  });

  test('rejects a limit outside the schema range', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'search_posts',
      arguments: { query: 'kelp', limit: 999 },
    });
    assert.equal(result.isError, true);
  });
});

describe('list_posts', () => {
  test('filters by category', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'list_posts',
      arguments: { category: 'thoughts' },
    });
    const text = textOf(result);
    assert.match(text, /Anemone Notes/);
    assert.doesNotMatch(text, /Farming Kelp/);
  });

  test('since excludes older posts', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'list_posts',
      arguments: { since: '1 Jan 2022' },
    });
    const text = textOf(result);
    assert.match(text, /Anemone Notes/);
    assert.doesNotMatch(text, /Farming Kelp/);
  });

  test('reports an empty result rather than an error', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'list_posts', arguments: { tag: 'dolphin' } });
    assert.match(textOf(result), /No posts matched those filters/);
  });
});

describe('get_post', () => {
  test('returns the post as plain text with its markup stripped', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'get_post',
      arguments: { searchtitle: 'farming-kelp' },
    });
    const text = textOf(result);
    assert.match(text, /# Farming Kelp/);
    assert.match(text, /Kelp grows fast in Coral Bay\./);
    assert.doesNotMatch(text, /<p>/, 'html should be stripped');
    assert.doesNotMatch(text, /meta-data/, 'meta-data comment should be stripped');
  });

  test('flags an unknown slug as an error and suggests how to recover', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'get_post',
      arguments: { searchtitle: 'no-such-post' },
    });
    assert.equal(result.isError, true);
    assert.match(textOf(result), /No post with slug "no-such-post"/);
    assert.match(textOf(result), /search_posts or list_posts/);
  });
});

describe('list_categories', () => {
  test('counts posts per category, most common first', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'list_categories', arguments: {} });
    const text = textOf(result);
    assert.match(text, /2 posts across 2 categories/);
    assert.match(text, /- tech: 1 post\(s\)/);
    assert.match(text, /- thoughts: 1 post\(s\)/);
  });
});

describe('post resource', () => {
  test('lists every post as a resource', async () => {
    const client = await connect();
    const { resources } = await client.listResources();
    assert.deepEqual(resources.map((resource) => resource.uri).sort(), [
      'blog://posts/anemone-notes',
      'blog://posts/farming-kelp',
    ]);
  });

  test('reads a single post by uri', async () => {
    const client = await connect();
    const result = await client.readResource({ uri: 'blog://posts/farming-kelp' });
    const [content] = result.contents;
    assert.ok(content);
    assert.equal(content.mimeType, 'text/plain');
    // Resource contents are text-or-blob; the blog only serves text.
    assert.ok('text' in content, 'expected a text resource, not a blob');
    assert.match(String(content.text), /# Farming Kelp/);
  });
});

describe('formatting', () => {
  test('formatPost leads with the title and links back to the public url', () => {
    const text = formatPost(kelpPost);
    assert.match(text, /^# Farming Kelp\n/);
    assert.match(text, /https:\/\/blog\.mikemjharris\.com\/posts\/farming-kelp/);
  });

  test('formatSummary omits the tag list when a post has no tags', () => {
    assert.doesNotMatch(formatSummary(summarise(anemonePost)), / · $/m);
    assert.match(formatSummary(summarise(kelpPost)), /kelp, seaweed/);
  });
});
