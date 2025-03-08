const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  const ordersFilePath = path.join(__dirname, 'orders.json');
  let orders = [];

  try {
    // Read existing orders
    const data = await fs.readFile(ordersFilePath, 'utf8');
    orders = JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading orders file:', error);
  }

  if (event.httpMethod === 'POST') {
    const newOrder = JSON.parse(event.body);
    orders.push(newOrder);
    await fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order saved' }),
    };
  } else if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify(orders),
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
