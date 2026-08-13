import type { Express, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createBlogMcpServer } from './blog-mcp-server.ts';
import type { Post } from '../helpers/source-content.ts';

// Stateless: a fresh server and transport per request, so there is no session state to pin
// a client to one container. Everything served is a read of the in-memory posts array.
const methodNotAllowed = (res: Response): Response =>
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed. This MCP server is stateless - use POST.',
    },
    id: null,
  });

export const mountMcp = (app: Express, posts: Post[]): void => {
  app.use('/mcp', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, mcp-session-id, mcp-protocol-version',
    );
    res.header('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // @types/express types req.body as `any`; the transport takes `unknown`, so say so
  // rather than let an implicit any through.
  app.post(
    '/mcp',
    async (req: Request<Record<string, string>, unknown, unknown>, res: Response) => {
      const server = createBlogMcpServer(posts);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      res.on('close', () => {
        void transport.close();
        void server.close();
      });

      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (err) {
        console.error('MCP request failed', err);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    },
  );

  app.get('/mcp', (_req, res) => methodNotAllowed(res));
  app.delete('/mcp', (_req, res) => methodNotAllowed(res));
};
