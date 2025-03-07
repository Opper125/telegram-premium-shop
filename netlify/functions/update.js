exports.handler = (event, context) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    };
    return {
        statusCode: 200,
        headers,
        body: `data: ${JSON.stringify({ username: 'test', status: 'pending' })}\n\n`
    };
};
