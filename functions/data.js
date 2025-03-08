const EventEmitter = require('events');
const orderEmitter = new EventEmitter();
const userEmitter = new EventEmitter();
const postEmitter = new EventEmitter();

const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = new twilio(accountSid, authToken);

let orders = [];
let users = [];
let posts = [];
let orderIdCounter = 1;
let logs = [];

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

function resetData() {
    orders = [];
    users = [];
    posts = [];
    orderIdCounter = 1;
    logAction('Data Reset', {});
}

async function sendVerificationCode(phoneNumber) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await twilioClient.messages.create({
        body: `Your verification code is ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
    });
    return code;
}

exports.handler = async (event, context) => {
    if (event.path === '/.netlify/functions/data' && event.httpMethod === 'GET' && event.queryStringParameters?.reset === 'true') {
        resetData();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data reset successfully' }),
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        };
    }

    if (event.path === '/.netlify/functions/data') {
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
        } else if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                body: JSON.stringify(orders),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        } else if (event.httpMethod === 'PUT') {
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
        } else if (event.httpMethod === 'DELETE') {
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

    if (event.path === '/.netlify/functions/users') {
        if (event.httpMethod === 'POST') {
            const { userId, phoneNumber, password, verificationCode } = JSON.parse(event.body);
            const storedCode = await sendVerificationCode(phoneNumber);
            if (verificationCode !== storedCode) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid verification code' }),
                };
            }
            const existingUser = users.find(user => user.phoneNumber === phoneNumber);
            if (existingUser) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Phone number already registered' }),
                };
            }
            users.push({ userId, phoneNumber, password });
            logAction('User Registered', { userId, phoneNumber });
            userEmitter.emit('userUpdate', users);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'User saved successfully', userId }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        } else if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                body: JSON.stringify(users),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        } else if (event.httpMethod === 'DELETE') {
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

    if (event.path === '/.netlify/functions/users/update') {
        if (event.httpMethod === 'POST') {
            logAction('Server Updated', {});
            users.forEach(user => {
                localStorage.setItem(`user_${user.userId}`, JSON.stringify(user));
            });
            userEmitter.emit('userUpdate', users);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Server updated, user accounts preserved' }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        }
    }

    if (event.path === '/.netlify/functions/posts') {
        if (event.httpMethod === 'POST') {
            const post = JSON.parse(event.body);
            posts.push(post);
            logAction('Post Submitted', post);
            postEmitter.emit('postUpdate', posts);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Post saved successfully' }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        } else if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                body: JSON.stringify(posts),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        } else if (event.httpMethod === 'DELETE') {
            posts = [];
            logAction('Posts Cleared', {});
            postEmitter.emit('postUpdate', posts);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Posts cleared successfully' }),
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
            };
        }
    }

    if (event.path === '/.netlify/functions/data-stream') {
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
            write: (data) => { responseStream.body += data; },
            end: () => { responseStream.body += ': stream ended\n\n'; }
        };
        orderEmitter.on('orderUpdate', (updatedOrders) => {
            stream.write(`data: ${JSON.stringify(updatedOrders)}\n\n`);
        });
        const keepAlive = setInterval(() => stream.write(': keep-alive\n\n'), 3000);
        context.on('close', () => {
            clearInterval(keepAlive);
            stream.end();
        });
        return responseStream;
    }

    if (event.path === '/.netlify/functions/users-stream') {
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
            write: (data) => { responseStream.body += data; },
            end: () => { responseStream.body += ': stream ended\n\n'; }
        };
        userEmitter.on('userUpdate', (updatedUsers) => {
            stream.write(`data: ${JSON.stringify(updatedUsers)}\n\n`);
        });
        const keepAlive = setInterval(() => stream.write(': keep-alive\n\n'), 3000);
        context.on('close', () => {
            clearInterval(keepAlive);
            stream.end();
        });
        return responseStream;
    }

    if (event.path === '/.netlify/functions/posts-stream') {
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
        responseStream.body += `data: ${JSON.stringify(posts)}\n\n`;
        const stream = {
            write: (data) => { responseStream.body += data; },
            end: () => { responseStream.body += ': stream ended\n\n'; }
        };
        postEmitter.on('postUpdate', (updatedPosts) => {
            stream.write(`data: ${JSON.stringify(updatedPosts)}\n\n`);
        });
        const keepAlive = setInterval(() => stream.write(': keep-alive\n\n'), 3000);
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
