const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const ordersFilePath = path.join(__dirname, 'orders.json');
  const newOrders = JSON.parse(event.body);

  try {
    await fs.writeFile(ordersFilePath, JSON.stringify(newOrders, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Orders updated' }),
    };
  } catch (error) {
    console.error('Error writing orders file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update orders' }),
    };
  }
};
