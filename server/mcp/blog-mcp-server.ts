import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as search from '../helpers/post-search.ts';
import type { Post } from '../helpers/source-content.ts';
import type { PostSummary } from '../helpers/post-search.ts';

const text = (value: string): CallToolResult => ({ content: [{ type: 'text', text: value }] });

export const formatSummary = (post: PostSummary): string =>
  [
    `## ${post.title}`,
    `${post.date} · ${post.category}${post.tags.length ? ` · ${post.tags.join(', ')}` : ''}`,
    post.url,
    post.intro ?? '',
  ]
    .filter(Boolean)
    .join('\n');

export const formatPost = (post: Post): string =>
  [
    `# ${post.title}`,
    `${post.date} · ${search.normaliseCategory(post.category)} · ${search.postUrl(post)}`,
    '',
    search.toPlainText(post.body),
  ].join('\n');

/** URI template variables arrive as a string or a list depending on the template. */
const single = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

// `posts` is the array the express app parses once at boot, so every tool is an in-memory read.
export const createBlogMcpServer = (posts: Post[]): McpServer => {
  const server = new McpServer(
    { name: 'mikemjharris-blog', version: '1.0.0' },
    {
      instructions:
        "Read-only access to Mike Harris' blog at blog.mikemjharris.com - posts on tech, " +
        'keyboards, career changes, yearly retros and assorted side projects. Use search_posts to ' +
        'find writing on a topic, then get_post to read one in full.',
    },
  );

  server.registerTool(
    'search_posts',
    {
      title: 'Search posts',
      description:
        'Full-text search across every blog post. Searches titles, intros, tags and body text, ' +
        'ranked by relevance. Returns summaries - use get_post to read one in full.',
      inputSchema: {
        query: z.string().describe('Search terms, e.g. "mechanical keyboard" or "docker deploy"'),
        category: z
          .string()
          .optional()
          .describe('Restrict to a category, e.g. "tech" or "thoughts"'),
        tag: z.string().optional().describe('Restrict to a single tag'),
        limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, category, tag, limit }) => {
      const results = search.searchPosts(posts, { query, category, tag, limit });
      if (!results.length) return text(`No posts found matching "${query}".`);

      return text(
        `Found ${results.length} post(s) matching "${query}":\n\n` +
          results.map(formatSummary).join('\n\n'),
      );
    },
  );

  server.registerTool(
    'list_posts',
    {
      title: 'List posts',
      description:
        'List posts newest first, optionally filtered by category, tag or date. ' +
        'Use this to browse rather than search.',
      inputSchema: {
        category: z.string().optional().describe('Filter by category, e.g. "tech" or "thoughts"'),
        tag: z.string().optional().describe('Filter by tag'),
        since: z
          .string()
          .optional()
          .describe('Only posts published on or after this date, e.g. "2024-01-01"'),
        limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20)'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ category, tag, since, limit }) => {
      const results = search.listPosts(posts, { category, tag, since, limit });
      if (!results.length) return text('No posts matched those filters.');

      return text(
        `${results.length} post(s), newest first:\n\n` + results.map(formatSummary).join('\n\n'),
      );
    },
  );

  server.registerTool(
    'get_post',
    {
      title: 'Get post',
      description:
        'Read a single post in full as plain text. Takes the post slug (the "searchtitle" ' +
        'returned by search_posts, and the last segment of the post URL).',
      inputSchema: {
        searchtitle: z.string().describe('Post slug, e.g. "three-key-keyboard"'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ searchtitle }): CallToolResult => {
      const post = search.findPost(posts, searchtitle);
      if (!post) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `No post with slug "${searchtitle}". Use search_posts or list_posts to find valid slugs.`,
            },
          ],
        };
      }
      return text(formatPost(post));
    },
  );

  server.registerTool(
    'list_categories',
    {
      title: 'List categories',
      description: 'List the categories used across the blog, with a post count for each.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => {
      const counts = search.categories(posts);
      const lines = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => `- ${category}: ${count} post(s)`);
      return text(`${posts.length} posts across ${lines.length} categories:\n${lines.join('\n')}`);
    },
  );

  server.registerResource(
    'post',
    new ResourceTemplate('blog://posts/{searchtitle}', {
      list: () => ({
        resources: posts.map((post) => ({
          uri: `blog://posts/${post.searchtitle}`,
          name: post.title ?? post.searchtitle,
          description: post.intro,
          mimeType: 'text/plain',
        })),
      }),
    }),
    { title: 'Blog post', description: 'A single post as plain text', mimeType: 'text/plain' },
    (uri, { searchtitle }) => {
      const slug = single(searchtitle);
      const post = search.findPost(posts, slug);
      if (!post) throw new Error(`No post with slug "${slug}"`);

      return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: formatPost(post) }] };
    },
  );

  return server;
};
