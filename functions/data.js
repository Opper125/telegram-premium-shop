// Simulated local storage (replace with a real database like Firebase in production)
let posts = [];
let orders = [];

const loadPosts = () => {
  const savedPosts = localStorage.getItem('posts');
  return savedPosts ? JSON.parse(savedPosts) : [];
};

const loadOrders = () => {
  const savedOrders = localStorage.getItem('orders');
  return savedOrders ? JSON.parse(savedOrders) : [];
};

const savePosts = (newPosts) => {
  posts = newPosts;
  localStorage.setItem('posts', JSON.stringify(posts));
};

const saveOrders = (newOrders) => {
  orders = newOrders;
  localStorage.setItem('orders', JSON.stringify(orders));
};

exports.handler = async (event, context) => {
  // Server-Sent Events (SSE) for real-time updates
  if (event.httpMethod === 'GET' && event.path.includes('events')) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: (async (stream) => {
        const sendEvent = (data) => {
          stream.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // Initial data
        sendEvent({ type: 'initial', posts: loadPosts(), orders: loadOrders() });

        // Real-time updates every 5 seconds (simulate new posts)
        const interval = setInterval(() => {
          const newPost = {
            userId: `user${Math.floor(Math.random() * 100)}`,
            content: `Random post ${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
          };
          const updatedPosts = [...loadPosts(), newPost];
          savePosts(updatedPosts);
          sendEvent({ type: 'update', posts: updatedPosts, orders: loadOrders() });
        }, 5000);

        // Clean up on client disconnect
        return new Promise((resolve) => {
          stream.on('close', () => {
            clearInterval(interval);
            resolve();
          });
        });
      }).toString().replace(/^async\s*\(/, '').replace(/\)\s*$/, ''),
    };
  }

  // Handle POST requests for posts (with user confirmation)
  if (event.httpMethod === 'POST' && event.path.includes('posts')) {
    const body = JSON.parse(event.body || '{}');
    if (!body.userId || !body.content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'User ID and content are required' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    const newPost = {
      userId: body.userId,
      content: body.content,
      media: body.media || '',
      mediaType: body.mediaType || '',
      timestamp: new Date().toISOString(),
    };
    const updatedPosts = [...loadPosts(), newPost];
    savePosts(updatedPosts);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Post saved', post: newPost }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Handle GET requests for posts
  if (event.httpMethod === 'GET' && event.path.includes('posts')) {
    return {
      statusCode: 200,
      body: JSON.stringify(loadPosts()),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Handle POST requests for orders (with user confirmation)
  if (event.httpMethod === 'POST' && event.path.includes('orders')) {
    const body = JSON.parse(event.body || '{}');
    if (!body.userId || !body.transactionId || !body.telegramUsername) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'User ID, transaction ID, and Telegram username are required' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    const newOrder = {
      userId: body.userId,
      months: body.months || 1,
      quantity: body.quantity || 1,
      total: body.total || 60000,
      transactionId: body.transactionId,
      telegramUsername: body.telegramUsername,
      paymentMethod: body.paymentMethod || 'kpay',
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    const updatedOrders = [...loadOrders(), newOrder];
    saveOrders(updatedOrders);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order submitted', order: newOrder }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Handle GET requests for orders
  if (event.httpMethod === 'GET' && event.path.includes('orders')) {
    return {
      statusCode: 200,
      body: JSON.stringify(loadOrders()),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Handle PUT requests for order status update
  if (event.httpMethod === 'PUT' && event.path.startsWith('data/orders/')) {
    const orderId = event.path.split('/').pop();
    const body = JSON.parse(event.body || '{}');
    if (!body.status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Status is required' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    let updatedOrders = loadOrders();
    const orderIndex = updatedOrders.findIndex(order => order.transactionId === orderId);
    if (orderIndex !== -1) {
      updatedOrders[orderIndex].status = body.status;
      saveOrders(updatedOrders);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Order ${body.status}`, order: updatedOrders[orderIndex] }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Order not found' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ message: 'Not found' }),
    headers: { 'Content-Type': 'application/json' },
  };
};
