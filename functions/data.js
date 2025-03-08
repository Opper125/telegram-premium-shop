// In-memory storage for orders
let orders = [];
let orderIdCounter = 1;

// Event emitter for real-time updates
const EventEmitter = require('events');
const orderEmitter = new EventEmitter();

exports.handler = async (event, context) => {
  // Handle POST request to save a new order
  if (event.httpMethod === 'POST') {
    const order = JSON.parse(event.body);
    order.id = orderIdCounter++;
    orders.push(order);
    orderEmitter.emit('orderUpdate');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order saved successfully' }),
    };
  }

  // Handle GET request to fetch all orders
  else if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify(orders),
    };
  }

  // Handle PUT request to update order status
  else if (event.httpMethod === 'PUT') {
    const { id, status } = JSON.parse(event.body);
    const order = orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      orderEmitter.emit('orderUpdate');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Order updated successfully' }),
      };
    }
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Order not found' }),
    };
  }

  // Handle DELETE request to clear all orders
  else if (event.httpMethod === 'DELETE') {
    orders = [];
    orderIdCounter = 1;
    orderEmitter.emit('orderUpdate');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Orders cleared successfully' }),
    };
  }

  // Handle Server-Sent Events (SSE) for real-time updates
  else if (event.path === '/.netlify/functions/data-stream') {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    context.callbackWaitsForEmptyEventLoop = false;
    const response = {
      statusCode: 200,
      headers,
      body: '',
    };

    // Send updates to client on order changes
    orderEmitter.on('orderUpdate', () => {
      response.body += `data: ${JSON.stringify(orders)}\n\n`;
    });

    // Keep the connection alive
    setInterval(() => {
      response.body += ': keep-alive\n\n';
    }, 25000);

    return response;
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
