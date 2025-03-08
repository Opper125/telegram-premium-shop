const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  const ordersFilePath = path.join(__dirname, 'orders.json');

  // Set headers for SSE
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: async (stream) => {
      // Send initial data
      let orders = [];
      try {
        const data = await fs.readFile(ordersFilePath, 'utf8');
        orders = JSON.parse(data || '[]');
      } catch (error) {
        console.error('Error reading orders file:', error);
        await fs.writeFile(ordersFilePath, '[]', 'utf8');
      }
      stream.write(`data: ${JSON.stringify(orders)}\n\n`);

      // Watch for changes
      const watcher = fs.watch(ordersFilePath, async () => {
        try {
          const data = await fs.readFile(ordersFilePath, 'utf8');
          orders = JSON.parse(data || '[]');
          stream.write(`data: ${JSON.stringify(orders)}\n\n`);
        } catch (error) {
          console.error('Error watching orders file:', error);
        }
      });

      // Cleanup on connection close
      context.callbackWaitsForEmptyEventLoop = false;
      return new Promise((resolve) => {
        stream.on('close', () => {
          watcher.close();
          resolve();
        });
      });
    },
  };
};
