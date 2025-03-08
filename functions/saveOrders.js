const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  const ordersFilePath = path.join(__dirname, 'orders.json');

  if (event.httpMethod === 'POST') {
    const newOrders = JSON.parse(event.body);
    try {
      await fs.writeFile(ordersFilePath, JSON.stringify(newOrders, null, 2));
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Orders updated successfully' }),
      };
    } catch (error) {
      console.error('Error writing orders file:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to update orders' }),
      };
    }
  } else if (event.httpMethod === 'GET') {
    try {
      const data = await fs.readFile(ordersFilePath, 'utf8');
      const orders = JSON.parse(data || '[]');
      return {
        statusCode: 200,
        body: JSON.stringify(orders),
      };
    } catch (error) {
      console.error('Error reading orders file:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to read orders' }),
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
