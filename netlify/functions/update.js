let clients = [];

exports.handler = async (event, context) => {
    if (event.httpMethod === 'GET') {
        const headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        };
        const clientId = Date.now();
        const newClient = {
            id: clientId,
            response: context.clientContext
        };
        clients.push(newClient);

        context.callbackWaitsForEmptyEventLoop = false;

        return {
            statusCode: 200,
            headers,
            body: ''
        };
    } else if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);
        clients.forEach(client => {
            client.response.write(`data: ${JSON.stringify(data)}\n\n`);
        });
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Update sent' })
        };
    }
    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};
