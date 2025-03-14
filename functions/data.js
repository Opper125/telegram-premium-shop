// In-Memory Storage
let data = { users: [], orders: [] };

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

exports.handler = async (event, context) => {
    // CORS Headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight response' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'ခွင့်မပြုသော တောင်းဆိုမှု။ POST သာသုံးပါၡ' }),
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action } = body;

        if (!action) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'လုပ်ဆောင်ချက် (action) သတ်မှတ်ပါၡ' }),
            };
        }

        switch (action) {
            case 'signup': {
                const { email, password, deviceId, anonymousId } = body;
                if (!email || !password || !deviceId || !anonymousId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'အားလုံးဖြည့်ရန် လိုအပ်ပါသည်ၡ (email, password, deviceId, anonymousId)' }),
                    };
                }
                if (!isValidEmail(email)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'အီးမေးလ် ပုံစံမမှန်ပါၡ' }),
                    };
                }
                if (data.users.find(u => u.email === email)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'ဤအီးမေးလ် ရှိပြီးပါပြီၡ အသစ်တစ်ခုဖြင့် ပြန်ကြိုးစားပါၡ' }),
                    };
                }

                const user = { email, password, deviceId, anonymousId, createdAt: Date.now() };
                data.users.push(user);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'အကောင့်ဖွင့်ပြီးပါပြီၡ', user: { email, anonymousId } }),
                };
            }

            case 'login': {
                const { email, password, deviceId } = body;
                if (!email || !password || !deviceId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'အားလုံးဖြည့်ရန် လိုအပ်ပါသည်ၡ (email, password, deviceId)' }),
                    };
                }
                if (!isValidEmail(email)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'အီးမေးလ် ပုံစံမမှန်ပါၡ' }),
                    };
                }

                const user = data.users.find(u => u.email === email && u.password === password);
                if (!user) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ပါၡ' }),
                    };
                }

                user.deviceId = deviceId;
                user.lastLogin = Date.now();
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, anonymousId: user.anonymousId, message: 'အကောင့်ဝင်ပြီးပါပြီၡ' }),
                };
            }

            case 'submitOrder': {
                const { order } = body;
                const requiredFields = ['email', 'deviceId', 'anonymousId', 'months', 'quantity', 'total', 
                    'transactionLast6', 'telegramUsername', 'paymentMethod'];
                
                if (!order || requiredFields.some(field => !order[field])) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'အော်ဒါအတွက် အားလုံးဖြည့်ပါၡ' }),
                    };
                }
                if (!isValidEmail(order.email)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'အီးမေးလ် ပုံစံမမှန်ပါၡ' }),
                    };
                }
                if (!data.users.find(u => u.email === order.email && u.deviceId === order.deviceId)) {
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({ error: 'ခွင့်မပြုထားသော အသုံးပြုသူပါၡ' }),
                    };
                }

                const newOrder = {
                    ...order,
                    id: Date.now().toString(),
                    status: 'Approved',
                    timestamp: Date.now()
                };
                data.orders.push(newOrder);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, orderId: newOrder.id, message: 'အော်ဒါတင်ပြီးပါပြီၡ', order: newOrder }),
                };
            }

            case 'getOrders': {
                const { email } = body;
                if (!email || !isValidEmail(email)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'မှန်ကန်သော အီးမေးလ် လိုအပ်ပါသည်ၡ' }),
                    };
                }

                const userOrders = data.orders.filter(order => order.email === email);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, orders: userOrders }),
                };
            }

            case 'getAllOrders': {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, orders: data.orders }),
                };
            }

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'မမှန်ကန်သော လုပ်ဆောင်ချက်ၡ' }),
                };
        }
    } catch (error) {
        console.error('ဆာဗာ အမှား:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `ဆာဗာအတွင်းပိုင်း အမှားၡ ${error.message}` }),
        };
    }
};
