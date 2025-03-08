async function sendOrderNotification(order) {
    await twilioClient.messages.create({
        body: `New Order: ${JSON.stringify(order)}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+959983254678' // သင့် Phone Number
    });
}

// POST request အတွက်
if (event.httpMethod === 'POST' && event.path === '/.netlify/functions/data') {
    let order;
    try {
        order = JSON.parse(event.body);
        validateOrder(order);
        order.id = orderIdCounter++;
        orders.push(order);
        logAction('Order Submitted', order);
        orderEmitter.emit('orderUpdate', orders);
        await sendOrderNotification(order);
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
