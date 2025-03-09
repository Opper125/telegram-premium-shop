const EventEmitter = require('events');
const orderEmitter = new EventEmitter();
let orders = [];

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
    const order = JSON.parse(event.body);
    orders.push(order);
    orderEmitter.emit('orderUpdate', orders);
    // Send order to Order Management Website
    fetch('https://opeer-telegram-good.netlify.app/.netlify/functions/update-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
    }).catch(err => console.error('Failed to sync order:', err));
    return { statusCode: 200, body: JSON.stringify({ message: 'Order submitted' }) };
};
