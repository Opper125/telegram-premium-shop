const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    if (event.httpMethod === 'POST') {
        const orders = JSON.parse(event.body || '[]');
        fs.writeFileSync(path.join(__dirname, 'orders.json'), JSON.stringify(orders, null, 2));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order saved' })
        };
    }
    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};
