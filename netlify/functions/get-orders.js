const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    const filePath = path.join(__dirname, 'orders.json');
    const orders = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath))
        : [];
    return {
        statusCode: 200,
        body: JSON.stringify(orders)
    };
};
