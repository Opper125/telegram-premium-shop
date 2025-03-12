const { getStore } = require('@netlify/blobs');

// Helper function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Initialize Netlify Blobs store
async function getDataStore() {
    return getStore('telegram-premium-shop-data');
}

// Load data from Netlify Blobs
async function loadData() {
    const store = await getDataStore();
    try {
        const data = await store.get('data', { type: 'json' });
        if (!data || !data.users || !data.orders) {
            console.warn('No valid data found, initializing new store.');
            return { users: [], orders: [] };
        }
        return data;
    } catch (error) {
        console.error('Error loading data from Netlify Blobs:', error);
        throw new Error('Failed to load data. Please try again later.');
    }
}

// Save data to Netlify Blobs
async function saveData(data) {
    const store = await getDataStore();
    try {
        await store.set('data', JSON.stringify(data), { type: 'json' });
    } catch (error) {
        console.error('Error saving data to Netlify Blobs:', error);
        throw new Error('Failed to save data');
    }
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed. Use POST request only.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    try {
        const data = await loadData();
        const body = JSON.parse(event.body);
        const { action } = body;

        switch (action) {
            case 'signup': {
                const { email, password, deviceId, anonymousId } = body;
                if (!email || !password || !deviceId || !anonymousId) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'All fields (email, password, deviceId, anonymousId) are required.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (!isValidEmail(email)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Invalid email format.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (data.users.find(u => u.email === email)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Email already exists.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (data.users.find(u => u.deviceId === deviceId)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Device already registered.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                data.users.push({ email, password, deviceId, anonymousId });
                await saveData(data);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'User registered successfully.' }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            case 'login': {
                const { email, password, deviceId } = body;
                if (!email || !password || !deviceId) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'All fields (email, password, deviceId) are required.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (!isValidEmail(email)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Invalid email format.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const user = data.users.find(u => u.email === email && u.password === password);
                if (!user) {
                    return {
                        statusCode: 401,
                        body: JSON.stringify({ error: 'Invalid email or password.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                if (user.deviceId !== deviceId) {
                    user.deviceId = deviceId;
                    await saveData(data);
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, anonymousId: user.anonymousId, message: 'Login successful.' }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            case 'submitOrder': {
                const { order } = body;
                if (!order || !order.email || !order.deviceId || !order.anonymousId || !order.months || !order.quantity || !order.total || !order.transactionLast6 || !order.telegramUsername || !order.paymentMethod) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'All order fields are required.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (!isValidEmail(order.email)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Invalid email format in order.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (!data.users.find(u => u.email === order.email && u.deviceId === order.deviceId)) {
                    return {
                        statusCode: 403,
                        body: JSON.stringify({ error: 'Unauthorized user.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const newOrder = {
                    ...order,
                    id: Date.now().toString(),
                    status: 'Approved',
                    timestamp: Date.now()
                };
                data.orders.push(newOrder);
                await saveData(data);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, orderId: newOrder.id, message: 'Order submitted successfully.' }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            case 'getOrders': {
                const { email } = body;
                if (!email) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Email is required.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (!isValidEmail(email)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Invalid email format.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const userOrders = data.orders.filter(order => order.email === email);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, orders: userOrders }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            default: {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid action.' }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }
        }
    } catch (error) {
        console.error('Server Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error. Please try again later.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
