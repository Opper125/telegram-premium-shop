const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], orders: [] }));
}

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const body = JSON.parse(event.body);
    const { action } = body;
    let data = readData();

    if (action === 'signup') {
        const { email, password, deviceId } = body;
        if (data.users.find(u => u.email === email)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'အီးမေးလ် ရှိပြီးသားဖြစ်ပါတယ်။' }) };
        }
        data.users.push({ email, password, deviceId });
        writeData(data);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'login') {
        const { email, password, deviceId } = body;
        const user = data.users.find(u => u.email === email && u.password === password);
        if (!user) {
            return { statusCode: 400, body: JSON.stringify({ error: 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ပါ။' }) };
        }
        if (user.deviceId !== deviceId) {
            user.deviceId = deviceId; // Update deviceId if changed
            writeData(data);
        }
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'submitOrder') {
        const { order } = body;
        order.id = Date.now().toString();
        order.status = 'Approved';
        data.orders.push(order);
        writeData(data);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'getOrders') {
        const { email } = body;
        const userOrders = data.orders.filter(order => order.email === email);
        return { statusCode: 200, body: JSON.stringify({ orders: userOrders }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
};
