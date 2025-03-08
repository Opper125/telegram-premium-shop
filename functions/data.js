// In-memory storage for orders
let orders = [];
let orderIdCounter = 1;

// Event emitter for real-time updates
const EventEmitter = require('events');
const orderEmitter = new EventEmitter();

// Log storage (simple in-memory log)
const logs = [];

function logAction(action, details) {
    const logEntry = `${new Date().toISOString()} - ${action}: ${JSON.stringify(details)}`;
    logs.push(logEntry);
    console.log(logEntry);
}

function getDeviceFingerprint() {
    return `${navigator.userAgent}-${Math.random().toString(36).substr(2, 9)}`;
}

exports.handler = async (event, context) => {
    // Handle POST request to save a new order
    if (event.httpMethod === 'POST') {
        const order = JSON.parse(event.body);
        if (!order.userId) {
            const deviceFingerprint = getDeviceFingerprint();
            order.userId = localStorage.getItem(`userId-${deviceFingerprint}`) || `user-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem(`userId-${deviceFingerprint}`, order.userId);
        }
        order.id = orderIdCounter++;
        orders.push(order);
        logAction('Order Submitted', order);
        orderEmitter.emit('orderUpdate');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order saved successfully', userId: order.userId }),
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        };
    }

    // Handle GET request to fetch all orders
    else if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            body: JSON.stringify(orders),
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        };
    }

    // Handle PUT request to update order status
    else if (event.httpMethod === 'PUT') {
        const { id, status } = JSON.parse(event.body);
        const orderIndex = orders.findIndex(o => o.id === id);
        if (orderIndex !== -1) {
            orders[orderIndex].status = status;
            logAction(`Order ${status}`, { id, status });
            orderEmitter.emit('orderUpdate', { id, status });
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Order updated successfully' }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
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
        logAction('Orders Cleared', {});
        orderEmitter.emit('orderUpdate');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Orders cleared successfully' }),
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
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

        // Send initial data immediately
        response.body += `data: ${JSON.stringify(orders)}\n\n`;

        // Listen for order updates and send immediately
        orderEmitter.on('orderUpdate', (update) => {
            response.body += `data: ${JSON.stringify(orders)}\n\n`;
        });

        // Keep connection alive with shorter interval
        setInterval(() => {
            response.body += `: keep-alive\n\n`;
        }, 10000); // 10 seconds interval for better real-time

        return response;
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
    };
};
