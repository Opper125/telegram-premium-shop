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
    return Math.random().toString(36).substr(2, 9); // Simple server-side fingerprint
}

// Simple AI-like validation (e.g., checking for duplicate transaction IDs)
function validateOrder(order) {
    const duplicate = orders.find(o => o.transactionId === order.transactionId && o.status !== 'approved' && o.status !== 'rejected');
    if (duplicate) {
        throw new Error('Duplicate Transaction ID detected!');
    }
    return true;
}

exports.handler = async (event, context) => {
    // Handle POST request to save a new order
    if (event.httpMethod === 'POST') {
        let order;
        try {
            order = JSON.parse(event.body);
            if (!order.userId) {
                const deviceFingerprint = getDeviceFingerprint();
                order.userId = `user-${deviceFingerprint}`;
                order.phoneNumber = order.phoneNumber || 'Anonymous';
            }
            validateOrder(order);
            order.id = orderIdCounter++;
            orders.push(order);
            logAction('Order Submitted', order);
            orderEmitter.emit('orderUpdate', orders);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Order saved successfully', userId: order.userId }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        } catch (error) {
            console.error('Validation Error:', error.message);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: error.message }),
            };
        }
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
            orderEmitter.emit('orderUpdate', orders);
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
        orderEmitter.emit('orderUpdate', orders);
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

        const responseStream = {
            statusCode: 200,
            headers,
            body: '',
            isStream: true,
        };

        context.callbackWaitsForEmptyEventLoop = false;

        // Send initial data immediately
        responseStream.body += `data: ${JSON.stringify(orders)}\n\n`;

        const stream = {
            write: (data) => {
                responseStream.body += data;
            },
            end: () => {
                responseStream.body += ': stream ended\n\n';
            }
        };

        orderEmitter.on('orderUpdate', (updatedOrders) => {
            stream.write(`data: ${JSON.stringify(updatedOrders)}\n\n`);
        });

        const keepAlive = setInterval(() => {
            stream.write(': keep-alive\n\n');
        }, 3000); // Increased frequency for better real-time

        context.on('close', () => {
            clearInterval(keepAlive);
            stream.end();
        });

        return responseStream;
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
    };
};
