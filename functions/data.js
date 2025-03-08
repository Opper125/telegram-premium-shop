// In-memory storage for orders and users
let orders = [];
let users = [];
let orderIdCounter = 1;

// Event emitters for real-time updates
const EventEmitter = require('events');
const orderEmitter = new EventEmitter();
const userEmitter = new EventEmitter();

// Log storage
const logs = [];

function logAction(action, details) {
    const logEntry = `${new Date().toISOString()} - ${action}: ${JSON.stringify(details)}`;
    logs.push(logEntry);
    console.log(logEntry);
}

function validateOrder(order) {
    const duplicate = orders.find(o => o.transactionId === order.transactionId && o.status !== 'approved' && o.status !== 'rejected');
    if (duplicate) {
        throw new Error('Duplicate Transaction ID detected!');
    }
    return true;
}

exports.handler = async (event, context) => {
    // Handle Orders
    if (event.path === '/.netlify/functions/data') {
        // Handle POST request to save a new order
        if (event.httpMethod === 'POST') {
            let order;
            try {
                order = JSON.parse(event.body);
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
    }

    // Handle Users
    else if (event.path === '/.netlify/functions/users') {
        // Handle POST request to save a new user
        if (event.httpMethod === 'POST') {
            const user = JSON.parse(event.body);
            users.push(user);
            logAction('User Registered', user);
            userEmitter.emit('userUpdate', users);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'User saved successfully' }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        }

        // Handle GET request to fetch all users
        else if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                body: JSON.stringify(users),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        }

        // Handle DELETE request to clear all users
        else if (event.httpMethod === 'DELETE') {
            users = [];
            logAction('Users Cleared', {});
            userEmitter.emit('userUpdate', users);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Users cleared successfully' }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        }
    }

    // Handle Server-Sent Events for Orders
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
        }, 3000);

        context.on('close', () => {
            clearInterval(keepAlive);
            stream.end();
        });

        return responseStream;
    }

    // Handle Server-Sent Events for Users
    else if (event.path === '/.netlify/functions/users-stream') {
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

        responseStream.body += `data: ${JSON.stringify(users)}\n\n`;

        const stream = {
            write: (data) => {
                responseStream.body += data;
            },
            end: () => {
                responseStream.body += ': stream ended\n\n';
            }
        };

        userEmitter.on('userUpdate', (updatedUsers) => {
            stream.write(`data: ${JSON.stringify(updatedUsers)}\n\n`);
        });

        const keepAlive = setInterval(() => {
            stream.write(': keep-alive\n\n');
        }, 3000);

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
