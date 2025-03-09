const twilio = require('twilio');
const client = new twilio('AC4720631d03928cddbccee6426be06eeb', '98ad5504086f4bd34373a91950d67dc3');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
    const { phoneNumber } = JSON.parse(event.body);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await client.messages.create({
            body: `Your verification code is ${code}`,
            from: '+959983254678',
            to: phoneNumber
        });
        return { statusCode: 200, body: JSON.stringify({ code }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send SMS' }) };
    }
};
