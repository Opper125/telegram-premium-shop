// In-Memory Data Store (Resets on server restart)
let inMemoryData = {
    users: [],
    orders: []
};

// Helper function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Export the handler function for Netlify Functions
exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed. Use POST request only.' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    try {
        // Parse the request body
        const body = JSON.parse(event.body);
        const { action } = body;

        // Handle different actions
        switch (action) {
            case 'signup': {
                const { email, password, deviceId, anonymousId } = body;

                // Input validation
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
                if (inMemoryData.users.find(u => u.email === email)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Email already exists.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                if (inMemoryData.users.find(u => u.deviceId === deviceId)) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Device already registered.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                // Add new user
                inMemoryData.users.push({ email, password, deviceId, anonymousId });
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'User registered successfully.' }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            case 'login': {
                const { email, password, deviceId } = body;

                // Input validation
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

                // Find user
                const user = inMemoryData.users.find(u => u.email === email && u.password === password);
                if (!user) {
                    return {
                        statusCode: 401,
                        body: JSON.stringify({ error: 'Invalid email or password.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                // Update deviceId if changed
                if (user.deviceId !== deviceId) {
                    user.deviceId = deviceId;
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, anonymousId: user.anonymousId, message: 'Login successful.' }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            case 'submitOrder': {
                const { order } = body;

                // Input validation
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
                if (!inMemoryData.users.find(u => u.email === order.email && u.deviceId === order.deviceId)) {
                    return {
                        statusCode: 403,
                        body: JSON.stringify({ error: 'Unauthorized user.' }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                // Add order with timestamp
                const newOrder = {
                    ...order,
                    id: Date.now().toString(),
                    status: 'Approved',
                    timestamp: Date.now()
                };
                inMemoryData.orders.push(newOrder);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, orderId: newOrder.id, message: 'Order submitted successfully.' }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            case 'getOrders': {
                const { email } = body;

                // Input validation
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

                // Fetch orders for the user
                const userOrders = inMemoryData.orders.filter(order => order.email === email);
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
