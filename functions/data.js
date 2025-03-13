const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], orders: [] }));
        }
        const rawData = fs.readFileSync(DATA_FILE);
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Error reading data:', error);
        return { users: [], orders: [] };
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data:', error);
        throw new Error('Failed to save data');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'ခွင့်မပြုသော တောင်းဆိုမှု။ POST သာသုံးပါၡ' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { action } = body;
        let data = readData();

        switch (action) {
            case 'signup': {
                const { email, password, deviceId, anonymousId } = body;
                if (!email || !password || !deviceId || !anonymousId) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'အားလုံးဖြည့်ရန် လိုအပ်ပါသည်ၡ' }) };
                }
                if (!isValidEmail(email)) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'အီးမေးလ် ပုံစံမမှန်ပါၡ' }) };
                }
                if (data.users.find(u => u.email === email)) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'ဤအီးမေးလ် ရှိပြီးပါပြီၡ အကောင့်သစ်ဖွင့်၍ မရပါၡ' }) };
                }

                const user = { email, password, deviceId, anonymousId, createdAt: Date.now() };
                data.users.push(user);
                writeData(data);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'အကောင့်ဖွင့်ပြီးပါပြီၡ', user: { email, anonymousId } })
                };
            }

            case 'login': {
                const { email, password, deviceId } = body;
                if (!email || !password || !deviceId) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'အားလုံးဖြည့်ရန် လိုအပ်ပါသည်ၡ' }) };
                }
                if (!isValidEmail(email)) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'အီးမေးလ် ပုံစံမမှန်ပါၡ' }) };
                }

                const user = data.users.find(u => u.email === email && u.password === password);
                if (!user) {
                    return { statusCode: 401, body: JSON.stringify({ error: 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ပါၡ' }) };
                }

                user.deviceId = deviceId;
                user.lastLogin = Date.now();
                writeData(data);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, anonymousId: user.anonymousId, message: 'အကောင့်ဝင်ပြီးပါပြီၡ' })
                };
            }

            case 'submitOrder': {
                const { order } = body;
                const requiredFields = ['email', 'deviceId', 'anonymousId', 'months', 'quantity', 'total', 
                    'transactionLast6', 'telegramUsername', 'paymentMethod'];
                
                if (!order || requiredFields.some(field => !order[field])) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'အော်ဒါအတွက် အားလုံးဖြည့်ပါၡ' }) };
                }
                if (!isValidEmail(order.email)) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'အီးမေးလ် ပုံစံမမှန်ပါၡ' }) };
                }
                if (!data.users.find(u => u.email === order.email && u.deviceId === order.deviceId)) {
                    return { statusCode: 403, body: JSON.stringify({ error: 'ခွင့်မပြုထားသော အသုံးပြုသူပါၡ' }) };
                }

                const newOrder = {
                    ...order,
                    id: Date.now().toString(),
                    status: 'Approved',
                    timestamp: Date.now()
                };
                data.orders.push(newOrder);
                writeData(data);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, orderId: newOrder.id, message: 'အော်ဒါတင်ပြီးပါပြီၡ', order: newOrder })
                };
            }

            case 'getOrders': {
                const { email } = body;
                if (!email || !isValidEmail(email)) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'မှန်ကန်သော အီးမေးလ် လိုအပ်ပါသည်ၡ' }) };
                }

                const userOrders = data.orders.filter(order => order.email === email);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, orders: userOrders })
                };
            }

            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'မမှန်ကန်သော လုပ်ဆောင်ချက်ၡ' }) };
        }
    } catch (error) {
        console.error('ဆာဗာ အမှား:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `ဆာဗာအတွင်းပိုင်း အမှားၡ ${error.message}` }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
