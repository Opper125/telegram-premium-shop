const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    if (event.httpMethod === 'POST') {
        const newOrder = JSON.parse(event.body);
        let orders = [];
        const filePath = path.join(__dirname, 'orders.json');
        if (fs.existsSync(filePath)) {
            orders = JSON.parse(fs.readFileSync(filePath));
        }
        orders.push(newOrder);
        fs.writeFileSync(filePath, JSON.stringify(orders, null, 2));
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
