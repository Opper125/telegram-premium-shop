const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    const orders = fs.existsSync(path.join(__dirname, 'orders.json'))
        ? JSON.parse(fs.readFileSync(path.join(__dirname, 'orders.json')))
        : [];
    return {
        statusCode: 200,
        body: JSON.stringify(orders)
    };
};
