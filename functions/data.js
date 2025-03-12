const fetch = require('node-fetch');

const GITHUB_TOKEN = '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'; // Replace with your GitHub Personal Access Token
const REPO = 'Opper125/telegram-premium-shop'; // Replace with your GitHub repo
const DATA_PATH = 'data.json';

async function getDataFromGitHub() {
    const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (!response.ok) {
        if (response.status === 404) {
            return { users: [], orders: [] }; // Return empty data if file doesn't exist
        }
        throw new Error('Failed to fetch data from GitHub');
    }
    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return JSON.parse(content);
}

async function updateDataToGitHub(newData) {
    const currentDataResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    let sha;
    if (currentDataResponse.ok) {
        const currentData = await currentDataResponse.json();
        sha = currentData.sha;
    }

    const content = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');
    const updateResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: 'Update data.json with new user/order data',
            content,
            sha: sha || undefined,
            branch: 'main'
        })
    });

    if (!updateResponse.ok) {
        throw new Error('Failed to update data to GitHub');
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
        let data = await getDataFromGitHub();

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
                await updateDataToGitHub(data);
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
                await updateDataToGitHub(data);
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
                await updateDataToGitHub(data);
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
        console.error('ဆာဗာ အမှား:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'ဆာဗာအတွင်းပိုင်း အမှားၡ နောက်မှ ထပ်ကြိုးစားပါၡ' })
        };
    }
};
