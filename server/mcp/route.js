const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { createBlogMcpServer } = require('./blog-mcp-server');

// Stateless: a fresh server and transport per request, so there is no session state to pin
// a client to one container. Everything served is a read of the in-memory posts array.
const methodNotAllowed = (res) =>
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed. This MCP server is stateless - use POST.',
    },
    id: null,
  });

const mountMcp = (app, posts) => {
  app.use('/mcp', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, mcp-session-id, mcp-protocol-version',
    );
    res.header('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.post('/mcp', async (req, res) => {
    const server = createBlogMcpServer(posts);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close();
      server.close();
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
  });

  app.get('/mcp', (req, res) => methodNotAllowed(res));
  app.delete('/mcp', (req, res) => methodNotAllowed(res));
};

module.exports = { mountMcp };
