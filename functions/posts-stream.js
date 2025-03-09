const EventEmitter = require('events');
const postEmitter = new EventEmitter();
let posts = [];

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    };

    // Set context to not wait for an empty event loop
    context.callbackWaitsForEmptyEventLoop = false;

    // Create a readable stream for SSE
    const stream = new (require('stream').Readable)({
        read() {}
    });

    // Initial data push
    stream.push(`data: ${JSON.stringify(posts)}\n\n`);

    // Listen for post updates and push to the stream
    postEmitter.on('postUpdate', (updatedPosts) => {
        stream.push(`data: ${JSON.stringify(updatedPosts)}\n\n`);
    });

    // Keep the connection alive with a heartbeat
    const keepAlive = setInterval(() => {
        stream.push(': keep-alive\n\n');
    }, 3000);

    // Handle client disconnect
    event.rawReq.on('close', () => {
        clearInterval(keepAlive);
        stream.push(null); // End the stream
    });

    return {
        statusCode: 200,
        headers,
        body: stream,
        isBase64Encoded: false
    };
};
