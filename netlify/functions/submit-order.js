const EventEmitter = require('events');
const orderEmitter = new EventEmitter();
let orders = [];

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
    const order = JSON.parse(event.body);
    orders.push(order);
    orderEmitter.emit('orderUpdate', orders);
    return { statusCode: 200, body: JSON.stringify({ message: 'Order submitted' }) };
};
