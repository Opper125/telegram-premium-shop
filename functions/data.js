import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Define interfaces for TypeScript
interface Post {
  userId: string;
  content?: string;
  media?: string;
  mediaType?: string;
  timestamp: string;
}

interface Order {
  userId: string;
  months: number;
  quantity: number;
  total: number;
  transactionId: string;
  telegramUsername: string;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

let posts: Post[] = [];
let orders: Order[] = [];

// Load data from local storage (simulated)
const loadPosts = (): Post[] => {
  const savedPosts = localStorage.getItem('posts');
  return savedPosts ? JSON.parse(savedPosts) : [];
};

const loadOrders = (): Order[] => {
  const savedOrders = localStorage.getItem('orders');
  return savedOrders ? JSON.parse(savedOrders) : [];
};

// Save data to local storage (simulated)
const savePosts = (newPosts: Post[]): void => {
  posts = newPosts;
  localStorage.setItem('posts', JSON.stringify(posts));
};

const saveOrders = (newOrders: Order[]): void => {
  orders = newOrders;
  localStorage.setItem('orders', JSON.stringify(orders));
};

// Handler for managing requests
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod === 'GET' && event.path === 'data/posts') {
    return {
      statusCode: 200,
      body: JSON.stringify(loadPosts()),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  if (event.httpMethod === 'POST' && event.path === 'data/posts') {
    const body = JSON.parse(event.body || '{}');
    const newPost: Post = {
      userId: body.userId,
      content: body.content || '',
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

  if (event.httpMethod === 'GET' && event.path === 'data/orders') {
    return {
      statusCode: 200,
      body: JSON.stringify(loadOrders()),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  if (event.httpMethod === 'POST' && event.path === 'data/orders') {
    const body = JSON.parse(event.body || '{}');
    const newOrder: Order = {
      userId: body.userId,
      months: body.months,
      quantity: body.quantity,
      total: body.total,
      transactionId: body.transactionId,
      telegramUsername: body.telegramUsername,
      paymentMethod: body.paymentMethod,
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

  if (event.httpMethod === 'PUT' && event.path.startsWith('data/orders/')) {
    const orderId = event.path.split('/').pop();
    const body = JSON.parse(event.body || '{}');
    const updatedStatus = body.status;
    let updatedOrders = loadOrders();
    const orderIndex = updatedOrders.findIndex(order => order.transactionId === orderId);
    if (orderIndex !== -1) {
      updatedOrders[orderIndex].status = updatedStatus;
      saveOrders(updatedOrders);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Order ${updatedStatus}`, order: updatedOrders[orderIndex] }),
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

export { handler };
